"""
METRA — app/engine/calculator.py
Calculation engine that executes OIML calculation rules against test observations and context.
"""

from typing import Dict, Any, List, Optional
from app.engine.models import EvaluationContext, CalculationResult, MPEResult
from app.engine.formula_parser import evaluate_expression
from app.engine.rule_loader import get_rule_loader
from app.engine.mpe_engine import MPEEngine


def extract_row_array(observations: Dict[str, Any]) -> Optional[List[Any]]:
    """
    Checks observations dictionary for array of row elements (dicts or values).
    Returns the array if found, otherwise None.
    """
    array_keys = [
        "steps", "rows", "load_steps", "test_load_steps",
        "net_test_steps", "positions", "test_points"
    ]
    for key in array_keys:
        val = observations.get(key)
        if isinstance(val, list) and len(val) > 0:
            return val
    return None


def extract_repeatability_load_sets(observations: Dict[str, Any], context: EvaluationContext) -> List[Dict[str, Any]]:
    """
    Parses observation payload for repeatability tests into independent load sets.
    Supports single-set and multi-set payloads, as well as single-interval and multi-interval instruments.
    Returns a list of dicts containing set_index, test_load, readings, mpe_result, and active_e.
    """
    if not isinstance(observations, dict):
        return []

    from app.engine.mpe_engine import MPEEngine
    mpe_engine = MPEEngine()

    def resolve_reading_val(item: Any, active_e: float) -> Optional[float]:
        if isinstance(item, dict):
            ind = item.get("I") if item.get("I") is not None else (
                item.get("indication") if item.get("indication") is not None else (
                    item.get("val") if item.get("val") is not None else (
                        item.get("value") if item.get("value") is not None else (
                            item.get("reading")
                        )
                    )
                )
            )
            if ind is not None and str(ind).strip() != "":
                try:
                    I_val = float(ind)
                    dL_raw = item.get("dL")
                    if dL_raw is not None and str(dL_raw).strip() != "":
                        dL_val = float(dL_raw)
                        return I_val + (0.5 * active_e if dL_val > 0 else 0.0) - dL_val
                    return I_val
                except (ValueError, TypeError):
                    return None
        elif item is not None and str(item).strip() != "":
            try:
                return float(item)
            except (ValueError, TypeError):
                return None
        return None

    load_groups: List[Dict[str, Any]] = []

    # 1. Check for explicit load sets array (load_sets, repeatability_sets, sets, groups, test_loads)
    set_array_keys = ["load_sets", "repeatability_sets", "sets", "groups", "test_loads"]
    explicit_sets = None
    for key in set_array_keys:
        val = observations.get(key)
        if isinstance(val, list) and len(val) > 0:
            explicit_sets = val
            break

    if explicit_sets:
        for idx, s in enumerate(explicit_sets):
            if isinstance(s, dict):
                load_val = float(s.get("test_load") if s.get("test_load") is not None else (
                    s.get("load") if s.get("load") is not None else (
                        s.get("L") if s.get("L") is not None else (context.max_capacity * 0.5)
                    )
                ))
                mpe_res = mpe_engine.calculate_mpe(
                    accuracy_class=context.accuracy_class,
                    load=load_val,
                    e_resolution=context.e_resolution,
                    unit=context.unit,
                    verification_type=context.verification_type,
                    intervals=context.weighing_intervals
                )
                active_e = mpe_res.source.get("active_e", context.e_resolution) if mpe_res.source else context.e_resolution
                raw_readings = s.get("readings") or s.get("indications") or s.get("rows") or s.get("repeatability_readings") or []
                nums = []
                for r in raw_readings:
                    rv = resolve_reading_val(r, active_e)
                    if rv is not None:
                        nums.append(rv)
                if nums:
                    load_groups.append({
                        "set_index": idx + 1,
                        "test_load": load_val,
                        "readings": nums,
                        "mpe_result": mpe_res,
                        "active_e": active_e
                    })

    # 2. Check for flat list of dicts with distinct test_load / load values
    if not load_groups:
        readings_list = observations.get("readings") or observations.get("repeatability_readings") or observations.get("indications") or observations.get("rows") or observations.get("steps")
        if isinstance(readings_list, list) and len(readings_list) > 0 and isinstance(readings_list[0], dict):
            dict_groups: Dict[float, List[Any]] = {}
            for item in readings_list:
                if isinstance(item, dict):
                    l_val = item.get("test_load") if item.get("test_load") is not None else (
                        item.get("load") if item.get("load") is not None else item.get("L")
                    )
                    if l_val is not None:
                        try:
                            l_float = float(l_val)
                            dict_groups.setdefault(l_float, []).append(item)
                        except (ValueError, TypeError):
                            pass

            if dict_groups:
                for idx, (load_val, items) in enumerate(dict_groups.items()):
                    mpe_res = mpe_engine.calculate_mpe(
                        accuracy_class=context.accuracy_class,
                        load=load_val,
                        e_resolution=context.e_resolution,
                        unit=context.unit,
                        verification_type=context.verification_type,
                        intervals=context.weighing_intervals
                    )
                    active_e = mpe_res.source.get("active_e", context.e_resolution) if mpe_res.source else context.e_resolution
                    nums = []
                    for r in items:
                        rv = resolve_reading_val(r, active_e)
                        if rv is not None:
                            nums.append(rv)
                    if nums:
                        load_groups.append({
                            "set_index": idx + 1,
                            "test_load": load_val,
                            "readings": nums,
                            "mpe_result": mpe_res,
                            "active_e": active_e
                        })

    # 3. Fallback: single top-level load set
    if not load_groups:
        top_load = float(observations.get("test_load") if observations.get("test_load") is not None else (
            observations.get("load") if observations.get("load") is not None else (
                observations.get("L") if observations.get("L") is not None else (context.max_capacity * 0.5)
            )
        ))
        mpe_res = mpe_engine.calculate_mpe(
            accuracy_class=context.accuracy_class,
            load=top_load,
            e_resolution=context.e_resolution,
            unit=context.unit,
            verification_type=context.verification_type,
            intervals=context.weighing_intervals
        )
        active_e = mpe_res.source.get("active_e", context.e_resolution) if mpe_res.source else context.e_resolution
        raw_readings = observations.get("readings") or observations.get("repeatability_readings") or observations.get("indications") or []
        nums = []
        if isinstance(raw_readings, list):
            for r in raw_readings:
                rv = resolve_reading_val(r, active_e)
                if rv is not None:
                    nums.append(rv)
        if nums:
            load_groups.append({
                "set_index": 1,
                "test_load": top_load,
                "readings": nums,
                "mpe_result": mpe_res,
                "active_e": active_e
            })

    return load_groups


