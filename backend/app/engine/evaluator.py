"""
METRA — app/engine/evaluator.py
Orchestrator for evaluating a single test against an instrument context and test observations.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from app.engine.models import (
    EvaluationContext, TestResult, ApplicabilityStatus, TestExecutionStatus,
    RuleTraceEntry, ValidationResult, MPEResult, CalculationResult
)
from app.engine.rule_loader import get_rule_loader
from app.engine.applicability import ApplicabilityEngine
from app.engine.validator import InputValidator
from app.engine.mpe_engine import MPEEngine
from app.engine.calculator import CalculationEngine, extract_row_array


def normalize_observation_payload(observations: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalizes observation payload for OIML engine evaluation.
    Iterates through top-level dictionary and row arrays (net_test_steps, load_steps, steps, etc.).
    If 'I' is missing or None, maps 'I_net' (or 'I_gross' / 'indication') to 'I' so formula evaluation receives 'I'.
    """
    if not isinstance(observations, dict):
        return observations

    obs = dict(observations)

    # Top-level mapping
    if ("I" not in obs or obs["I"] is None or obs["I"] == ""):
        if obs.get("I_net") is not None:
            obs["I"] = obs["I_net"]
        elif obs.get("I_gross") is not None:
            obs["I"] = obs["I_gross"]
        elif obs.get("indication") is not None:
            obs["I"] = obs["indication"]

    # Observation row array keys
    array_keys = [
        "steps", "rows", "load_steps", "test_load_steps",
        "net_test_steps", "positions", "test_points", "readings",
        "load_sets", "repeatability_sets", "sets", "groups"
    ]

    for key in array_keys:
        row_list = obs.get(key)
        if isinstance(row_list, list):
            new_list = []
            for row in row_list:
                if isinstance(row, dict):
                    row_copy = dict(row)
                    if ("I" not in row_copy or row_copy.get("I") is None or row_copy.get("I") == ""):
                        if row_copy.get("I_net") is not None:
                            row_copy["I"] = row_copy.get("I_net")
                        elif row_copy.get("I_gross") is not None:
                            row_copy["I"] = row_copy.get("I_gross")
                        elif row_copy.get("indication") is not None:
                            row_copy["I"] = row_copy.get("indication")
                        elif row_copy.get("indicated_value") is not None:
                            row_copy["I"] = row_copy.get("indicated_value")

                    # Handle nested readings list in load set objects
                    nested_readings = row_copy.get("readings") or row_copy.get("indications")
                    if isinstance(nested_readings, list):
                        new_nested = []
                        for nr in nested_readings:
                            if isinstance(nr, dict):
                                nr_copy = dict(nr)
                                if ("I" not in nr_copy or nr_copy.get("I") is None or nr_copy.get("I") == ""):
                                    if nr_copy.get("I_net") is not None:
                                        nr_copy["I"] = nr_copy.get("I_net")
                                    elif nr_copy.get("indication") is not None:
                                        nr_copy["I"] = nr_copy.get("indication")
                                new_nested.append(nr_copy)
                            else:
                                new_nested.append(nr)
                        row_copy["readings"] = new_nested

                    new_list.append(row_copy)
                else:
                    new_list.append(row)
            obs[key] = new_list

    # For multi-set repeatability payloads, derive top-level test_load and number_of_weighings fallback if missing
    if ("test_load" not in obs or obs.get("test_load") is None):
        for set_key in ("load_sets", "repeatability_sets", "sets", "groups"):
            sets_list = obs.get(set_key)
            if isinstance(sets_list, list) and len(sets_list) > 0 and isinstance(sets_list[0], dict):
                first_load = sets_list[0].get("test_load") or sets_list[0].get("load") or sets_list[0].get("L")
                if first_load is not None:
                    obs["test_load"] = first_load
                    break

    if ("number_of_weighings" not in obs or obs.get("number_of_weighings") is None):
        for set_key in ("load_sets", "repeatability_sets", "sets", "groups", "readings"):
            sets_list = obs.get(set_key)
            if isinstance(sets_list, list) and len(sets_list) > 0:
                first_item = sets_list[0]
                if isinstance(first_item, dict) and "readings" in first_item and isinstance(first_item["readings"], list):
                    obs["number_of_weighings"] = len(first_item["readings"])
                else:
                    obs["number_of_weighings"] = len(sets_list)
                break

    return obs


