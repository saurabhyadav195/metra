"""
METRA — app/services/evaluation_service.py
Service handling evaluation CRUD, observation management, test calculation, and report aggregation.
Enforces strict laboratory multi-tenancy isolation.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from supabase import Client

from app.deps import AuthenticatedUser
from app.engine.models import EvaluationContext, WeighingInterval, TestResult, ApplicabilityStatus, TestExecutionStatus
from app.engine.evaluator import RuleEvaluator, normalize_observation_payload
from app.engine.calculator import extract_repeatability_load_sets, extract_tilting_positions, extract_zero_return_steps, extract_stability_readings
from app.engine.rule_loader import get_rule_loader
from app.engine.result_builder import ResultBuilder
from app.engine.mpe_engine import MPEEngine


class EvaluationService:
    def __init__(self, client: Client):
        self.client = client
        self.loader = get_rule_loader()
        self.evaluator = RuleEvaluator()
        self.mpe_engine = MPEEngine()

    def _build_context_from_instrument(self, inst: dict) -> EvaluationContext:
        """Converts instrument database record into EvaluationContext."""
        capacity_val = inst.get("max_capacity") if inst.get("max_capacity") is not None else (inst.get("capacity") if inst.get("capacity") is not None else inst.get("Max"))
        capacity = float(capacity_val if capacity_val is not None else 100.0)
        e = float(inst.get("verification_scale_interval_e") or inst.get("verification_scale_interval") or inst.get("e_resolution") or 0.05)
        d = float(inst.get("scale_interval_d") or inst.get("actual_scale_interval") or inst.get("d_resolution") or e)

        # Parse multi-interval data if present (OIML T.3.2.6 / T.3.2.7)
        raw_intervals = inst.get("weighing_intervals")
        weighing_intervals: Optional[List[WeighingInterval]] = None
        e1_resolution: Optional[float] = None
        if raw_intervals and isinstance(raw_intervals, list) and len(raw_intervals) > 0:
            try:
                parsed = [WeighingInterval(max_load=float(iv["max_load"]), e=float(iv["e"])) for iv in raw_intervals]
                weighing_intervals = sorted(parsed, key=lambda iv: iv.max_load)
                e1_resolution = weighing_intervals[0].e  # Smallest e — used for fixed-e₁ limits
            except (KeyError, TypeError, ValueError):
                weighing_intervals = None  # Gracefully ignore malformed data

        return EvaluationContext(
            instrument_id=inst["id"],
            serial_number=inst.get("serial_number"),
            manufacturer=inst.get("manufacturer"),
            model=inst.get("model"),
            accuracy_class=inst.get("accuracy_class", "III"),
            max_capacity=capacity,
            min_capacity=float(inst.get("min_capacity") or 0.0),
            e_resolution=e,
            d_resolution=d,
            n_intervals=int(capacity / e) if e > 0 else 2000,
            unit=inst.get("unit", "kg"),
            instrument_type=inst.get("instrument_type", "non_automatic"),
            power_source=inst.get("power_source", "mains"),
            has_tare=inst.get("has_tare", True),
            is_electronic=inst.get("is_electronic", True),
            weighing_intervals=weighing_intervals,
            e1_resolution=e1_resolution
        )

    @staticmethod
    def _resolve_e_for_load(load: float, context: EvaluationContext) -> float:
        """Returns the active e_i for a given load, respecting multi-interval definitions."""
        return MPEEngine._resolve_active_e(load, context.weighing_intervals, context.e_resolution)

    def _safe_insert(self, table_name: str, payload: dict) -> dict:
        import re
        curr = dict(payload)
        while True:
            try:
                res = self.client.table(table_name).insert(curr).execute()
                if res.data:
                    return res.data[0]
                raise HTTPException(status_code=500, detail=f"Failed to insert into {table_name}.")
            except HTTPException:
                raise
            except Exception as e:
                err_str = str(e)
                m = re.search(r"Could not find the '([^']+)' column", err_str)
                if not m:
                    m = re.search(r"column [^\s]+ ([^\s]+) does not exist", err_str)
                if m:
                    col = m.group(1)
                    if "." in col:
                        col = col.split(".")[-1]
                    if col in curr:
                        curr.pop(col, None)
                        continue
                raise e

    def _safe_insert_rows(self, table_name: str, rows: list) -> list:
        import re
        if not rows:
            return []
        curr_rows = [dict(r) for r in rows]
        while True:
            try:
                res = self.client.table(table_name).insert(curr_rows).execute()
                return res.data or []
            except Exception as e:
                err_str = str(e)
                m = re.search(r"Could not find the '([^']+)' column", err_str)
                if not m:
                    m = re.search(r"column [^\s]+ ([^\s]+) does not exist", err_str)
                if m:
                    col = m.group(1)
                    if "." in col:
                        col = col.split(".")[-1]
                    stripped = False
                    for r in curr_rows:
                        if col in r:
                            r.pop(col, None)
                            stripped = True
                    if stripped:
                        continue
                return []

    def _generate_evaluation_number(self, laboratory_id: str) -> str:
        """Generates a unique server-side evaluation number like EVL-2026-001."""
        year = datetime.utcnow().year
        prefix = f"EVL-{year}-"
        
        try:
            res = (
                self.client.table("evaluations")
                .select("evaluation_number")
                .like("evaluation_number", f"{prefix}%")
                .execute()
            )
            data = res.data or []
            max_seq = 0
            for row in data:
                num_str = row.get("evaluation_number") or ""
                if num_str.startswith(prefix):
                    seq_part = num_str[len(prefix):]
                    try:
                        seq_int = int(seq_part)
                        if seq_int > max_seq:
                            max_seq = seq_int
                    except ValueError:
                        pass
            next_seq = max_seq + 1
            return f"{prefix}{next_seq:03d}"
        except Exception:
            import uuid
            return f"{prefix}{uuid.uuid4().hex[:6].upper()}"

    def _safe_update(self, table_name: str, payload: dict, eq_col: str, eq_val: str) -> None:
        import re
        curr = dict(payload)
        while curr:
            try:
                self.client.table(table_name).update(curr).eq(eq_col, eq_val).execute()
                return
            except Exception as e:
                err_str = str(e)
                m = re.search(r"Could not find the '([^']+)' column", err_str)
                if not m:
                    m = re.search(r"column [^\s]+ ([^\s]+) does not exist", err_str)
                if m:
                    col = m.group(1)
                    if "." in col:
                        col = col.split(".")[-1]
                    if col in curr:
                        curr.pop(col, None)
                        continue
                break

    async def create_evaluation(self, payload: Any, caller: AuthenticatedUser) -> dict:
        """Creates a new evaluation for an instrument, initializing all test result stubs."""
        if isinstance(payload, str):
            instrument_id = payload
            eval_date = datetime.utcnow().date().isoformat()
            oiml_ver = "2006 (E)"
            env_conds = {}
        elif hasattr(payload, "instrument_id"):
            instrument_id = payload.instrument_id
            eval_date = getattr(payload, "evaluation_date", None) or datetime.utcnow().date().isoformat()
            oiml_ver = getattr(payload, "oiml_version", None) or getattr(payload, "oiml_edition", None) or "2006 (E)"
            env_payload = getattr(payload, "environmental_conditions", None)
            env_conds = {}
            if env_payload:
                if hasattr(env_payload, "dict"):
                    raw_dict = env_payload.dict(exclude_none=True)
                elif isinstance(env_payload, dict):
                    raw_dict = env_payload
                else:
                    raw_dict = {}
                humidity = raw_dict.get("relative_humidity_percent") or raw_dict.get("relative_humidity_pct")
                env_conds = {
                    "temperature_c": raw_dict.get("temperature_c"),
                    "relative_humidity_percent": humidity,
                    "relative_humidity_pct": humidity,
                    "atmospheric_pressure_hpa": raw_dict.get("atmospheric_pressure_hpa"),
                    "test_location": raw_dict.get("test_location"),
                    "notes": raw_dict.get("notes"),
                }
        elif isinstance(payload, dict):
            instrument_id = payload.get("instrument_id")
            eval_date = payload.get("evaluation_date") or datetime.utcnow().date().isoformat()
            oiml_ver = payload.get("oiml_version") or payload.get("oiml_edition") or "2006 (E)"
            raw_dict = payload.get("environmental_conditions") or {}
            humidity = raw_dict.get("relative_humidity_percent") or raw_dict.get("relative_humidity_pct")
            env_conds = {
                "temperature_c": raw_dict.get("temperature_c"),
                "relative_humidity_percent": humidity,
                "relative_humidity_pct": humidity,
                "atmospheric_pressure_hpa": raw_dict.get("atmospheric_pressure_hpa"),
                "test_location": raw_dict.get("test_location"),
                "notes": raw_dict.get("notes"),
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid create evaluation payload.")

        if not instrument_id:
            raise HTTPException(status_code=400, detail="instrument_id is required.")

        # 1. Verify instrument exists in caller's laboratory
        res = (
            self.client.table("instruments")
            .select("*")
            .eq("id", instrument_id)
            .eq("laboratory_id", caller.laboratory_id)
            .execute()
        )
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instrument not found in your laboratory."
            )

        inst = res.data[0]
        context = self._build_context_from_instrument(inst)

        # 2. Generate server-side unique evaluation number
        eval_number = self._generate_evaluation_number(caller.laboratory_id)

        # 3. Insert evaluation record safely
        eval_insert = {
            "laboratory_id": caller.laboratory_id,
            "instrument_id": instrument_id,
            "created_by": caller.user_id,
            "evaluation_number": eval_number,
            "status": "in_progress",
            "oiml_edition": oiml_ver,
            "oiml_version": oiml_ver,
            "evaluation_date": eval_date,
            "environmental_conditions": env_conds,
            "started_at": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        evaluation = self._safe_insert("evaluations", eval_insert)
        eval_id = evaluation["id"]

        # 3. Initialize test results for all OIML tests
        all_tests = self.loader.get_all_tests()
        test_result_rows = []

        for test in all_tests:
            app_status, app_reason = self.evaluator.applicability_engine.evaluate_test_applicability(test, context)

            test_result_rows.append({
                "evaluation_id": eval_id,
                "laboratory_id": caller.laboratory_id,
                "test_id": test["test_id"],
                "test_name": test.get("test_name", test["test_id"]),
                "clause": test.get("source", {}).get("section", "N/A"),
                "status": "NOT_APPLICABLE" if app_status == ApplicabilityStatus.NOT_APPLICABLE else "NOT_STARTED",
                "applicability_status": app_status.value,
                "applicability_reason": app_reason,
            })

        self._safe_insert_rows("evaluation_test_results", test_result_rows)

        return await self.get_evaluation_detail(eval_id, caller)

    async def list_evaluations(self, caller: AuthenticatedUser) -> List[dict]:
        """Lists evaluations for caller's laboratory safely handling column variations."""
        res = (
            self.client.table("evaluations")
            .select("*, instruments(*)")
            .eq("laboratory_id", caller.laboratory_id)
            .order("created_at", desc=True)
            .execute()
        )
        data = res.data or []
        if caller.role == "engineer":
            data = [
                e for e in data
                if e.get("created_by") == caller.user_id or e.get("created_by") is None
            ]
        return data

    async def get_evaluation_detail(self, evaluation_id: str, caller: AuthenticatedUser) -> dict:
        """Retrieves full evaluation record with instrument details and test results."""
        eval_res = (
            self.client.table("evaluations")
            .select("*, instruments(*)")
            .eq("id", evaluation_id)
            .eq("laboratory_id", caller.laboratory_id)
            .execute()
        )
        if not eval_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evaluation not found in your laboratory."
            )

        evaluation = eval_res.data[0]

        try:
            tests_res = (
                self.client.table("evaluation_test_results")
                .select("*")
                .eq("evaluation_id", evaluation_id)
                .eq("laboratory_id", caller.laboratory_id)
                .order("created_at", desc=False)
                .execute()
            )
            evaluation["test_results"] = tests_res.data or []
        except Exception:
            evaluation["test_results"] = []

        return evaluation

    async def save_environmental_conditions(
        self,
        evaluation_id: str,
        conditions: Dict[str, Any],
        caller: AuthenticatedUser
    ) -> dict:
        """Saves environmental conditions for an evaluation."""
        # Verify ownership
        eval_res = (
            self.client.table("evaluations")
            .select("id, status")
            .eq("id", evaluation_id)
            .eq("laboratory_id", caller.laboratory_id)
            .execute()
        )
        if not eval_res.data:
            raise HTTPException(status_code=404, detail="Evaluation not found.")

        evaluation = eval_res.data[0]
        if str(evaluation.get("status", "")).lower() in ("pass", "passed", "fail", "failed"):
            if caller.role not in ("owner", "admin"):
                raise HTTPException(
                    status_code=403,
                    detail="Evaluation is finalized. Only owners/admins may edit."
                )

        self._safe_update("evaluations", {
            "environmental_conditions": conditions,
            "updated_at": datetime.utcnow().isoformat()
        }, "id", evaluation_id)

        return await self.get_evaluation_detail(evaluation_id, caller)

    async def update_evaluation_metadata(
        self,
        evaluation_id: str,
        data: Dict[str, Any],
        caller: AuthenticatedUser
    ) -> dict:
        """Updates evaluation metadata (date, notes)."""
        eval_res = (
            self.client.table("evaluations")
            .select("id, status")
            .eq("id", evaluation_id)
            .eq("laboratory_id", caller.laboratory_id)
            .execute()
        )
        if not eval_res.data:
            raise HTTPException(status_code=404, detail="Evaluation not found.")

        allowed_fields = {"notes", "evaluation_date"}
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        if update_data:
            update_data["updated_at"] = datetime.utcnow().isoformat()
            self._safe_update("evaluations", update_data, "id", evaluation_id)

        return await self.get_evaluation_detail(evaluation_id, caller)

    async def save_observations(
        self,
        evaluation_id: str,
        test_id: str,
        observations: Dict[str, Any],
        caller: AuthenticatedUser
    ) -> dict:
        """Saves or updates observations for a test in an evaluation."""
        # Normalize observation payload (maps I_net / I_gross -> I)
        observations = normalize_observation_payload(observations)

        # Check evaluation & test ownership
        test_res = (
            self.client.table("evaluation_test_results")
            .select("*")
            .eq("evaluation_id", evaluation_id)
            .eq("test_id", test_id)
            .eq("laboratory_id", caller.laboratory_id)
            .execute()
        )
        if not test_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evaluation test record not found."
            )

        test_row = test_res.data[0]
        test_result_id = test_row["id"]

        # Upsert observations
        obs_payload = {
            "evaluation_id": evaluation_id,
            "test_result_id": test_result_id,
            "laboratory_id": caller.laboratory_id,
            "observations": observations,
            "updated_at": datetime.utcnow().isoformat()
        }

        self.client.table("test_observations").upsert(obs_payload, on_conflict="evaluation_id,test_result_id").execute()

        # Update test result status to IN_PROGRESS if NOT_STARTED
        if test_row["status"] == "NOT_STARTED":
            self.client.table("evaluation_test_results").update({"status": "IN_PROGRESS"}).eq("id", test_result_id).execute()

        return await self.get_test_detail(evaluation_id, test_id, caller)

    # ─────────────────────────────────────────────────────────────────────────
    # Specialized test calculators (backed by OIML rule data)
    # ─────────────────────────────────────────────────────────────────────────

    def _calculate_weighing_test(
        self,
        context: EvaluationContext,
        observations: Dict[str, Any],
        test_def: dict
    ) -> Dict[str, Any]:
        """
        Weighing test (TEST-A.4.4.1 / TEST-A.4.6.1) — OIML R 76-1 §A.4.4.3
        For each load step {L, I, dL}:
            P = I + 0.5*e_i - dL  (e_i = active interval e for load L)
            E = P - L             (uncorrected error)
            Ec = E - E0           (corrected error)
        PASS if |Ec| <= MPE(L) for each load step.
        MPE and e_i both resolved per-interval for multi-interval instruments.
        """
        if isinstance(observations, dict) and "observations" in observations and isinstance(observations["observations"], dict):
            observations = observations["observations"]

        observations = normalize_observation_payload(observations)

        load_steps = (
            observations.get("load_steps") or
            observations.get("net_test_steps") or
            observations.get("steps") or
            observations.get("readings") or
            observations.get("rows") or
            observations.get("test_load_steps") or
            []
        )
        verification_type = observations.get("verification_type", "initial")

        if not load_steps:
            return {"status": "ERROR", "message": "No load steps provided.", "rows": []}

        # Normalize steps: ensure L, I, dL fields are present
        norm_steps = []
        for step in load_steps:
            if isinstance(step, dict):
                L_val = float(step.get("L") if step.get("L") is not None else (step.get("load") if step.get("load") is not None else step.get("applied_load", 0.0)))
                I_val = float(
                    step.get("I") if step.get("I") is not None else (
                        step.get("I_net") if step.get("I_net") is not None else (
                            step.get("I_gross") if step.get("I_gross") is not None else (
                                step.get("indication") if step.get("indication") is not None else step.get("indicated_value", 0.0)
                            )
                        )
                    )
                )
                dL_val = float(step.get("dL", 0.0))
                norm_steps.append({"L": L_val, "I": I_val, "dL": dL_val})

        # E0 — error at zero; use e for the first load step (active e_i at L≈0 = e₁)
        E0 = 0.0
        e1 = context.e1_resolution or context.e_resolution  # e₁ for zero step
        if norm_steps and norm_steps[0]["L"] < e1:
            step0 = norm_steps[0]
            I0 = step0["I"]
            dL0 = step0["dL"]
            L0 = step0["L"]
            E0 = (I0 + 0.5 * e1 - dL0) - L0

        rows = []
        any_fail = False

        for step in norm_steps:
            L = step["L"]
            I = step["I"]
            dL = step["dL"]

            # Resolve active e_i for this load step (multi-interval aware)
            active_e = self._resolve_e_for_load(L, context)

            # CALC_ERROR_CHANGEOVER (§A.4.4.3) — uses active e_i
            P = I + (0.5 * active_e if dL > 0 else 0.0) - dL
            E = P - L if dL > 0 else (I - L)

            # CALC_CORRECTED_ERROR
            Ec = E - E0

            # MPE_INIT — Table 6 — multi-interval aware
            mpe_result = self.mpe_engine.calculate_mpe(
                accuracy_class=context.accuracy_class,
                load=L,
                e_resolution=context.e_resolution,
                unit=context.unit,
                verification_type=verification_type,
                intervals=context.weighing_intervals
            )

            pass_fail = "PASS" if abs(Ec) <= mpe_result.mpe_value else "FAIL"
            if pass_fail == "FAIL":
                any_fail = True

            rows.append({
                "L": L,
                "I": I,
                "dL": dL,
                "P": round(P, 6),
                "E": round(E, 6),
                "E0": round(E0, 6),
                "Ec": round(Ec, 6),
                "active_e": active_e,
                "mpe_e": mpe_result.mpe_e,
                "mpe_value": round(mpe_result.mpe_value, 6),
                "rule_id": mpe_result.rule_id,
                "section": "A.4.4.3 & 3.5.1",
                "result": pass_fail
            })

        overall = "FAIL" if any_fail else ("PASS" if rows else "INCOMPLETE")
        return {
            "status": overall,
            "E0": round(E0, 6),
            "e": context.e_resolution,
            "e1": e1,
            "multi_interval": context.weighing_intervals is not None,
            "verification_type": verification_type,
            "rows": rows,
            "rule_references": [
                {"rule_id": "CALC_ERROR_CHANGEOVER", "section": "A.4.4.3", "page": 88, "standard": "OIML R 76-1", "edition": "2006 (E)"},
                {"rule_id": "CALC_CORRECTED_ERROR", "section": "A.4.4.3", "page": 89, "standard": "OIML R 76-1", "edition": "2006 (E)"},
                {"rule_id": "MPE_INIT", "section": "3.5.1", "table": "Table 6", "page": 30, "standard": "OIML R 76-1", "edition": "2006 (E)"}
            ]
        }

    def _calculate_repeatability_test(
        self,
        context: EvaluationContext,
        observations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Repeatability test (TEST-A.4.10) — OIML R 76-1 §A.4.10 & §3.6.1
        Supports multiple independent load sets (e.g. Set 1 at ~50% Max, Set 2 at ~Max).
        For each load set:
            Range = I_max - I_min
            PASS if Range <= |MPE(L)| for that specific test load.
        MPE and active e resolved per-interval for multi-interval instruments.
        """
        load_groups = extract_repeatability_load_sets(observations, context)
        if not load_groups:
            return {"status": "ERROR", "message": "At least 2 valid numeric readings required per load set.", "load_sets": []}

        sets_result = []
        any_fail = False

        for g in load_groups:
            load_val = g["test_load"]
            readings_f = g["readings"]
            if len(readings_f) < 2:
                sets_result.append({
                    "set_index": g["set_index"],
                    "test_load": load_val,
                    "status": "ERROR",
                    "message": "At least 2 valid readings required for this load set."
                })
                any_fail = True
                continue

            active_e = g["active_e"]
            I_max = max(readings_f)
            I_min = min(readings_f)
            range_val = I_max - I_min
            mpe_result = g["mpe_result"]

            pass_fail = "PASS" if range_val <= abs(mpe_result.mpe_value) else "FAIL"
            if pass_fail == "FAIL":
                any_fail = True

            sets_result.append({
                "set_index": g["set_index"],
                "test_load": load_val,
                "active_e": active_e,
                "readings": readings_f,
                "I_max": round(I_max, 6),
                "I_min": round(I_min, 6),
                "range": round(range_val, 6),
                "mpe_value": round(mpe_result.mpe_value, 6),
                "mpe_e": mpe_result.mpe_e,
                "n_readings": len(readings_f),
                "result": pass_fail
            })

        overall = "FAIL" if any_fail else ("PASS" if sets_result else "INCOMPLETE")
        first_set = sets_result[0] if sets_result else {}

        return {
            "status": overall,
            "test_load": first_set.get("test_load"),
            "active_e": first_set.get("active_e"),
            "readings": first_set.get("readings"),
            "I_max": first_set.get("I_max"),
            "I_min": first_set.get("I_min"),
            "range": first_set.get("range"),
            "mpe_value": first_set.get("mpe_value"),
            "mpe_e": first_set.get("mpe_e"),
            "n_readings": first_set.get("n_readings"),
            "load_sets": sets_result,
            "rows": sets_result,
            "rule_references": [
                {"rule_id": "CALC_REPEATABILITY_RANGE", "section": "3.6.1 & A.4.10", "page": 31, "standard": "OIML R 76-1", "edition": "2006 (E)"},
                {"rule_id": "REPEATABILITY_LIMIT", "section": "3.6.1", "page": 33, "standard": "OIML R 76-1", "edition": "2006 (E)"}
            ]
        }

    def _calculate_tilting_test(
        self,
        context: EvaluationContext,
        observations: Dict[str, Any],
        test_def: dict
    ) -> Dict[str, Any]:
        """
        Tilting test (TEST-A.4.11.1) — OIML R 76-1 §A.5.1 & §3.9.1
        Computes position-wise unrounded indications P_v, zero-corrected indications P_v_0,
        and corrected errors Ec for each position entry in positions array.
        PASS if |Ec| <= MPE(L) for each position.
        """
        if isinstance(observations, dict) and "observations" in observations and isinstance(observations["observations"], dict):
            observations = observations["observations"]

        observations = normalize_observation_payload(observations)
        positions = extract_tilting_positions(observations, context)

        if not positions:
            return {"status": "ERROR", "message": "No valid tilt position observations provided.", "positions": []}

        rows = []
        any_fail = False

        for p in positions:
            if p["result"] == "FAIL":
                any_fail = True

            rows.append({
                "step_index": p["step_index"],
                "position_label": p["position_label"],
                "tilt_angle": p["tilt_angle"],
                "L": p["L"],
                "I": p["I"],
                "dL": p["dL"],
                "P_v": round(p["P_v"], 6),
                "P_v_0": round(p["P_v_0"], 6),
                "E0": round(p["E0"], 6),
                "Ec": round(p["Ec"], 6),
                "active_e": p["active_e"],
                "mpe_e": p["mpe_result"].mpe_e,
                "mpe_value": round(p["mpe_result"].mpe_value, 6),
                "rule_id": p["mpe_result"].rule_id,
                "result": p["result"]
            })

        overall = "FAIL" if any_fail else ("PASS" if rows else "INCOMPLETE")
        E0_val = positions[0]["E0"] if positions else 0.0

        return {
            "status": overall,
            "E0": round(E0_val, 6),
            "positions": rows,
            "rows": rows,
            "rule_references": [
                {"rule_id": "CALC_TILTING_TEST", "section": "A.5.1 & 3.9.1", "page": 95, "standard": "OIML R 76-1", "edition": "2006 (E)"},
                {"rule_id": "TILTING_LIMIT", "section": "3.9.1", "page": 35, "standard": "OIML R 76-1", "edition": "2006 (E)"}
            ]
        }

    def _calculate_zero_return_test(
        self,
        context: EvaluationContext,
        observations: Dict[str, Any],
        test_def: dict
    ) -> Dict[str, Any]:
        """
        Zero return test (TEST-A.4.11.2) — OIML R 76-1 §A.4.11.2 & §3.9.4.2
        Computes step-wise unrounded indication P = I + 0.5*e - dL,
        zero-return variation delta_P = |P_end - P_start|, and checks against limit = 0.5 * e1.
        PASS if delta_P <= 0.5 * e1.
        """
        if isinstance(observations, dict) and "observations" in observations and isinstance(observations["observations"], dict):
            observations = observations["observations"]

        observations = normalize_observation_payload(observations)
        info = extract_zero_return_steps(observations, context)

        if not info:
            return {"status": "ERROR", "message": "No valid zero-return observations provided.", "rows": []}

        pass_fail = info.get("result", "FAIL")
        delta_P = info.get("delta_P", 0.0)
        limit_val = info.get("allowed_limit", 0.0)
        e1 = info.get("e1", context.e1_resolution or context.e_resolution)
        steps = info.get("steps", [])

        rows = []
        for s in steps:
            rows.append({
                "step_index": s["step_index"],
                "L": s["L"],
                "I": s["I"],
                "dL": s["dL"],
                "P": round(s["P"], 6),
                "active_e": s["active_e"],
                "note": s.get("note", "")
            })

        return {
            "status": pass_fail,
            "P_start": round(info.get("P_start", 0.0), 6),
            "P_end": round(info.get("P_end", 0.0), 6),
            "delta_P": delta_P,
            "allowed_limit": limit_val,
            "e1": e1,
            "steps": steps,
            "rows": rows,
            "rule_references": [
                {"rule_id": "CALC_ZERO_RETURN", "section": "A.4.11.2 & 3.9.4.2", "page": 93, "standard": "OIML R 76-1", "edition": "2006 (E)"},
                {"rule_id": "ZERO_RETURN_LIMIT", "section": "3.9.4.2", "page": 36, "standard": "OIML R 76-1", "edition": "2006 (E)"}
            ]
        }

    def _calculate_stability_of_equilibrium_test(
        self,
        context: EvaluationContext,
        observations: Dict[str, Any],
        test_def: dict
    ) -> Dict[str, Any]:
        """
        Stability of equilibrium test (TEST-A.4.12) — OIML R 76-1 §A.4.12 & §4.4.2
        Computes reading-wise unrounded indication P = I + 0.5*e - dL,
        error E = P - L (or E0 = P - 0), and checks against limit = 0.25 * e1.
        PASS if all readings have |E| <= 0.25 * e1.
        """
        if isinstance(observations, dict) and "observations" in observations and isinstance(observations["observations"], dict):
            observations = observations["observations"]

        observations = normalize_observation_payload(observations)
        info = extract_stability_readings(observations, context)

        if not info:
            return {"status": "ERROR", "message": "No valid stability of equilibrium observations provided.", "rows": []}

        pass_fail = info.get("result", "FAIL")
        e1 = info.get("e1", context.e1_resolution or context.e_resolution)
        limit_val = info.get("allowed_limit", 0.25 * (e1 or 0.001))
        readings = info.get("readings", [])

        rows = []
        for r in readings:
            rows.append({
                "time_label": r.get("time_label", f"Reading {r['reading_index']}"),
                "L": r["L"],
                "I": r["I"],
                "dL": r["dL"],
                "P": round(r["P"], 6),
                "error": round(r["error"], 6),
                "limit": limit_val,
                "result": r["result"],
                "active_e": r["active_e"],
                "note": r.get("note", "")
            })

        return {
            "status": pass_fail,
            "allowed_limit": limit_val,
            "e1": e1,
            "readings": readings,
            "rows": rows,
            "rule_references": [
                {"rule_id": "CALC_STABILITY_OF_EQUILIBRIUM", "section": "A.4.12 & 4.4.2", "page": 93, "standard": "OIML R 76-1", "edition": "2006 (E)"},
                {"rule_id": "STABILITY_LIMIT", "section": "4.4.2 & A.4.12", "page": 40, "standard": "OIML R 76-1", "edition": "2006 (E)"}
            ]
        }

    def _calculate_eccentricity_test(
        self,
        context: EvaluationContext,
        observations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Eccentricity test (TEST-A.4.7) — OIML R 76-1 §A.4.7 & §3.6.2
        For each load position:
            E = P - L   (using changeover method; e_i resolved per load)
            Ec = E - E0
        PASS if |Ec| <= MPE(L) for applied test load.
        """
        if isinstance(observations, dict) and "observations" in observations and isinstance(observations["observations"], dict):
            observations = observations["observations"]

        positions = observations.get("positions") or observations.get("load_steps") or observations.get("readings") or []
        E0 = float(observations.get("E0", 0.0))

        if not positions:
            return {"status": "ERROR", "message": "No load positions provided.", "rows": []}

        rows = []
        any_fail = False

        for pos in positions:
            position_id = pos.get("position", "unknown")
            L = float(pos.get("L") if pos.get("L") is not None else (pos.get("load") if pos.get("load") is not None else pos.get("applied_load", 0.0)))
            I = float(pos.get("I") if pos.get("I") is not None else (pos.get("indication") if pos.get("indication") is not None else pos.get("indicated_value", 0.0)))
            dL = float(pos.get("dL", 0.0))

            # Resolve active e_i for this load (multi-interval aware)
            active_e = self._resolve_e_for_load(L, context)

            # CALC_ERROR_CHANGEOVER — uses active e_i
            P = I + (0.5 * active_e if dL > 0 else 0.0) - dL
            E = P - L if dL > 0 else (I - L)
            Ec = E - E0

            # MPE for this load — multi-interval aware
            mpe_result = self.mpe_engine.calculate_mpe(
                accuracy_class=context.accuracy_class,
                load=L,
                e_resolution=context.e_resolution,
                unit=context.unit,
                verification_type="initial",
                intervals=context.weighing_intervals
            )

            pass_fail = "PASS" if abs(Ec) <= mpe_result.mpe_value else "FAIL"
            if pass_fail == "FAIL":
                any_fail = True

            rows.append({
                "position": position_id,
                "L": L,
                "I": I,
                "dL": dL,
                "P": round(P, 6),
                "E": round(E, 6),
                "E0": round(E0, 6),
                "Ec": round(Ec, 6),
                "active_e": active_e,
                "mpe_value": round(mpe_result.mpe_value, 6),
                "mpe_e": mpe_result.mpe_e,
                "result": pass_fail
            })

        overall = "FAIL" if any_fail else ("PASS" if rows else "INCOMPLETE")
        return {
            "status": overall,
            "E0": round(E0, 6),
            "e": context.e_resolution,
            "multi_interval": context.weighing_intervals is not None,
            "rows": rows,
            "rule_references": [
                {"rule_id": "CALC_ERROR_CHANGEOVER", "section": "A.4.7", "page": 90, "standard": "OIML R 76-1", "edition": "2006 (E)"},
                {"rule_id": "ECCENTRICITY_LIMIT", "section": "3.6.2", "page": 31, "standard": "OIML R 76-1", "edition": "2006 (E)"}
            ]
        }

    def _calculate_discrimination_test(
        self,
        context: EvaluationContext,
        observations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Discrimination test (TEST-A.4.8.2) — OIML R 76-1 §A.4.8.2 & §3.8.2.2
        Extra load = 1.4 * d  (CALC_DISCRIMINATION_LOAD)
        PASS if indication changes from I to I+d after adding 1.4d extra load.
        DISCRIMINATION_CRITERIA: indication_after_1_4d == initial_indication + d
        """
        if isinstance(observations, dict) and "observations" in observations and isinstance(observations["observations"], dict):
            observations = observations["observations"]

        d = context.d_resolution
        extra_load = round(1.4 * d, 8)
        points = (
            observations.get("test_points") or
            observations.get("rows") or
            observations.get("readings") or
            observations.get("load_steps") or
            []
        )

        if not points:
            return {"status": "ERROR", "message": "No test points provided.", "rows": []}

        rows = []
        any_fail = False

        for pt in points:
            load_label = pt.get("load_label", "Unknown")
            L = float(pt.get("L") if pt.get("L") is not None else (pt.get("load") if pt.get("load") is not None else pt.get("test_load", 0.0)))
            I_before = float(pt.get("I_before", 0.0))
            I_after = float(pt.get("I_after", 0.0))

            # DISCRIMINATION_CRITERIA: I_after must equal I_before + d
            expected_after = round(I_before + d, 8)
            # Allow tolerance of d/2 due to digitization
            passed = abs(I_after - expected_after) <= d / 2

            if not passed:
                any_fail = True

            rows.append({
                "load_label": load_label,
                "L": L,
                "I_before": I_before,
                "I_after": I_after,
                "expected_after": round(expected_after, 8),
                "extra_load_applied": extra_load,
                "d": d,
                "result": "PASS" if passed else "FAIL"
            })

        overall = "FAIL" if any_fail else ("PASS" if rows else "INCOMPLETE")
        return {
            "status": overall,
            "d": d,
            "extra_load": extra_load,
            "rows": rows,
            "rule_references": [
                {"rule_id": "CALC_DISCRIMINATION_LOAD", "section": "3.8.2.2 & A.4.8.2", "page": 32, "standard": "OIML R 76-1", "edition": "2006 (E)"}
            ]
        }

    def _calculate_zero_setting_accuracy_test(
        self,
        context: EvaluationContext,
        observations: Dict[str, Any],
        test_def: dict
    ) -> Dict[str, Any]:
        """
        Accuracy of zero-setting test calculator (TEST-A.4.2.3) — OIML R 76-1 §A.4.2.3 & §4.5.2

        Calculates unrounded true error prior to rounding:
            E = I + 0.5 * e1 - dL - L

        MPE limit:
            MPE = ±0.25 * e1
        """
        if isinstance(observations, dict) and "observations" in observations and isinstance(observations["observations"], dict):
            observations = observations["observations"]

        steps = observations.get("steps") or observations.get("rows") or observations.get("load_steps") or []
        first_step = steps[0] if steps and isinstance(steps[0], dict) else {}

        # 1. Extract applied load L without hardcoding L=0
        L_val = observations.get("L")
        if L_val is None:
            L_val = observations.get("load")
        if L_val is None:
            L_val = observations.get("applied_load")
        if L_val is None:
            L_val = observations.get("test_load")
        if L_val is None and first_step:
            L_val = first_step.get("L") if first_step.get("L") is not None else first_step.get("load")
        L = float(L_val) if L_val is not None else 0.0

        # 2. Extract indicated value I
        I_val = observations.get("I")
        if I_val is None:
            I_val = observations.get("indication")
        if I_val is None:
            I_val = observations.get("indicated_value")
        if I_val is None:
            I_val = observations.get("initial_indication")
        if I_val is None and first_step:
            I_val = first_step.get("I") if first_step.get("I") is not None else first_step.get("indication")
        I = float(I_val) if I_val is not None else 0.0

        # 3. Extract changeover dL
        dL_val = observations.get("dL")
        if dL_val is None:
            dL_val = observations.get("changeover")
        if dL_val is None:
            dL_val = observations.get("additional_weight")
        if dL_val is None:
            dL_val = observations.get("additional_weight_changeover")
        if dL_val is None and first_step:
            dL_val = first_step.get("dL")
        dL = float(dL_val) if dL_val is not None else 0.0

        # Scale interval e1 (OIML §4.5.2)
        e1 = context.e1_resolution or context.e_resolution

        # Unrounded true error calculation: E = I + 0.5*e1 - dL - L
        P = I + 0.5 * e1 - dL
        E = P - L

        # MPE limit calculation: ±0.25 * e1 (OIML §4.5.2)
        mpe_e = 0.25
        mpe_value = 0.25 * e1

        passed = abs(E) <= mpe_value

        return {
            "status": "PASS" if passed else "FAIL",
            "test_id": "TEST-A.4.2.3",
            "test_name": test_def.get("test_name", "Accuracy of zero-setting"),
            "L": L,
            "I": I,
            "dL": dL,
            "e": context.e_resolution,
            "e1": e1,
            "P": P,
            "E": E,
            "mpe_e": mpe_e,
            "mpe_value": mpe_value,
            "formula": "E = I + 0.5*e1 - dL - L",
            "rows": [
                {
                    "L": L,
                    "I": I,
                    "dL": dL,
                    "P": P,
                    "E": E,
                    "E0": E,
                    "Ec": E,
                    "active_e": e1,
                    "mpe_value": mpe_value,
                    "mpe_e": mpe_e,
                    "formula": "E = I + 0.5*e1 - dL - L",
                    "limit_val": mpe_value,
                    "rule_id": "ZERO_SETTING_ACCURACY",
                    "section": "A.4.2.3 & 4.5.2",
                    "result": "PASS" if passed else "FAIL"
                }
            ],
            "rule_references": [
                {
                    "rule_id": "ZERO_SETTING_ACCURACY",
                    "section": "A.4.2.3 & 4.5.2",
                    "page": 87,
                    "standard": "OIML R 76-1",
                    "edition": "2006 (E)"
                }
            ]
        }

    def _calculate_zero_setting_test(
        self,
        context: EvaluationContext,
        observations: Dict[str, Any],
        test_def: dict
    ) -> Dict[str, Any]:
        """
        Zero setting range test calculator (TEST-A.4.2.1) — OIML R 76-1 §A.4.2.1 & §4.5.1
        """
        if isinstance(observations, dict) and "observations" in observations and isinstance(observations["observations"], dict):
            observations = observations["observations"]

        Max = context.max_capacity
        e1 = context.e1_resolution or context.e_resolution
        zero_type = observations.get("zero_setting_type", "initial")

        pos_pct = float(observations.get("positive_range") if observations.get("positive_range") is not None else observations.get("positive_limit_percent", 4.0))
        neg_pct = float(observations.get("negative_range") if observations.get("negative_range") is not None else observations.get("negative_limit_percent", 1.0))

        steps = observations.get("steps") or observations.get("rows") or observations.get("load_steps") or []
        first_step = steps[0] if steps and isinstance(steps[0], dict) else {}

        dL_val = observations.get("dL") if observations.get("dL") is not None else observations.get("additional_weight_changeover")
        if dL_val is None:
            dL_val = first_step.get("dL", 0.02)
        dL = float(dL_val)

        ind_val = observations.get("initial_indication") if observations.get("initial_indication") is not None else observations.get("initial_no_load_indication")
        if ind_val is None:
            ind_val = first_step.get("I", first_step.get("indication", observations.get("E0", 0.0)))
        initial_ind = float(ind_val)

        total_pct = pos_pct + neg_pct
        max_allowed_pct = 20.0 if zero_type == "initial" else 4.0

        pos_kg = (pos_pct / 100.0) * Max
        neg_kg = (neg_pct / 100.0) * Max
        max_allowed_kg = (max_allowed_pct / 100.0) * Max

        passed = (total_pct <= max_allowed_pct) or (pos_pct <= max_allowed_pct and neg_pct <= max_allowed_pct)

        E0 = round((initial_ind + 0.5 * e1 - dL) if dL > 0 else initial_ind, 6)

        return {
            "status": "PASS" if passed else "FAIL",
            "Max": Max,
            "e": context.e_resolution,
            "e1": e1,
            "multi_interval": context.weighing_intervals is not None,
            "zero_setting_type": zero_type,
            "positive_range_percent": pos_pct,
            "negative_range_percent": neg_pct,
            "total_range_percent": round(total_pct, 2),
            "positive_range_kg": round(pos_kg, 4),
            "negative_range_kg": round(neg_kg, 4),
            "max_allowed_percent": max_allowed_pct,
            "max_allowed_kg": round(max_allowed_kg, 4),
            "E0": E0,
            "rows": [
                {
                    "L": 0,
                    "I": initial_ind,
                    "dL": dL,
                    "P": round(initial_ind + (0.5 * e1 if dL > 0 else 0.0) - dL, 6),
                    "E": E0,
                    "E0": E0,
                    "Ec": E0,
                    "active_e": e1,
                    "mpe_value": round(max_allowed_kg, 4),
                    "mpe_e": round(max_allowed_pct, 1),
                    "result": "PASS" if passed else "FAIL"
                }
            ],
            "rule_references": [
                {"rule_id": "VAL_ZERO_SETTING_RANGE", "section": "4.5.1 & A.4.2.1", "page": 48, "standard": "OIML R 76-1", "edition": "2006 (E)"}
            ]
        }

    async def calculate_test(
        self,
        evaluation_id: str,
        test_id: str,
        caller: AuthenticatedUser
    ) -> dict:
        """Runs the rule evaluator pipeline for a specific test and persists results.
        Returns a structured dict with status and calculation details.
        """
        evaluation = await self.get_evaluation_detail(evaluation_id, caller)
        inst = evaluation.get("instruments") or {}
        context = self._build_context_from_instrument(inst)

        # Get test row
        test_row = next((t for t in evaluation["test_results"] if t["test_id"] == test_id), None)
        if not test_row:
            raise HTTPException(status_code=404, detail=f"Test '{test_id}' not found in evaluation.")

        # Get observations
        obs_res = (
            self.client.table("test_observations")
            .select("observations")
            .eq("evaluation_id", evaluation_id)
            .eq("test_result_id", test_row["id"])
            .execute()
        )
        observations = obs_res.data[0]["observations"] if obs_res.data else {}
        if isinstance(observations, dict) and "observations" in observations and isinstance(observations["observations"], dict):
            observations = observations["observations"]
        observations = normalize_observation_payload(observations)

        test_def = self.loader.get_test(test_id) or {}

        # Development-only engine input log
        print(
            f"[OIML ENGINE INPUT]\n"
            f"test_code: {test_id}\n"
            f"instrument_id: {context.instrument_id}\n"
            f"Max: {context.max_capacity}\n"
            f"Min: {context.min_capacity}\n"
            f"e: {context.e_resolution}\n"
            f"d: {context.d_resolution}\n"
            f"normalized observations: {observations}"
        )

        # ── Specialized calculators (backed by OIML rule data) ─────────────
        specialized_result = None

        if test_id in ("TEST-A.4.4.1", "weighing_test"):
            specialized_result = self._calculate_weighing_test(context, observations, test_def)
        elif test_id in ("TEST-A.4.10", "repeatability_test"):
            specialized_result = self._calculate_repeatability_test(context, observations)
        elif test_id in ("TEST-A.4.7", "eccentricity_test"):
            specialized_result = self._calculate_eccentricity_test(context, observations)
        elif test_id in ("TEST-A.4.8.2", "discrimination_test"):
            specialized_result = self._calculate_discrimination_test(context, observations)
        elif test_id in ("TEST-A.4.6.1", "tare_test"):
            specialized_result = self._calculate_weighing_test(context, observations, test_def)
        elif test_id in ("TEST-A.4.2.1", "zero_setting_test"):
            specialized_result = self._calculate_zero_setting_test(context, observations, test_def)
        elif test_id == "TEST-A.4.2.3":
            specialized_result = self._calculate_zero_setting_accuracy_test(context, observations, test_def)
        elif test_id in ("TEST-A.4.11.1", "TEST-A.5.1", "tilting_test"):
            specialized_result = self._calculate_tilting_test(context, observations, test_def)
        elif test_id in ("TEST-A.4.11.2", "zero_return_test"):
            specialized_result = self._calculate_zero_return_test(context, observations, test_def)
        elif test_id in ("TEST-A.4.12", "stability_of_equilibrium_test", "stability_test"):
            specialized_result = self._calculate_stability_of_equilibrium_test(context, observations, test_def)

        if specialized_result:
            calc_status = specialized_result.get("status", "ERROR")
            if calc_status == "PASS":
                final_status = "PASS"
            elif calc_status == "FAIL":
                final_status = "FAIL"
            elif calc_status == "INCOMPLETE":
                final_status = "IN_PROGRESS"
            else:
                final_status = "IN_PROGRESS"

            self.client.table("evaluation_test_results").update({
                "status": final_status,
                "summary_message": f"Calculated: {calc_status}. {specialized_result.get('message', '')}",
                "calculated_at": datetime.utcnow().isoformat()
            }).eq("id", test_row["id"]).execute()

            # Persist calculation result as a single JSONB row
            self.client.table("calculation_results").delete().eq("test_result_id", test_row["id"]).execute()

            calc_row = {
                "evaluation_id": evaluation_id,
                "test_result_id": test_row["id"],
                "laboratory_id": caller.laboratory_id,
                "calculation_id": test_id,
                "name": test_def.get("test_name", test_id),
                "formula": "Specialized OIML R-76 engine calculation",
                "inputs": observations,
                "output": specialized_result,
                "decision": final_status,
                "limit_val": None,
                "source": {"standard": "OIML R 76-1", "edition": "2006 (E)"}
            }
            self.client.table("calculation_results").insert(calc_row).execute()

            return {
                "test_id": test_id,
                "test_name": test_def.get("test_name", test_id),
                "status": final_status,
                "calculations": specialized_result,
                "rule_references": specialized_result.get("rule_references", [])
            }

        # ── Generic evaluator for other tests ─────────────────────────────
        result = self.evaluator.evaluate_test(
            test_id=test_id,
            context=context,
            observations=observations,
            manual_result=test_row.get("manual_result")
        )

        # Persist test result updates
        self.client.table("evaluation_test_results").update({
            "status": result.status.value,
            "summary_message": result.summary_message,
            "calculated_at": datetime.utcnow().isoformat()
        }).eq("id", test_row["id"]).execute()

        # Delete existing calculations & validations, re-insert
        self.client.table("calculation_results").delete().eq("test_result_id", test_row["id"]).execute()
        self.client.table("validation_results").delete().eq("test_result_id", test_row["id"]).execute()

        calc_rows = []
        for c in result.calculations:
            calc_rows.append({
                "evaluation_id": evaluation_id,
                "test_result_id": test_row["id"],
                "laboratory_id": caller.laboratory_id,
                "calculation_id": c.calculation_id,
                "name": c.name,
                "formula": c.formula,
                "inputs": c.inputs,
                "output": c.output,
                "decision": c.decision,
                "limit_val": str(c.limit) if c.limit is not None else None,
                "source": c.source
            })
        if calc_rows:
            self.client.table("calculation_results").insert(calc_rows).execute()

        val_rows = []
        for v in result.validations:
            val_rows.append({
                "evaluation_id": evaluation_id,
                "test_result_id": test_row["id"],
                "laboratory_id": caller.laboratory_id,
                "rule_id": v.rule_id,
                "param_name": v.param_name,
                "status": v.status,
                "message": v.message
            })
        if val_rows:
            self.client.table("validation_results").insert(val_rows).execute()

        return result.dict()

    async def get_test_detail(self, evaluation_id: str, test_id: str, caller: AuthenticatedUser) -> dict:
        """Retrieves test result with observations, calculations, and validations."""
        test_res = (
            self.client.table("evaluation_test_results")
            .select("*")
            .eq("evaluation_id", evaluation_id)
            .eq("test_id", test_id)
            .eq("laboratory_id", caller.laboratory_id)
            .execute()
        )
        if not test_res.data:
            raise HTTPException(status_code=404, detail="Test result record not found.")

        row = test_res.data[0]

        obs_res = (
            self.client.table("test_observations")
            .select("observations")
            .eq("test_result_id", row["id"])
            .execute()
        )
        row["observations"] = obs_res.data[0]["observations"] if obs_res.data else {}

        calc_res = (
            self.client.table("calculation_results")
            .select("*")
            .eq("test_result_id", row["id"])
            .execute()
        )
        row["calculations"] = calc_res.data or []

        val_res = (
            self.client.table("validation_results")
            .select("*")
            .eq("test_result_id", row["id"])
            .execute()
        )
        row["validations"] = val_res.data or []

        return row

    async def complete_test(
        self,
        evaluation_id: str,
        test_id: str,
        manual_result: Optional[str],
        comment: Optional[str],
        caller: AuthenticatedUser
    ) -> dict:
        """Updates manual result and comment for a test."""
        test_row = await self.get_test_detail(evaluation_id, test_id, caller)

        status_val = test_row["status"]
        if manual_result:
            if manual_result.upper() == "PASS":
                status_val = "PASS"
            elif manual_result.upper() == "FAIL":
                status_val = "FAIL"
            elif manual_result.upper() in ("N/A", "NOT_APPLICABLE"):
                status_val = "NOT_APPLICABLE"

        self.client.table("evaluation_test_results").update({
            "manual_result": manual_result,
            "comment": comment,
            "status": status_val,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", test_row["id"]).execute()

        return await self.get_test_detail(evaluation_id, test_id, caller)

    async def finalize_evaluation(self, evaluation_id: str, caller: AuthenticatedUser) -> dict:
        """Finalizes evaluation and computes overall PASS / FAIL / REQUIRES_REVIEW status."""
        evaluation = await self.get_evaluation_detail(evaluation_id, caller)
        test_results = evaluation.get("test_results", [])

        # Count statuses among applicable tests
        applicable = [
            t for t in test_results
            if str(t.get("applicability_status") or t.get("applicability") or "").upper() != "NOT_APPLICABLE"
            and str(t.get("status") or "").upper() != "NOT_APPLICABLE"
        ]
        passed = sum(1 for t in applicable if str(t.get("status", "")).upper() == "PASS")
        failed = sum(1 for t in applicable if str(t.get("status", "")).upper() == "FAIL")
        review = sum(1 for t in applicable if str(t.get("status", "")).upper() in ("MANUAL_REVIEW", "IN_PROGRESS", "NOT_STARTED"))

        if failed > 0:
            overall_status = "failed"
        elif review > 0:
            overall_status = "requires_review"
        else:
            overall_status = "passed"

        overall_data = {
            "total": len(test_results),
            "applicable": len(applicable),
            "passed": passed,
            "failed": failed,
            "review": review,
            "status": overall_status,
            "finalized_by": caller.user_id,
            "finalized_at": datetime.utcnow().isoformat()
        }

        eval_update = {
            "status": overall_status,
            "overall_result": overall_data,
            "completed_at": datetime.utcnow().isoformat()
        }
        if caller.role in ("owner", "admin"):
            eval_update["approved_by"] = caller.user_id
            eval_update["approved_at"] = datetime.utcnow().isoformat()

        self._safe_update("evaluations", eval_update, "id", evaluation_id)

        return await self.get_evaluation_detail(evaluation_id, caller)