def extract_tilting_positions(observations: Dict[str, Any], context: EvaluationContext) -> List[Dict[str, Any]]:
    """
    Parses observation payload for Tilting Test (TEST-A.4.11.1) into structured position items.
    Checks 'positions', 'tilt_positions', 'rows', or 'steps'.
    Computes unrounded indication P_v, zero-corrected indication P_v_0, corrected error Ec, and resolves MPE limit.
    """
    if not isinstance(observations, dict):
        return []

    raw_positions = observations.get("positions") or observations.get("tilt_positions") or observations.get("rows") or observations.get("steps")
    if not isinstance(raw_positions, list) or len(raw_positions) == 0:
        return []

    from app.engine.mpe_engine import MPEEngine
    mpe_engine = MPEEngine()

    parsed = []
    first_level_P0 = None
    E0_input = observations.get("E0")

    for idx, pos in enumerate(raw_positions):
        if not isinstance(pos, dict):
            continue
        label = str(pos.get("position_label") or pos.get("label") or pos.get("name") or f"Position {idx + 1}")
        tilt_angle = float(pos.get("tilt_angle") if pos.get("tilt_angle") is not None else (pos.get("angle") if pos.get("angle") is not None else 0.0))
        L_val = float(pos.get("L") if pos.get("L") is not None else (pos.get("load") if pos.get("load") is not None else (pos.get("applied_load") if pos.get("applied_load") is not None else 0.0)))
        I_val = float(pos.get("I") if pos.get("I") is not None else (pos.get("indication") if pos.get("indication") is not None else (pos.get("I_net") if pos.get("I_net") is not None else (pos.get("indicated_value") if pos.get("indicated_value") is not None else 0.0))))
        dL_val = float(pos.get("dL") if pos.get("dL") is not None else 0.0)

        mpe_res = mpe_engine.calculate_mpe(
            accuracy_class=context.accuracy_class,
            load=L_val,
            e_resolution=context.e_resolution,
            unit=context.unit,
            verification_type=context.verification_type,
            intervals=context.weighing_intervals
        )
        active_e = mpe_res.source.get("active_e", context.e_resolution) if mpe_res.source else context.e_resolution

        # P_v = I + 0.5*e - dL (if dL > 0)
        P_v = I_val + (0.5 * active_e if dL_val > 0 else 0.0) - dL_val

        if first_level_P0 is None and (L_val == 0 or "level" in label.lower() or idx == 0):
            first_level_P0 = P_v - L_val

        parsed.append({
            "step_index": idx + 1,
            "position_label": label,
            "tilt_angle": tilt_angle,
            "L": L_val,
            "I": I_val,
            "dL": dL_val,
            "P_v": P_v,
            "active_e": active_e,
            "mpe_result": mpe_res
        })

    if E0_input is not None:
        try:
            E0 = float(E0_input)
        except (ValueError, TypeError):
            E0 = first_level_P0 if first_level_P0 is not None else 0.0
    else:
        E0 = first_level_P0 if first_level_P0 is not None else 0.0

    for p in parsed:
        P_v = p["P_v"]
        L_val = p["L"]
        mpe_res = p["mpe_result"]

        P_v_0 = P_v - E0
        Ec = P_v_0 - L_val
        pass_fail = "PASS" if abs(Ec) <= abs(mpe_res.mpe_value) else "FAIL"

        p["E0"] = E0
        p["P_v_0"] = P_v_0
        p["Ec"] = Ec
        p["result"] = pass_fail

    return parsed


