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
from app.engine.models import EvaluationContext, TestResult, ApplicabilityStatus, TestExecutionStatus
from app.engine.evaluator import RuleEvaluator
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
        capacity = float(inst.get("capacity") or inst.get("max_capacity") or 100.0)
        e = float(inst.get("verification_scale_interval_e") or inst.get("verification_scale_interval") or inst.get("e_resolution") or 0.05)
        d = float(inst.get("scale_interval_d") or inst.get("actual_scale_interval") or inst.get("d_resolution") or e)

        return EvaluationContext(
            instrument_id=inst["id"],
            serial_number=inst.get("serial_number"),
            manufacturer=inst.get("manufacturer"),
            model=inst.get("model_designation") or inst.get("model"),
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
            is_electronic=inst.get("is_electronic", True)
        )

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
        Weighing test (TEST-A.4.4.1) — OIML R 76-1 §A.4.4.3
        For each load step {L, I, dL}:
            P = I + 0.5*e - dL   (indication prior to rounding, CALC_ERROR_CHANGEOVER)
            E = P - L            (uncorrected error)
            Ec = E - E0          (corrected error, CALC_CORRECTED_ERROR)
        PASS if |Ec| <= MPE for each load step.
        MPE determined by MPE_INIT rule (Table 6).
        """
        load_steps = observations.get("load_steps") or observations.get("readings") or []
        e = context.e_resolution
        verification_type = observations.get("verification_type", "initial")

        if not load_steps:
            return {"status": "ERROR", "message": "No load steps provided.", "rows": []}

        # Normalize steps: ensure L, I, dL fields are present
        norm_steps = []
        for step in load_steps:
            if isinstance(step, dict):
                L_val = float(step.get("L") if step.get("L") is not None else step.get("load", 0.0))
                I_val = float(step.get("I") if step.get("I") is not None else step.get("indication", 0.0))
                dL_val = float(step.get("dL", 0.0))
                norm_steps.append({"L": L_val, "I": I_val, "dL": dL_val})

        # E0 — error at zero (first row if L ≈ 0, else 0)
        E0 = 0.0
        if norm_steps and norm_steps[0]["L"] < e:
            step0 = norm_steps[0]
            I0 = step0["I"]
            dL0 = step0["dL"]
            L0 = step0["L"]
            E0 = (I0 + 0.5 * e - dL0) - L0

        rows = []
        any_fail = False

        for step in norm_steps:
            L = step["L"]
            I = step["I"]
            dL = step["dL"]

            # CALC_ERROR_CHANGEOVER (§A.4.4.3)
            P = I + (0.5 * e if dL > 0 else 0.0) - dL
            E = P - L if dL > 0 else (I - L)

            # CALC_CORRECTED_ERROR
            Ec = E - E0

            # MPE_INIT — Table 6 — from mpe_rules.json
            mpe_result = self.mpe_engine.calculate_mpe(
                accuracy_class=context.accuracy_class,
                load=L,
                e_resolution=e,
                unit=context.unit,
                verification_type=verification_type
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
            "e": e,
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
        Range = I_max - I_min
        PASS if Range <= |MPE| for that load.
        Limit from REPEATABILITY_LIMIT rule (mpe_rules.json §3.6.1).
        """
        test_load = float(observations.get("test_load", context.max_capacity * 0.5))
        readings = observations.get("readings", [])

        e = context.e_resolution
        readings_f = []

        for r in readings:
            if isinstance(r, dict):
                ind = r.get("indication") if r.get("indication") is not None else (
                    r.get("I") if r.get("I") is not None else (
                        r.get("val") if r.get("val") is not None else (
                            r.get("value") if r.get("value") is not None else (
                                r.get("reading")
                            )
                        )
                    )
                )
                if ind is not None and str(ind).strip() != "":
                    try:
                        I_val = float(ind)
                        dL_raw = r.get("dL")
                        if dL_raw is not None and str(dL_raw).strip() != "":
                            P_val = I_val + 0.5 * e - float(dL_raw)
                            readings_f.append(P_val)
                        else:
                            readings_f.append(I_val)
                    except (ValueError, TypeError):
                        pass
            elif r is not None and str(r).strip() != "":
                try:
                    readings_f.append(float(r))
                except (ValueError, TypeError):
                    pass

        if not readings_f or len(readings_f) < 2:
            return {"status": "ERROR", "message": "At least 2 valid numeric readings required.", "readings": []}

        I_max = max(readings_f)
        I_min = min(readings_f)
        range_val = I_max - I_min

        # MPE for test load — REPEATABILITY_LIMIT says Range <= |mpe| for that load
        mpe_result = self.mpe_engine.calculate_mpe(
            accuracy_class=context.accuracy_class,
            load=test_load,
            e_resolution=context.e_resolution,
            unit=context.unit,
            verification_type="initial"
        )

        # CALC_REPEATABILITY_RANGE: Range <= |mpe|
        pass_fail = "PASS" if range_val <= abs(mpe_result.mpe_value) else "FAIL"

        return {
            "status": pass_fail,
            "test_load": test_load,
            "readings": readings_f,
            "I_max": round(I_max, 6),
            "I_min": round(I_min, 6),
            "range": round(range_val, 6),
            "mpe_value": round(mpe_result.mpe_value, 6),
            "mpe_e": mpe_result.mpe_e,
            "n_readings": len(readings_f),
            "rule_references": [
                {"rule_id": "CALC_REPEATABILITY_RANGE", "section": "3.6.1 & A.4.10", "page": 31, "standard": "OIML R 76-1", "edition": "2006 (E)"},
                {"rule_id": "REPEATABILITY_LIMIT", "section": "3.6.1", "page": 31, "standard": "OIML R 76-1", "edition": "2006 (E)"}
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
            E = P - L   (using changeover method)
            Ec = E - E0
        PASS if |Ec| <= MPE for applied test load (ECCENTRICITY_LIMIT §3.6.2).
        """
        positions = observations.get("positions", [])
        e = context.e_resolution
        E0 = float(observations.get("E0", 0.0))

        if not positions:
            return {"status": "ERROR", "message": "No load positions provided.", "rows": []}

        rows = []
        any_fail = False

        for pos in positions:
            position_id = pos.get("position", "unknown")
            L = float(pos.get("L") if pos.get("L") is not None else pos.get("load", 0.0))
            I = float(pos.get("I") if pos.get("I") is not None else pos.get("indication", 0.0))
            dL = float(pos.get("dL", 0.0))

            # CALC_ERROR_CHANGEOVER
            P = I + (0.5 * e if dL > 0 else 0.0) - dL
            E = P - L if dL > 0 else (I - L)
            Ec = E - E0

            # MPE for this load — ECCENTRICITY_LIMIT says error <= MPE for load
            mpe_result = self.mpe_engine.calculate_mpe(
                accuracy_class=context.accuracy_class,
                load=L,
                e_resolution=e,
                unit=context.unit,
                verification_type="initial"
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
                "mpe_value": round(mpe_result.mpe_value, 6),
                "mpe_e": mpe_result.mpe_e,
                "result": pass_fail
            })

        overall = "FAIL" if any_fail else ("PASS" if rows else "INCOMPLETE")
        return {
            "status": overall,
            "E0": round(E0, 6),
            "e": e,
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
        d = context.d_resolution
        extra_load = round(1.4 * d, 8)
        points = observations.get("test_points", [])

        if not points:
            return {"status": "ERROR", "message": "No test points provided.", "rows": []}

        rows = []
        any_fail = False

        for pt in points:
            load_label = pt.get("load_label", "Unknown")
            L = float(pt.get("L", 0.0))
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

        test_def = self.loader.get_test(test_id) or {}

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
        applicable = [t for t in test_results if t.get("applicability_status") != "NOT_APPLICABLE"]
        passed = sum(1 for t in applicable if t["status"] == "PASS")
        failed = sum(1 for t in applicable if t["status"] == "FAIL")
        review = sum(1 for t in applicable if t["status"] in ("MANUAL_REVIEW", "IN_PROGRESS", "NOT_STARTED"))

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

        self._safe_update("evaluations", {
            "status": overall_status,
            "overall_result": overall_data,
            "completed_at": datetime.utcnow().isoformat()
        }, "id", evaluation_id)

        return await self.get_evaluation_detail(evaluation_id, caller)
