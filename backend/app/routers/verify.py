"""
METRA Backend — app/routers/verify.py

Public verification endpoint for QR code anti-counterfeit certificate scanning.
NO authentication required — this is intentionally public so scanned QR codes
from printed certificates can be verified by anyone.

Returns only immutable, publicly-safe facts needed to prove authenticity.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.deps import get_supabase_client
from fastapi import Depends

router = APIRouter()


class CertificateVerificationResponse(BaseModel):
    verified: bool
    evaluation_id: str
    laboratory_name: str
    laboratory_accreditation: Optional[str] = None
    instrument_manufacturer: str
    instrument_model: str
    serial_number: str
    accuracy_class: str
    overall_result: str              # PASS / FAIL / PENDING
    evaluation_status: str           # APPROVED / PENDING_VERIFICATION / etc.
    evaluator_name: str
    evaluator_role: str
    evaluated_at: Optional[str]
    approver_name: Optional[str]
    approver_role: Optional[str]
    approved_at: Optional[str]
    report_number: str
    oiml_edition: str
    verification_message: str


@router.get("/{evaluation_id}", response_model=CertificateVerificationResponse)
async def verify_certificate(
    evaluation_id: str,
    client: Client = Depends(get_supabase_client),
):
    """
    Public QR code verification endpoint.
    Verifies a METRA evaluation certificate by evaluation UUID.
    No authentication required.
    """
    # 1. Fetch evaluation
    eval_res = (
        client.table("evaluations")
        .select("*, instruments(manufacturer, model, serial_number, accuracy_class)")
        .eq("id", evaluation_id)
        .execute()
    )
    if not eval_res.data:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found. This QR code may be invalid or the certificate may have been revoked."
        )

    ev = eval_res.data[0]
    inst = ev.get("instruments") or {}
    lab_id = ev.get("laboratory_id")
    eval_status = str(ev.get("status", "")).upper()

    # 2. Fetch laboratory name & registration/accreditation number directly using evaluation.laboratory_id
    lab_name = "Unknown Laboratory"
    lab_accreditation = None

    if lab_id:
        try:
            lab_res = (
                client.table("laboratories")
                .select("id, name, registration_number, address, city, state, country, email, phone")
                .eq("id", lab_id)
                .execute()
            )
            if lab_res.data and len(lab_res.data) > 0:
                lab_row = lab_res.data[0]
                lab_name = lab_row.get("name") or lab_name
                lab_accreditation = lab_row.get("registration_number") or lab_row.get("accreditation_number")
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[verify_certificate] Failed to fetch laboratory {lab_id}: {e}")

    # Fallback if evaluation.laboratory_id is missing or returned empty
    if lab_name == "Unknown Laboratory":
        creator_id = ev.get("engineer_id") or ev.get("created_by")
        if creator_id:
            try:
                prof_lab_res = (
                    client.table("profiles")
                    .select("laboratory_id")
                    .eq("id", creator_id)
                    .execute()
                )
                if prof_lab_res.data and len(prof_lab_res.data) > 0:
                    resolved_lab_id = prof_lab_res.data[0].get("laboratory_id")
                    if resolved_lab_id:
                        lab_res = (
                            client.table("laboratories")
                            .select("id, name, registration_number, address, city, state, country, email, phone")
                            .eq("id", resolved_lab_id)
                            .execute()
                        )
                        if lab_res.data and len(lab_res.data) > 0:
                            lab_row = lab_res.data[0]
                            lab_name = lab_row.get("name") or lab_name
                            lab_accreditation = lab_row.get("registration_number") or lab_row.get("accreditation_number")
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"[verify_certificate] Failed profile fallback lab lookup: {e}")

    # 3. Resolve evaluator (original engineer who ran the evaluation)
    evaluator_name = "Unknown"
    evaluator_role = "Testing Engineer"
    creator_id = ev.get("engineer_id") or ev.get("created_by")
    if creator_id:
        try:
            eng_res = (
                client.table("profiles")
                .select("full_name, role")
                .eq("id", creator_id)
                .single()
                .execute()
            )
            if eng_res.data:
                evaluator_name = eng_res.data.get("full_name") or evaluator_name
                role_code = eng_res.data.get("role", "engineer")
                evaluator_role = (
                    "Laboratory Owner / Director" if role_code == "owner"
                    else "Laboratory Administrator" if role_code == "admin"
                    else "Testing Engineer"
                )
        except Exception:
            pass

    # 4. Resolve approver
    approver_name: Optional[str] = None
    approver_role: Optional[str] = None
    approved_at = ev.get("approved_at")
    approver_id = ev.get("approved_by")

    if approver_id:
        try:
            app_res = (
                client.table("profiles")
                .select("full_name, role")
                .eq("id", approver_id)
                .single()
                .execute()
            )
            if app_res.data:
                approver_name = app_res.data.get("full_name")
                r_code = app_res.data.get("role", "admin")
                approver_role = (
                    "Laboratory Director" if r_code == "owner"
                    else "Quality Manager / Admin"
                )
        except Exception:
            pass

    # 5. Resolve overall result
    overall_result_raw = ev.get("overall_result")
    if isinstance(overall_result_raw, dict):
        overall_result = str(overall_result_raw.get("status") or overall_result_raw.get("result") or "PENDING").upper()
    elif isinstance(overall_result_raw, str):
        overall_result = overall_result_raw.upper()
    else:
        overall_result = "PENDING"

    # Normalize result labels
    if overall_result in ("PASSED",):
        overall_result = "PASS"
    elif overall_result in ("FAILED",):
        overall_result = "FAIL"

    # 6. Build verification message
    is_approved = eval_status == "APPROVED"
    if is_approved:
        verification_message = (
            f"This report was verified against the METRA laboratory record. "
            f"Approved by {approver_name or 'an authorized signatory'} of {lab_name}."
        )
    elif eval_status in ("PENDING_VERIFICATION", "PENDING"):
        verification_message = (
            "This evaluation report is awaiting official verification from the laboratory."
        )
    else:
        verification_message = (
            f"This evaluation report has status '{eval_status}' and has not been approved."
        )

    eval_id_short = str(evaluation_id)[:8].upper()
    report_number = f"TR-{eval_id_short}-2026"
    oiml_edition = ev.get("oiml_edition") or "2006 (E)"

    return CertificateVerificationResponse(
        verified=is_approved,
        evaluation_id=evaluation_id,
        laboratory_name=lab_name,
        laboratory_accreditation=lab_accreditation,
        instrument_manufacturer=inst.get("manufacturer") or "N/A",
        instrument_model=inst.get("model") or "N/A",
        serial_number=inst.get("serial_number") or "N/A",
        accuracy_class=inst.get("accuracy_class") or "III",
        overall_result=overall_result,
        evaluation_status=eval_status,
        evaluator_name=evaluator_name,
        evaluator_role=evaluator_role,
        evaluated_at=ev.get("completed_at") or ev.get("created_at"),
        approver_name=approver_name,
        approver_role=approver_role,
        approved_at=approved_at,
        report_number=report_number,
        oiml_edition=oiml_edition,
        verification_message=verification_message,
    )