def extract_zero_return_steps(observations: Dict[str, Any], context: EvaluationContext) -> Dict[str, Any]:
    """
    Parses observation payload for Zero Return Test (TEST-A.4.11.2).
    Extracts step-wise indications P = I + 0.5*e - dL, computes delta_P = |P_end - P_start|,
    and checks against allowed limit = 0.5 * e1.
    """
    if not isinstance(observations, dict):
        return {}

    from app.engine.mpe_engine import MPEEngine
    mpe_engine = MPEEngine()

    e1 = context.e1_resolution if (context.e1_resolution is not None and context.e1_resolution > 0) else context.e_resolution
    if not e1 or e1 <= 0:
        e1 = 0.001
    allowed_limit = abs(0.5 * float(e1))

    # Check for steps array
    raw_steps = observations.get("steps") or observations.get("rows") or observations.get("load_steps") or observations.get("zero_steps") or observations.get("readings")

    step_results = []
    P_start = None
    P_end = None

    if isinstance(raw_steps, list) and len(raw_steps) > 0:
        zero_steps = []
        for idx, step in enumerate(raw_steps):
            if isinstance(step, dict):
                L_val = float(step.get("L") if step.get("L") is not None else (step.get("load") if step.get("load") is not None else 0.0))
                I_val = float(step.get("I") if step.get("I") is not None else (step.get("indication") if step.get("indication") is not None else (step.get("I_net") if step.get("I_net") is not None else 0.0)))
                dL_val = float(step.get("dL") if step.get("dL") is not None else 0.0)

                active_e = e1 if L_val == 0 else (mpe_engine._resolve_e_for_load(L_val, context) if hasattr(mpe_engine, '_resolve_e_for_load') else context.e_resolution)

                # Formula: P = I + 0.5 * e - dL (if dL > 0)
                P_val = I_val + (0.5 * active_e if dL_val > 0 else 0.0) - dL_val

                step_info = {
                    "step_index": idx + 1,
                    "L": L_val,
                    "I": I_val,
                    "dL": dL_val,
                    "active_e": active_e,
                    "P": P_val,
                    "note": step.get("note", "")
                }
                step_results.append(step_info)

                if L_val == 0 or "start" in str(step.get("note", "")).lower() or "zero" in str(step.get("note", "")).lower() or "return" in str(step.get("note", "")).lower():
                    zero_steps.append(step_info)

        if len(zero_steps) >= 2:
            P_start = zero_steps[0]["P"]
            P_end = zero_steps[-1]["P"]
        elif len(zero_steps) == 1:
            P_start = 0.0
            P_end = zero_steps[0]["P"]
        elif len(step_results) >= 2:
            P_start = step_results[0]["P"]
            P_end = step_results[-1]["P"]
        elif len(step_results) == 1:
            P_start = 0.0
            P_end = step_results[0]["P"]

    # Scalar fallback if no step array
    if P_start is None:
        if "P_start" in observations and "P_end" in observations:
            P_start = float(observations["P_start"])
            P_end = float(observations["P_end"])
        elif "zero_deviation" in observations:
            P_start = 0.0
            P_end = float(observations["zero_deviation"])
        elif "I_end" in observations:
            I_end = float(observations["I_end"])
            dL_end = float(observations.get("dL_end", 0.0))
            P_end = I_end + (0.5 * e1 if dL_end > 0 else 0.0) - dL_end
            P_start = float(observations.get("P_start", 0.0))
        else:
            P_start = 0.0
            P_end = 0.0

    delta_P = abs(float(P_end) - float(P_start))
    pass_fail = "PASS" if (round(delta_P, 8) - round(allowed_limit, 8)) <= 1e-9 else "FAIL"

    return {
        "steps": step_results,
        "P_start": P_start,
        "P_end": P_end,
        "delta_P": round(delta_P, 6),
        "allowed_limit": round(allowed_limit, 6),
        "e1": e1,
        "result": pass_fail
    }


