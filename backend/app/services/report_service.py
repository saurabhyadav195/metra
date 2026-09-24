"""
METRA — app/services/report_service.py
Service for assembling comprehensive, official laboratory evaluation report data models.
Enforces laboratory tenant isolation and resolves authoritative laboratory and user profile metadata.
"""

from typing import Dict, Any
from fastapi import HTTPException
from supabase import Client

from app.deps import AuthenticatedUser
from app.services.evaluation_service import EvaluationService


class ReportService:
    def __init__(self, client: Client):
        self.client = client
        self.eval_service = EvaluationService(client)

    async def get_report_data(self, evaluation_id: str, caller: AuthenticatedUser) -> Dict[str, Any]:
        """Assembles comprehensive data payload for certificate/evaluation report generation."""
        evaluation = await self.eval_service.get_evaluation_detail(evaluation_id, caller)
        instrument = evaluation.get("instruments") or {}

        # 1. Fetch Laboratory Profile from database using evaluation's laboratory_id (with caller fallback)
        eval_lab_id = evaluation.get("laboratory_id") or (caller.laboratory_id if caller else None)
        lab_name = "Unknown Laboratory"
        lab_code = None
        lab_address = None
        lab_contact_email = None
        lab_contact_phone = None
        lab_accreditation = None
        if eval_lab_id:
            try:
                lab_res = self.client.table("laboratories").select("*").eq("id", eval_lab_id).execute()
                if lab_res.data:
                    lab_info = lab_res.data[0]
                    lab_name = lab_info.get("name") or lab_name
                    lab_code = lab_info.get("laboratory_code")
                    lab_address = lab_info.get("address")
                    lab_contact_email = lab_info.get("email")
                    lab_contact_phone = lab_info.get("phone")
                    lab_accreditation = lab_info.get("registration_number")
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"[ReportService] Failed to fetch laboratory {eval_lab_id}: {e}")

        # 2. Resolve Evaluator ("Evaluated By") strictly from profiles table using engineer_id
        evaluator_id = evaluation.get("engineer_id")
        evaluator_name = "Unknown Engineer"
        evaluator_role = "Testing Engineer / Metrologist"

        if evaluator_id:
            try:
                prof_res = self.client.table("profiles").select("full_name, role").eq("id", evaluator_id).single().execute()
                if prof_res.data:
                    evaluator_name = prof_res.data.get("full_name") or "Unknown Engineer"
                    role_code = prof_res.data.get("role", "")
                    if role_code == "engineer":
                        evaluator_role = "Testing Engineer"
                    elif role_code == "owner":
                        evaluator_role = "Laboratory Owner / Director"
                    else:
                        evaluator_role = "Laboratory Administrator"
            except Exception:
                pass

        # 3. Resolve Approver ("Approved & Verified By") strictly from profiles table using approved_by
        eval_status = str(evaluation.get("status", "")).lower()
        approver_id = evaluation.get("approved_by") if eval_status == "approved" else None
        approver_name = "Pending Approval"
        approver_role = "Authorized Quality Manager / Director"
        approval_status = "APPROVED" if (approver_id and eval_status == "approved") else "PENDING_APPROVAL"
        approved_at = evaluation.get("approved_at") if eval_status == "approved" else None

        if approver_id and eval_status == "approved":
            try:
                app_prof = self.client.table("profiles").select("full_name, role").eq("id", approver_id).single().execute()
                if app_prof.data:
                    approver_name = app_prof.data.get("full_name") or "Authorized Approver"
                    r_code = app_prof.data.get("role", "")
                    approver_role = "Laboratory Director" if r_code == "owner" else "Quality Manager / Admin"
            except Exception:
                pass

        # 4. Fetch detailed test calculations & validations for EXECUTED tests only.
        # NOT_STARTED and NOT_APPLICABLE tests are excluded from the official report —
        # they have no observations, no calculations, and should never appear as PASS.
        _excluded_statuses = {"NOT_STARTED", "NOT_APPLICABLE"}
        all_test_results = evaluation.get("test_results", [])
        executed_tests = [
            tr for tr in all_test_results
            if str(tr.get("status", "")).upper() not in _excluded_statuses
        ]
        detailed_tests = []

        for tr in executed_tests:
            detail = await self.eval_service.get_test_detail(evaluation_id, tr["test_id"], caller)
            detailed_tests.append(detail)

        # 5. Format numbers & units
        max_cap = instrument.get("max_capacity") or instrument.get("capacity") or 15
        min_cap = instrument.get("min_capacity") or 0
        e_val = instrument.get("verification_scale_interval_e") or instrument.get("verification_scale_interval") or instrument.get("e_resolution") or 5
        d_val = instrument.get("scale_interval_d") or instrument.get("actual_scale_interval") or instrument.get("d_resolution") or e_val
        unit = instrument.get("unit") or "kg"

        eval_num = evaluation.get("evaluation_number") or f"EVL-{evaluation['id'][:8].upper()}"
        report_num = f"TR-{str(evaluation['id'])[:8].upper()}-2026"

        return {
            "laboratory": {
                "id": caller.laboratory_id,
                "name": lab_name,
                "laboratory_code": lab_code,
                "code": lab_code,
                "address": lab_address,
                "contact_email": lab_contact_email,
                "contact_phone": lab_contact_phone,
                "accreditation_number": lab_accreditation,
            },
            "evaluation": {
                "id": evaluation["id"],
                "evaluation_number": eval_num,
                "report_number": report_num,
                "status": evaluation["status"],
                "oiml_edition": evaluation.get("oiml_edition") or "2006 (E)",
                "evaluation_date": evaluation.get("evaluation_date") or evaluation.get("created_at"),
                "started_at": evaluation.get("started_at"),
                "completed_at": evaluation.get("completed_at"),
                "environmental_conditions": evaluation.get("environmental_conditions") or {},
                "overall_result": evaluation.get("overall_result"),
                "notes": evaluation.get("notes")
            },
            "instrument": {
                "id": instrument.get("id"),
                "manufacturer": instrument.get("manufacturer") or "N/A",
                "model": instrument.get("model") or "N/A",
                "serial_number": instrument.get("serial_number") or "N/A",
                "accuracy_class": instrument.get("accuracy_class") or "III",
                "max_capacity": max_cap,
                "min_capacity": min_cap,
                "verification_scale_interval": e_val,
                "actual_scale_interval": d_val,
                "unit": unit,
                "applicant": instrument.get("manufacturer") or "N/A",
            },
            "signoff": {
                "evaluator_user_id": evaluator_id,
                "evaluator_name": evaluator_name,
                "evaluator_role": evaluator_role,
                "evaluated_at": evaluation.get("completed_at") or evaluation.get("created_at"),
                "approver_user_id": approver_id,
                "approver_name": approver_name,
                "approver_role": approver_role,
                "approval_status": approval_status,
                "approved_at": approved_at,
            },
            "test_results": detailed_tests,
            "metadata": {
                "generated_at": evaluation.get("updated_at") or evaluation.get("created_at"),
                "standard": "OIML R 76-1 (2006 E)",
                "laboratory_id": caller.laboratory_id,
                "branding": "METRA — Metrology Evaluation & Test Report Automation"
            }
        }