def safe_float(val: Any) -> Optional[float]:
    """Safely converts string or numeric values to float, handling symbols like ±."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        clean = val.replace("±", "").replace("+", "").strip()
        try:
            return float(clean)
        except (ValueError, TypeError):
            return None
    return None


class RuleEvaluator:
    def __init__(self):
        self.loader = get_rule_loader()
        self.applicability_engine = ApplicabilityEngine()
        self.validator = InputValidator()
        self.mpe_engine = MPEEngine()
        self.calculator = CalculationEngine()

    def evaluate_test(
        self,
        test_id: str,
        context: EvaluationContext,
        observations: Dict[str, Any],
        manual_result: Optional[str] = None
    ) -> TestResult:
        """
        Full evaluation pipeline for a test:
        Applicability -> Validation -> MPE -> Calculations -> Rule Trace -> Final Status
        """
        observations = normalize_observation_payload(observations)

        test_def = self.loader.get_test(test_id)
        if not test_def:
            raise ValueError(f"Test definition '{test_id}' not found in rule registry.")

        test_name = test_def.get("test_name", test_id)
        source = test_def.get("source", {})
        clause = source.get("section", "N/A")

        # 1. Applicability Check
        app_status, app_reason = self.applicability_engine.evaluate_test_applicability(test_def, context)
        if app_status == ApplicabilityStatus.NOT_APPLICABLE:
            return TestResult(
                test_id=test_id,
                test_name=test_name,
                clause=clause,
                applicability=ApplicabilityStatus.NOT_APPLICABLE,
                applicability_reason=app_reason,
                status=TestExecutionStatus.NOT_APPLICABLE,
                observations=observations,
                summary_message=f"Test not applicable: {app_reason}",
                calculated_at=datetime.utcnow().isoformat()
            )

        # 2. Input Validation & Logging
        validations: List[ValidationResult] = []
        # Validate instrument context parameters
        validations.extend(self.validator.validate_instrument_context(context))
        # Validate observation inputs against test schema with instrument context
        validations.extend(self.validator.validate_test_observations(test_def, observations, context))

        val_fails = [v for v in validations if v.status == "FAIL"]

        # 3. MPE Lookup
        mpe_details: List[MPEResult] = []
        if test_id == "TEST-A.4.2.3" or "ZERO_SETTING_ACCURACY" in test_def.get("evaluation_rule_ids", []):
            mpe = self.mpe_engine.calculate_zero_setting_accuracy_mpe(context)
            mpe_details.append(mpe)
        else:
            test_load = observations.get("L") or observations.get("test_load") or (context.max_capacity * 0.5)
            if isinstance(test_load, (int, float)) and test_load > 0:
                mpe = self.mpe_engine.calculate_mpe(
                    accuracy_class=context.accuracy_class,
                    load=float(test_load),
                    e_resolution=context.e_resolution,
                    unit=context.unit,
                    verification_type=context.verification_type,
                    intervals=context.weighing_intervals
                )
                mpe_details.append(mpe)

        primary_mpe = mpe_details[0] if mpe_details else None

        # 4. Calculation Execution
        calculations: List[CalculationResult] = []
        calc_rules = test_def.get("calculations", [])
        current_obs = dict(observations)

        if test_id in ("TEST-A.4.11.2", "zero_return_test") or "zero_deviation" in observations:
            res_list = self.calculator.calculate_rule(
                rule_id="CALC_ZERO_RETURN",
                observations=observations,
                context=context,
                mpe_result=primary_mpe
            )
            calculations.extend(res_list)
        elif test_id in ("TEST-A.4.12", "stability_of_equilibrium_test", "stability_test"):
            res_list = self.calculator.calculate_rule(
                rule_id="CALC_STABILITY_OF_EQUILIBRIUM",
                observations=observations,
                context=context,
                mpe_result=primary_mpe
            )
            calculations.extend(res_list)
        elif test_id in ("TEST-A.5.4", "voltage_variations_test") or any(k in observations for k in ("low", "high", "reference", "voltage_stages", "stages")):
            res_list = self.calculator.calculate_rule(
                rule_id="CALC_VOLTAGE_VARIATIONS",
                observations=observations,
                context=context,
                mpe_result=primary_mpe
            )
            calculations.extend(res_list)
        elif test_id in ("TEST-A.6", "endurance_test", "durability_test") or any(k in observations for k in ("initial", "final", "load_cycles")):
            res_list = self.calculator.calculate_rule(
                rule_id="CALC_DURABILITY_ERROR",
                observations=observations,
                context=context,
                mpe_result=primary_mpe
            )
            calculations.extend(res_list)
        else:
            for calc_id in calc_rules:
                res_list = self.calculator.calculate_rule(
                    rule_id=calc_id,
                    observations=current_obs,
                    context=context,
                    mpe_result=primary_mpe
                )
                calculations.extend(res_list)

                # Pass calculated outputs (E, P, E0, Ec) forward to subsequent calculation rules
                for res in res_list:
                    parts = res.calculation_id.split("_")
                    symbol = None
                    step_idx = None
                    for p in parts:
                        if p in ("E", "P", "E0", "Ec"):
                            symbol = p
                        elif p.isdigit():
                            step_idx = int(p) - 1

                    if symbol:
                        current_obs.setdefault(symbol, res.output)
                        row_array = extract_row_array(current_obs)
                        if row_array and step_idx is not None and 0 <= step_idx < len(row_array):
                            if isinstance(row_array[step_idx], dict):
                                row_array[step_idx][symbol] = res.output

        # Handle custom repeatability, tilting, stability, voltage variations, endurance, or eccentricity inline calculation if calc rules array is empty
        if not calculations:
            if test_id in ("TEST-A.4.11.1", "TEST-A.5.1", "tilting_test") or any(k in observations for k in ("positions", "tilt_positions")):
                res_list = self.calculator.calculate_rule(
                    rule_id="CALC_TILTING_TEST",
                    observations=observations,
                    context=context,
                    mpe_result=primary_mpe
                )
                calculations.extend(res_list)
            elif test_id in ("TEST-A.4.12", "stability_of_equilibrium_test", "stability_test") or any(k in observations for k in ("stability_readings", "time_series")):
                res_list = self.calculator.calculate_rule(
                    rule_id="CALC_STABILITY_OF_EQUILIBRIUM",
                    observations=observations,
                    context=context,
                    mpe_result=primary_mpe
                )
                calculations.extend(res_list)
            elif test_id in ("TEST-A.5.4", "voltage_variations_test") or any(k in observations for k in ("low", "high", "reference", "voltage_stages", "stages")):
                res_list = self.calculator.calculate_rule(
                    rule_id="CALC_VOLTAGE_VARIATIONS",
                    observations=observations,
                    context=context,
                    mpe_result=primary_mpe
                )
                calculations.extend(res_list)
            elif test_id in ("TEST-A.6", "endurance_test", "durability_test") or any(k in observations for k in ("initial", "final", "load_cycles")):
                res_list = self.calculator.calculate_rule(
                    rule_id="CALC_DURABILITY_ERROR",
                    observations=observations,
                    context=context,
                    mpe_result=primary_mpe
                )
                calculations.extend(res_list)
            elif "repeatability_readings" in observations or "load_sets" in observations:
                res_list = self.calculator.calculate_rule(
                    rule_id="CALC_REPEATABILITY_RANGE",
                    observations=observations,
                    context=context,
                    mpe_result=primary_mpe
                )
                calculations.extend(res_list)

        # 5. Build OIML Rule Trace dynamically from calculation results
        rule_trace: List[RuleTraceEntry] = []
        rule_trace.append(RuleTraceEntry(
            rule_id=test_id,
            name=test_name,
            standard=source.get("standard", "OIML R 76-1"),
            edition=source.get("edition", "2006 (E)"),
            section=source.get("section"),
            page=source.get("page"),
            explanation=f"Evaluated {test_name} clause {clause} under OIML R 76-1 requirements."
        ))

        for c in calculations:
            inputs_summary = []
            L_val = c.inputs.get("L")
            if L_val is not None and isinstance(L_val, (int, float)):
                inputs_summary.append(f"Applied load L: {round(L_val, 6)} {c.unit or ''}")
            I_val = c.inputs.get("I")
            if I_val is not None and isinstance(I_val, (int, float)):
                inputs_summary.append(f"Indicated value I: {round(I_val, 6)} {c.unit or ''}")
            dL_val = c.inputs.get("dL")
            if dL_val is not None and isinstance(dL_val, (int, float)):
                inputs_summary.append(f"Changeover dL: {round(dL_val, 6)} {c.unit or ''}")
            e1_val = c.inputs.get("e1") or c.inputs.get("e")
            if e1_val is not None and isinstance(e1_val, (int, float)):
                inputs_summary.append(f"Applicable e/e1: {round(e1_val, 6)} {c.unit or ''}")

            inputs_str = (" | " + " | ".join(inputs_summary)) if inputs_summary else ""
            out_str = round(c.output, 6) if isinstance(c.output, float) else c.output
            lim_str = f" | MPE limit: ±{round(float(c.limit), 6)} {c.unit or ''}" if (safe_float(c.limit) is not None) else (f" | Limit: {c.limit}" if c.limit is not None else "")
            dec_str = f" | Decision: {c.decision}" if c.decision else ""

            explanation = (
                f"Test ID: {test_id} | {c.name}{inputs_str} | Formula used: {c.formula} | "
                f"Calculated output: {out_str} {c.unit or ''}{lim_str}{dec_str}."
            )

            rule_trace.append(RuleTraceEntry(
                rule_id=c.calculation_id,
                name=c.name,
                standard=c.source.get("standard", source.get("standard", "OIML R 76-1")),
                edition=c.source.get("edition", source.get("edition", "2006 (E)")),
                section=c.source.get("section", source.get("section")),
                page=c.source.get("page", source.get("page")),
                explanation=explanation
            ))

        # 6. Determine Final Test Status
        final_status = TestExecutionStatus.NOT_STARTED

        if val_fails:
            final_status = TestExecutionStatus.FAIL
            summary = f"Input validation failed: {val_fails[0].message}"
        elif calculations:
            calc_fails = []
            explicit_passes = []

            for c in calculations:
                out_num = safe_float(c.output)
                lim_num = safe_float(c.limit)

                if c.decision == "PASS":
                    explicit_passes.append(c)
                elif out_num is not None and lim_num is not None:
                    is_within_limit = (round(abs(out_num), 8) - round(abs(lim_num), 8)) <= 1e-9
                    if is_within_limit:
                        c.decision = "PASS"
                        explicit_passes.append(c)
                    else:
                        c.decision = "FAIL"
                        calc_fails.append(c)
                elif c.decision == "FAIL":
                    # Check if this is an unmapped global rule or empty summary check line (no valid inputs or output)
                    has_valid_inputs = bool(c.inputs and any(v is not None for v in c.inputs.values()))
                    if not has_valid_inputs and out_num is None:
                        continue
                    calc_fails.append(c)

            # Ensure consistency between row-level passes and test-level execution status:
            # If all individual calculations or steps in a test have decision == "PASS" (or no calculation has decision == "FAIL"),
            # the final TestExecutionStatus is set to PASS.
            if not calc_fails:
                final_status = TestExecutionStatus.PASS
                summary = "All calculation requirements passed successfully."
            else:
                final_status = TestExecutionStatus.FAIL
                summary = f"Calculation failed requirement: {calc_fails[0].name}"
        elif manual_result:
            if manual_result.upper() == "PASS":
                final_status = TestExecutionStatus.PASS
                summary = "Manual review marked PASS by engineer."
            elif manual_result.upper() == "FAIL":
                final_status = TestExecutionStatus.FAIL
                summary = "Manual review marked FAIL by engineer."
            else:
                final_status = TestExecutionStatus.NOT_APPLICABLE
                summary = "Manual review marked N/A."
        else:
            # If test has no automatic calculation and no manual result provided yet
            final_status = TestExecutionStatus.MANUAL_REVIEW
            summary = "Test requires manual verification / engineer signoff."

        return TestResult(
            test_id=test_id,
            test_name=test_name,
            clause=clause,
            applicability=app_status,
            applicability_reason=app_reason,
            status=final_status,
            manual_result=manual_result,
            observations=observations,
            validations=validations,
            mpe_details=mpe_details,
            calculations=calculations,
            rule_trace=rule_trace,
            summary_message=summary,
            calculated_at=datetime.utcnow().isoformat()
        )