def extract_stability_readings(observations: Dict[str, Any], context: EvaluationContext) -> Dict[str, Any]:
    """
    Parses observation payload for Stability of Equilibrium Test (TEST-A.4.12 / OIML R 76-1 §A.4.12 & §4.4.2).
    Computes reading-wise unrounded indication P = I + 0.5*e - dL,
    error E = P - L (or E0 = P - 0), and checks against limit = 0.25 * e1.
    """
    if not isinstance(observations, dict):
        return {}

    e1 = context.e1_resolution if (context.e1_resolution is not None and context.e1_resolution > 0) else context.e_resolution
    if not e1 or e1 <= 0:
        e1 = 0.001

    allowed_limit = abs(0.25 * float(e1))

    # Search for array of time-series readings or steps
    raw_readings = (
        observations.get("readings") or
        observations.get("time_series") or
        observations.get("stability_readings") or
        observations.get("steps") or
        observations.get("rows")
    )

    # If no array provided, fallback to top-level single observation if 'I' or 'indication' exists
    if not raw_readings or not isinstance(raw_readings, list):
        top_I = observations.get("I") if observations.get("I") is not None else observations.get("indication")
        if top_I is not None:
            raw_readings = [observations]
        else:
            return {}

    parsed_readings = []
    has_fail = False

    for idx, r in enumerate(raw_readings):
        if not isinstance(r, dict):
            continue

        L_val = float(r.get("L") if r.get("L") is not None else (
            r.get("load") if r.get("load") is not None else (
                r.get("applied_load") if r.get("applied_load") is not None else (
                    observations.get("test_load") if observations.get("test_load") is not None else 0.0
                )
            )
        ))

        I_val = float(r.get("I") if r.get("I") is not None else (
            r.get("indication") if r.get("indication") is not None else (
                r.get("I_net") if r.get("I_net") is not None else (
                    r.get("I_gross") if r.get("I_gross") is not None else 0.0
                )
            )
        ))

        dL_val = float(r.get("dL") if r.get("dL") is not None else (
            r.get("changeover") if r.get("changeover") is not None else 0.0
        ))

        time_label = r.get("time_label") or r.get("time") or r.get("label") or r.get("disturbance") or f"Reading {idx + 1}"

        # Calculate P = I + 0.5*e - dL
        P_val = I_val + 0.5 * float(e1) - dL_val
        error_val = P_val - L_val

        pass_fail = "PASS" if (round(abs(error_val), 8) - round(allowed_limit, 8)) <= 1e-9 else "FAIL"
        if pass_fail == "FAIL":
            has_fail = True

        parsed_readings.append({
            "reading_index": idx + 1,
            "time_label": time_label,
            "L": L_val,
            "I": I_val,
            "dL": dL_val,
            "P": P_val,
            "error": error_val,
            "allowed_limit": allowed_limit,
            "active_e": float(e1),
            "result": pass_fail,
            "note": r.get("note", "")
        })

    if not parsed_readings:
        return {}

    overall_result = "FAIL" if has_fail else "PASS"

    return {
        "result": overall_result,
        "allowed_limit": allowed_limit,
        "e1": float(e1),
        "readings": parsed_readings
    }


class CalculationEngine:
    def __init__(self):
        self.loader = get_rule_loader()
        self.mpe_engine = MPEEngine()

    def calculate_rule(
        self,
        rule_id: str,
        observations: Dict[str, Any],
        context: EvaluationContext,
        mpe_result: Optional[MPEResult] = None
    ) -> List[CalculationResult]:
        """
        Executes a calculation rule by ID using observations and context variables.
        Supports multi-row iteration over observation arrays (steps, rows, load_steps, etc.).
        Dynamically binds row variables directly into the evaluation scope.
        """
        rule = self.loader.get_calculation_rule(rule_id)
        if not rule:
            # Check if this is a specialized calculation rule ID
            if rule_id in ("CALC_TILTING_TEST", "TILTING_LIMIT"):
                positions_data = extract_tilting_positions(observations, context)
                if not positions_data:
                    return []
                results: List[CalculationResult] = []
                for p in positions_data:
                    mpe_res = p["mpe_result"]
                    step_idx = p["step_index"]
                    label = p["position_label"]
                    tilt = p["tilt_angle"]
                    calc_id = f"CALC_TILTING_P_{step_idx}"
                    name = f"Tilting unrounded indication (P_v) - {label} ({tilt}°)"

                    results.append(CalculationResult(
                        calculation_id=calc_id,
                        name=name,
                        formula="P_v = I + 0.5 * e - dL; P_v_0 = P_v - E0; Ec = P_v_0 - L",
                        inputs={
                            "position_label": label,
                            "tilt_angle": tilt,
                            "L": p["L"],
                            "I": p["I"],
                            "dL": p["dL"],
                            "active_e": p["active_e"],
                            "P_v": round(p["P_v"], 6),
                            "P_v_0": round(p["P_v_0"], 6),
                            "E0": round(p["E0"], 6),
                            "Ec": round(p["Ec"], 6),
                            "mpe": mpe_res.mpe_value,
                            "mpe_e": mpe_res.mpe_e
                        },
                        output=round(p["Ec"], 6),
                        unit=context.unit,
                        decision=p["result"],
                        limit=mpe_res.mpe_value,
                        source={"standard": "OIML R 76-1", "edition": "2006 (E)", "section": "A.5.1 & 3.9.1", "page": 95}
                    ))
                return results

            if rule_id in ("CALC_ZERO_RETURN", "ZERO_RETURN_LIMIT"):
                info = extract_zero_return_steps(observations, context)
                if not info:
                    return []
                return [CalculationResult(
                    calculation_id="CALC_ZERO_RETURN",
                    name="Zero return deviation (30 min load removal)",
                    formula="delta_P = abs(P_end - P_start); P = I + 0.5 * e - dL",
                    inputs={
                        "e1": info["e1"],
                        "P_start": round(info["P_start"], 6),
                        "P_end": round(info["P_end"], 6),
                        "delta_P": info["delta_P"],
                        "limit": info["allowed_limit"],
                        "steps": info["steps"]
                    },
                    output=info["delta_P"],
                    unit=context.unit,
                    decision=info["result"],
                    limit=info["allowed_limit"],
                    source={"standard": "OIML R 76-1", "edition": "2006 (E)", "section": "A.4.11.2 & 3.9.4.2", "page": 93}
                )]

            if rule_id in ("CALC_STABILITY_OF_EQUILIBRIUM", "STABILITY_LIMIT"):
                info = extract_stability_readings(observations, context)
                if not info:
                    return []
                results: List[CalculationResult] = []
                for r in info.get("readings", []):
                    results.append(CalculationResult(
                        calculation_id=f"CALC_STABILITY_{r['reading_index']}",
                        name=f"Stability of equilibrium reading ({r['time_label']})",
                        formula="E = P - L; P = I + 0.5 * e - dL",
                        inputs={
                            "L": r["L"],
                            "I": r["I"],
                            "dL": r["dL"],
                            "P": round(r["P"], 6),
                            "e1": r["active_e"],
                            "time_label": r["time_label"]
                        },
                        output=r["error"],
                        unit=context.unit,
                        decision=r["result"],
                        limit=r["allowed_limit"],
                        source={"standard": "OIML R 76-1", "edition": "2006 (E)", "section": "A.4.12 & 4.4.2", "page": 93}
                    ))
                return results

            return []

        calc_name = rule.get("name", rule_id)
        formula_expr = rule.get("formula_expression", "")
        source = rule.get("source", {})

        # Specialized calculation rule: Zero Return Test calculation
        if rule_id in ("CALC_ZERO_RETURN", "ZERO_RETURN_LIMIT"):
            info = extract_zero_return_steps(observations, context)
            if not info:
                return []
            return [CalculationResult(
                calculation_id="CALC_ZERO_RETURN",
                name="Zero return deviation (30 min load removal)",
                formula="delta_P = abs(P_end - P_start); P = I + 0.5 * e - dL",
                inputs={
                    "e1": info["e1"],
                    "P_start": round(info["P_start"], 6),
                    "P_end": round(info["P_end"], 6),
                    "delta_P": info["delta_P"],
                    "limit": info["allowed_limit"],
                    "steps": info["steps"]
                },
                output=info["delta_P"],
                unit=context.unit,
                decision=info["result"],
                limit=info["allowed_limit"],
                source=source or {"standard": "OIML R 76-1", "edition": "2006 (E)", "section": "A.4.11.2 & 3.9.4.2", "page": 93}
            )]
        if rule_id in ("CALC_TILTING_TEST", "TILTING_LIMIT"):
            positions_data = extract_tilting_positions(observations, context)
            if not positions_data:
                return []
            results: List[CalculationResult] = []
            for p in positions_data:
                mpe_res = p["mpe_result"]
                step_idx = p["step_index"]
                label = p["position_label"]
                tilt = p["tilt_angle"]
                calc_id = f"CALC_TILTING_P_{step_idx}"
                name = f"Tilting unrounded indication (P_v) - {label} ({tilt}°)"

                results.append(CalculationResult(
                    calculation_id=calc_id,
                    name=name,
                    formula="P_v = I + 0.5 * e - dL; P_v_0 = P_v - E0; Ec = P_v_0 - L",
                    inputs={
                        "position_label": label,
                        "tilt_angle": tilt,
                        "L": p["L"],
                        "I": p["I"],
                        "dL": p["dL"],
                        "active_e": p["active_e"],
                        "P_v": round(p["P_v"], 6),
                        "P_v_0": round(p["P_v_0"], 6),
                        "E0": round(p["E0"], 6),
                        "Ec": round(p["Ec"], 6),
                        "mpe": mpe_res.mpe_value,
                        "mpe_e": mpe_res.mpe_e
                    },
                    output=round(p["Ec"], 6),
                    unit=context.unit,
                    decision=p["result"],
                    limit=mpe_res.mpe_value,
                    source=source or {"standard": "OIML R 76-1", "edition": "2006 (E)", "section": "A.5.1 & 3.9.1", "page": 95}
                ))
            return results

        # Specialized calculation rule: Repeatability range across independent load sets
        if rule_id == "CALC_REPEATABILITY_RANGE":
            groups = extract_repeatability_load_sets(observations, context)
            if not groups:
                return []
            results: List[CalculationResult] = []
            for g in groups:
                nums = g["readings"]
                if len(nums) < 2:
                    continue
                I_max = max(nums)
                I_min = min(nums)
                diff = I_max - I_min
                mpe_res = g["mpe_result"]
                decision = "PASS" if diff <= abs(mpe_res.mpe_value) else "FAIL"

                calc_id = f"CALC_REPEATABILITY_RANGE_set{g['set_index']}" if len(groups) > 1 else "CALC_REPEATABILITY_RANGE"
                set_label = f" (Set {g['set_index']} @ {g['test_load']} {context.unit})" if len(groups) > 1 else f" (@ {g['test_load']} {context.unit})"

                results.append(CalculationResult(
                    calculation_id=calc_id,
                    name=f"{calc_name}{set_label}",
                    formula=formula_expr,
                    inputs={
                        "test_load": g["test_load"],
                        "L": g["test_load"],
                        "active_e": g["active_e"],
                        "readings": nums,
                        "I_max": I_max,
                        "I_min": I_min,
                        "range": diff,
                        "mpe": mpe_res.mpe_value,
                        "mpe_e": mpe_res.mpe_e
                    },
                    output=diff,
                    unit=context.unit,
                    decision=decision,
                    limit=mpe_res.mpe_value,
                    source=source
                ))
            return results

        # Base global environment from context
        e1 = context.e1_resolution if context.e1_resolution is not None else context.e_resolution
        use_e1 = (rule_id == "ZERO_SETTING_ACCURACY" or (mpe_result and mpe_result.rule_id == "ZERO_SETTING_ACCURACY"))

        base_env: Dict[str, Any] = {
            "Max": context.max_capacity,
            "Min": context.min_capacity,
            "e": e1 if use_e1 else context.e_resolution,
            "e1": e1,
            "d": context.d_resolution,
            "accuracy_class": context.accuracy_class,
            "unit": context.unit,
            "E0": 0.0,
            "T": 0.0,
        }

        # 1. Cross-Step Pre-processing & 2. Top-Level Binding for step-based observations
        zero_info = extract_zero_return_steps(observations, context)
        if zero_info:
            base_env["P_start"] = zero_info.get("P_start", 0.0)
            base_env["P_end"] = zero_info.get("P_end", 0.0)
            base_env["delta_P"] = zero_info.get("delta_P", 0.0)
            base_env["dP"] = zero_info.get("delta_P", 0.0)
            base_env["allowed_limit"] = zero_info.get("allowed_limit", 0.5 * e1)
            base_env["zero_return_limit"] = zero_info.get("allowed_limit", 0.5 * e1)

        # Derive array stats if repeatable readings or indications list is present at top-level
        readings = observations.get("readings") or observations.get("repeatability_readings") or observations.get("indications")
        if isinstance(readings, list) and len(readings) > 0 and not isinstance(readings[0], dict):
            try:
                nums = [float(r) for r in readings if r is not None and str(r).strip() != ""]
                if nums:
                    base_env["I_max"] = max(nums)
                    base_env["I_min"] = min(nums)
                    base_env["readings"] = nums
            except (ValueError, TypeError):
                pass

        # 3. Separate Summary Rules from Row Loop: Evaluate cross-step summary rules ONCE at top-level
        is_summary_rule = (
            rule_id in ("CALC_ZERO_RETURN", "ZERO_RETURN_LIMIT", "CALC_ZERO_RETURN_VARIATION", "ZERO_RETURN_TEST") or
            any(v in formula_expr for v in ("delta_P", "dP", "P_start", "P_end", "zero_return_limit")) or
            rule.get("is_summary") is True
        )

        if is_summary_rule:
            if zero_info:
                delta_P = zero_info["delta_P"]
                allowed_limit = zero_info["allowed_limit"]
                decision = zero_info["result"]
                return [CalculationResult(
                    calculation_id=rule_id,
                    name=calc_name,
                    formula=formula_expr or "delta_P = abs(P_end - P_start); P = I + 0.5 * e - dL",
                    inputs={
                        "e1": zero_info["e1"],
                        "P_start": round(zero_info["P_start"], 6),
                        "P_end": round(zero_info["P_end"], 6),
                        "delta_P": delta_P,
                        "limit": allowed_limit,
                        "steps": zero_info["steps"]
                    },
                    output=delta_P,
                    unit=context.unit,
                    decision=decision,
                    limit=allowed_limit,
                    source=source or {"standard": "OIML R 76-1", "edition": "2006 (E)", "section": "A.4.11.2 & 3.9.4.2", "page": 93}
                )]

            val = evaluate_expression(formula_expr, base_env)
            allowed_limit = base_env.get("allowed_limit") or base_env.get("zero_return_limit") or (0.5 * e1)
            is_pass = (round(abs(float(val)), 8) - round(abs(float(allowed_limit)), 8)) <= 1e-9
            decision = "PASS" if is_pass else "FAIL"

            return [CalculationResult(
                calculation_id=rule_id,
                name=calc_name,
                formula=formula_expr,
                inputs=dict(base_env),
                output=val,
                unit=context.unit,
                decision=decision,
                limit=allowed_limit,
                source=source
            )]

        # Check if observations has a row array of dicts
        row_array = extract_row_array(observations)
        if row_array and isinstance(row_array[0], dict):
            rows_to_process = row_array
        else:
            rows_to_process = [observations]

        results: List[CalculationResult] = []

        for idx, row_item in enumerate(rows_to_process):
            row_env = dict(base_env)

            # Copy scalar top-level observations
            if isinstance(observations, dict):
                for k, v in observations.items():
                    if not isinstance(v, (list, dict)):
                        row_env[k] = v

            # Bind row dictionary directly into row_env (Requirement 2: Dynamic Variable Binding)
            if isinstance(row_item, dict):
                for k, v in row_item.items():
                    if isinstance(v, (int, float, str, bool)) or v is None:
                        if isinstance(v, str):
                            try:
                                row_env[k] = float(v)
                            except ValueError:
                                row_env[k] = v
                        else:
                            row_env[k] = v

            # Universal alias fallback bindings (load -> L, indication -> I, changeover -> dL)
            if "L" not in row_env or row_env["L"] is None:
                for alias in ("load", "applied_load", "net_load", "test_load"):
                    if alias in row_env and row_env[alias] is not None:
                        row_env["L"] = row_env[alias]
                        break

            if "I" not in row_env or row_env["I"] is None:
                for alias in ("I_net", "I_gross", "indication", "indicated_value", "initial_indication", "reading"):
                    if alias in row_env and row_env[alias] is not None:
                        row_env["I"] = row_env[alias]
                        break

            if "dL" not in row_env or row_env["dL"] is None:
                for alias in ("changeover", "additional_weight", "additional_weight_changeover"):
                    if alias in row_env and row_env[alias] is not None:
                        row_env["dL"] = row_env[alias]
                        break

            # Resolve MPE for current row
            row_mpe = mpe_result
            load_val = row_env.get("L")
            if (not row_mpe or row_mpe.rule_id == "MPE_INIT") and isinstance(load_val, (int, float)):
                row_mpe = self.mpe_engine.calculate_mpe(
                    accuracy_class=context.accuracy_class,
                    load=float(load_val),
                    e_resolution=context.e_resolution,
                    unit=context.unit,
                    verification_type=context.verification_type,
                    intervals=context.weighing_intervals
                )

            if row_mpe:
                row_env["mpe"] = row_mpe.mpe_value
                row_env["mpe_e"] = row_mpe.mpe_e

            step_suffix = f" (Step {idx + 1})" if len(rows_to_process) > 1 else ""
            calc_suffix = f"_{idx + 1}" if len(rows_to_process) > 1 else ""

            # Check if formula contains multiple statements separated by semicolon (e.g. P = ...; E = ...)
            if ";" in formula_expr:
                statements = [stmt.strip() for stmt in formula_expr.split(";") if stmt.strip()]
                sub_outputs = {}
                for stmt in statements:
                    if "=" in stmt:
                        var_name, expr = stmt.split("=", 1)
                        var_name = var_name.strip()
                        val = evaluate_expression(expr.strip(), row_env)
                        row_env[var_name] = val
                        sub_outputs[var_name] = val

                for symbol, val in sub_outputs.items():
                    decision = None
                    if row_mpe and symbol in ("E", "Ec"):
                        decision = "PASS" if abs(val) <= row_mpe.mpe_value else "FAIL"

                    results.append(CalculationResult(
                        calculation_id=f"{rule_id}_{symbol}{calc_suffix}",
                        name=f"{calc_name} ({symbol}){step_suffix}",
                        formula=formula_expr,
                        inputs=dict(row_env),
                        output=val,
                        unit=context.unit,
                        decision=decision,
                        limit=row_mpe.mpe_value if decision else None,
                        source=source
                    ))

            else:
                val = evaluate_expression(formula_expr, row_env)
                decision = None
                if row_mpe and isinstance(val, (int, float)):
                    if rule.get("decision_criteria") or "E" in formula_expr or "Ec" in formula_expr or rule_id.startswith("CALC_ERROR"):
                        decision = "PASS" if abs(val) <= row_mpe.mpe_value else "FAIL"

                results.append(CalculationResult(
                    calculation_id=f"{rule_id}{calc_suffix}",
                    name=f"{calc_name}{step_suffix}",
                    formula=formula_expr,
                    inputs=dict(row_env),
                    output=val,
                    unit=context.unit,
                    decision=decision,
                    limit=row_mpe.mpe_value if decision else None,
                    source=source
                ))

        return results

