"""
METRA Backend — app/routers/evaluations.py

REST endpoints for OIML R-76 evaluation workflows and test executions.
Enforces laboratory isolation on all operations.

Approval Workflow:
  Engineer → finalize → PENDING_VERIFICATION
  Owner/Admin → approve → APPROVED (permanently locked)
  Owner/Admin → reject → REQUIRES_REWORK (engineer can revise)
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client, require_roles
from app.services.evaluation_service import EvaluationService
from app.services.report_service import ReportService


router = APIRouter()


class EnvironmentalConditionsPayload(BaseModel):
    temperature_c: Optional[float] = None
    relative_humidity_percent: Optional[float] = None
    relative_humidity_pct: Optional[float] = None
    atmospheric_pressure_hpa: Optional[float] = None
    test_location: Optional[str] = None
    notes: Optional[str] = None


class CreateEvaluationRequest(BaseModel):
    instrument_id: str
    evaluation_date: Optional[str] = None
    oiml_version: Optional[str] = None
    oiml_edition: Optional[str] = None
    environmental_conditions: Optional[EnvironmentalConditionsPayload] = None


class SaveObservationsRequest(BaseModel):
    observations: Dict[str, Any]


class CompleteTestRequest(BaseModel):
    manual_result: Optional[str] = None
    comment: Optional[str] = None


class EnvironmentalConditionsRequest(BaseModel):
    temperature_c: Optional[float] = None
    relative_humidity_pct: Optional[float] = None
    atmospheric_pressure_hpa: Optional[float] = None
    test_location: Optional[str] = None
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    notes: Optional[str] = None


class UpdateEvaluationRequest(BaseModel):
    notes: Optional[str] = None
    evaluation_date: Optional[str] = None


class RejectEvaluationRequest(BaseModel):
    reason: Optional[str] = None


# ── Approval lock guard helper ────────────────────────────────────────────────

def _assert_not_approved(evaluation: dict) -> None:
    """Raises HTTP 423 if the evaluation is APPROVED and thus permanently locked."""
    ev_status = str(evaluation.get("status", "")).upper()
    if ev_status == "APPROVED":
        raise HTTPException(
            status_code=423,
            detail="This evaluation is APPROVED and permanently locked. No further changes are permitted."
        )


def _assert_can_edit_evaluation(evaluation: dict, caller: AuthenticatedUser) -> None:
    """Raises HTTP 423 if the evaluation cannot be modified."""
    ev_status = str(evaluation.get("status", "")).upper()
    if ev_status == "APPROVED":
        raise HTTPException(
            status_code=423,
            detail="This evaluation is APPROVED and permanently locked. No further changes are permitted."
        )
    if ev_status == "PENDING_VERIFICATION":
        raise HTTPException(
            status_code=423,
            detail="This evaluation is PENDING VERIFICATION and locked against modifications."
        )


async def _get_evaluation_or_404(client: Client, evaluation_id: str, laboratory_id: str) -> dict:
    """Fetches evaluation row and raises 404 if not found."""
    res = (
        client.table("evaluations")
        .select("id, status, laboratory_id, engineer_id")
        .eq("id", evaluation_id)
        .eq("laboratory_id", laboratory_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Evaluation not found in your laboratory.")
    return res.data[0]


# ── CRUD Endpoints ────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    body: CreateEvaluationRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Creates a new OIML R-76 evaluation for an instrument."""
    service = EvaluationService(client)
    return await service.create_evaluation(body, caller)


@router.get("")
async def list_evaluations(
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Lists evaluations for the authenticated user's laboratory."""
    service = EvaluationService(client)
    return await service.list_evaluations(caller)


@router.get("/{evaluation_id}")
async def get_evaluation(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Retrieves full evaluation record with instrument info and test results summary."""
    service = EvaluationService(client)
    return await service.get_evaluation_detail(evaluation_id, caller)


@router.patch("/{evaluation_id}")
async def update_evaluation(
    evaluation_id: str,
    body: UpdateEvaluationRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Updates evaluation metadata (notes, evaluation date)."""
    ev = await _get_evaluation_or_404(client, evaluation_id, caller.laboratory_id)
    _assert_can_edit_evaluation(ev, caller)
    service = EvaluationService(client)
    return await service.update_evaluation_metadata(evaluation_id, body.dict(exclude_none=True), caller)


@router.patch("/{evaluation_id}/environmental")
async def save_environmental_conditions(
    evaluation_id: str,
    body: EnvironmentalConditionsRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Saves environmental conditions for an evaluation (temperature, humidity, pressure, location, dates)."""
    ev = await _get_evaluation_or_404(client, evaluation_id, caller.laboratory_id)
    _assert_can_edit_evaluation(ev, caller)
    service = EvaluationService(client)
    return await service.save_environmental_conditions(
        evaluation_id,
        body.dict(exclude_none=True),
        caller
    )


# ── Test Endpoints ────────────────────────────────────────────────────────────

@router.get("/{evaluation_id}/tests/{test_id}")
async def get_test_detail(
    evaluation_id: str,
    test_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Retrieves single test execution details, observations, and calculations."""
    service = EvaluationService(client)
    return await service.get_test_detail(evaluation_id, test_id, caller)


@router.post("/{evaluation_id}/tests/{test_id}")
async def save_test_observations(
    evaluation_id: str,
    test_id: str,
    body: SaveObservationsRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Saves observation data for a specific test execution. Locked if evaluation is APPROVED or PENDING_VERIFICATION."""
    ev = await _get_evaluation_or_404(client, evaluation_id, caller.laboratory_id)
    _assert_can_edit_evaluation(ev, caller)
    service = EvaluationService(client)
    return await service.save_observations(evaluation_id, test_id, body.observations, caller)


@router.post("/{evaluation_id}/tests/{test_id}/calculate")
async def calculate_test(
    evaluation_id: str,
    test_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Triggers deterministic engine calculation for a test. Locked if evaluation is APPROVED or PENDING_VERIFICATION."""
    ev = await _get_evaluation_or_404(client, evaluation_id, caller.laboratory_id)
    _assert_can_edit_evaluation(ev, caller)
    service = EvaluationService(client)
    res = await service.calculate_test(evaluation_id, test_id, caller)
    if hasattr(res, "dict"):
        return res.dict()
    return res


@router.post("/{evaluation_id}/tests/{test_id}/complete")
async def complete_test(
    evaluation_id: str,
    test_id: str,
    body: CompleteTestRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Marks manual verification test result and comment. Locked if evaluation is APPROVED or PENDING_VERIFICATION."""
    ev = await _get_evaluation_or_404(client, evaluation_id, caller.laboratory_id)
    _assert_can_edit_evaluation(ev, caller)
    service = EvaluationService(client)
    return await service.complete_test(evaluation_id, test_id, body.manual_result, body.comment, caller)


# ── Finalization & Approval Workflow ──────────────────────────────────────────

@router.post("/{evaluation_id}/evaluate")
async def finalize_evaluation(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """
    Finalizes an evaluation (Finalize & Generate Report).

    Lifecycle (atomic — all steps must succeed):
      1. Compute overall PASS/FAIL result and persist it (evaluation stays IN_PROGRESS).
      2. Generate the official report PDF in memory using ReportLab.
      3. Upload the PDF to Supabase Storage metra-reports bucket.
      4. Insert/update report_pdfs metadata row.
      5. Only after storage success: set evaluation.status = PENDING_VERIFICATION.

    If step 2, 3 or 4 fail:
      - evaluation.status remains IN_PROGRESS (or reverts to it).
      - No partial report record is left visible.
      - HTTP 500 is returned with a clear error message.

    Locked if already APPROVED.
    """
    ev = await _get_evaluation_or_404(client, evaluation_id, caller.laboratory_id)
    _assert_not_approved(ev)

    service = EvaluationService(client)

    # Step 1: Compute overall result and persist overall_result + completed_at.
    # evaluation.status is NOT changed yet.
    overall_data = await service.finalize_evaluation(evaluation_id, caller)

    # Step 2-4: Generate PDF and store it. This MUST succeed before we set PENDING_VERIFICATION.
    try:
        from app.services.pdf_service import generate_and_store_report_pdf
        await generate_and_store_report_pdf(client, evaluation_id, caller)
    except Exception as pdf_err:
        import logging
        logging.getLogger(__name__).error(
            f"[finalize_evaluation] PDF generation/storage failed for evaluation "
            f"{evaluation_id}: {pdf_err}"
        )
        # Ensure evaluation status is explicitly kept/reverted to in_progress.
        # (The service did not change status, so this is a safety guard for re-runs.)
        try:
            client.table("evaluations").update({
                "status": "in_progress",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", evaluation_id).execute()
        except Exception:
            pass  # Best-effort; the status was never changed away from in_progress.

        raise HTTPException(
            status_code=500,
            detail=(
                "Report PDF generation failed. The evaluation has NOT been finalised. "
                f"Please try again. Technical detail: {str(pdf_err)}"
            )
        )

    # Step 5: PDF stored successfully — now promote status to pending_verification.
    # NOTE: DB CHECK constraint requires lowercase status values.
    now = datetime.now(timezone.utc).isoformat()
    try:
        client.table("evaluations").update({
            "status": "pending_verification",
            "updated_at": now,
        }).eq("id", evaluation_id).execute()
    except Exception as status_err:
        import logging
        logging.getLogger(__name__).error(
            f"[finalize_evaluation] Failed to set evaluation {evaluation_id} to "
            f"pending_verification: {status_err}"
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "PDF was generated but failed to update evaluation status. "
                f"Technical detail: {str(status_err)}"
            )
        )

    # Return the full evaluation detail so the frontend can update its UI.
    return await service.get_evaluation_detail(evaluation_id, caller)



@router.post("/{evaluation_id}/submit")
async def submit_for_approval(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """
    Engineer submits/resubmits an evaluation for owner/admin approval.
    Used when resubmitting after REQUIRES_REWORK.

    Lifecycle:
      1. Regenerate and store the updated report PDF.
      2. Only after successful PDF storage: set status to PENDING_VERIFICATION.

    Returns HTTP 500 with a clear error if PDF generation fails.
    """
    ev = await _get_evaluation_or_404(client, evaluation_id, caller.laboratory_id)
    _assert_not_approved(ev)

    current_status = str(ev.get("status", "")).upper()
    if current_status not in ("IN_PROGRESS", "REQUIRES_REWORK", "PASSED", "FAILED",
                               "passed", "failed", "requires_review", "REQUIRES_REVIEW",
                               "PENDING_VERIFICATION"):
        raise HTTPException(
            status_code=422,
            detail=f"Evaluation with status '{current_status}' cannot be submitted. Please finalize tests first."
        )

    # Step 1: Generate and store updated PDF first.
    try:
        from app.services.pdf_service import generate_and_store_report_pdf
        await generate_and_store_report_pdf(client, evaluation_id, caller)
    except Exception as pdf_err:
        import logging
        logging.getLogger(__name__).error(
            f"[submit_for_approval] PDF generation/storage failed for evaluation "
            f"{evaluation_id}: {pdf_err}"
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Report PDF generation failed. The evaluation has NOT been submitted. "
                f"Please try again. Technical detail: {str(pdf_err)}"
            )
        )

    # Step 2: PDF stored — now set pending_verification.
    # NOTE: DB CHECK constraint requires lowercase status values.
    now = datetime.now(timezone.utc).isoformat()
    client.table("evaluations").update({
        "status": "pending_verification",
        "updated_at": now,
    }).eq("id", evaluation_id).execute()

    return {
        "message": "Evaluation submitted for approval.",
        "evaluation_id": evaluation_id,
        "status": "pending_verification",
    }


@router.post("/{evaluation_id}/approve")
async def approve_evaluation(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(require_roles("owner", "admin")),
    client: Client = Depends(get_supabase_client)
):
    """
    Owner/Admin approves an evaluation.
    Status → approved. Permanently locks the evaluation, creates audit_logs record, and generates final approved PDF with QR code.
    """
    ev = await _get_evaluation_or_404(client, evaluation_id, caller.laboratory_id)
    current_status = str(ev.get("status", "")).lower()

    if current_status == "approved":
        raise HTTPException(status_code=409, detail="Evaluation is already approved.")

    now = datetime.now(timezone.utc).isoformat()
    client.table("evaluations").update({
        "status": "approved",
        "approved_by": caller.user_id,
        "approved_at": now,
        "completed_at": now,
        "updated_at": now,
    }).eq("id", evaluation_id).eq("laboratory_id", caller.laboratory_id).execute()

    # Create immutable entry in audit_logs
    try:
        client.table("audit_logs").insert({
            "laboratory_id": caller.laboratory_id,
            "user_id": caller.user_id,
            "action": "REPORT_APPROVED",
            "entity_type": "evaluation",
            "entity_id": evaluation_id,
            "metadata": {
                "report_number": f"TR-{str(evaluation_id)[:8].upper()}-2026",
                "evaluation_number": ev.get("evaluation_number") or f"EVL-{str(evaluation_id)[:8].upper()}",
                "previous_status": current_status,
                "new_status": "approved",
            },
        }).execute()
    except Exception as log_err:
        import logging
        logging.getLogger(__name__).warning(f"Audit log insertion warning: {log_err}")

    # Regenerate final APPROVED PDF with approver signature and QR code
    try:
        from app.services.pdf_service import generate_and_store_report_pdf
        await generate_and_store_report_pdf(client, evaluation_id, caller)
    except Exception as pdf_err:
        import logging
        logging.getLogger(__name__).warning(f"Approved Report PDF generation warning: {pdf_err}")

    return {
        "message": "Evaluation approved and locked.",
        "evaluation_id": evaluation_id,
        "status": "approved",
        "approved_by": caller.full_name,
        "approved_at": now,
    }


@router.post("/{evaluation_id}/reject")
async def reject_evaluation(
    evaluation_id: str,
    body: RejectEvaluationRequest,
    caller: AuthenticatedUser = Depends(require_roles("owner", "admin")),
    client: Client = Depends(get_supabase_client)
):
    """
    Owner/Admin rejects an evaluation and reverts status to requires_rework.
    Clears approved_by and approved_at. Stores rejection reason in audit_logs.
    Engineer can then view the rejection reason, fix issues, and resubmit.
    """
    ev = await _get_evaluation_or_404(client, evaluation_id, caller.laboratory_id)
    current_status = str(ev.get("status", "")).lower()

    if current_status == "approved":
        raise HTTPException(status_code=409, detail="Approved evaluations cannot be rejected.")

    reason_str = (body.reason or "").strip()
    if not reason_str:
        raise HTTPException(status_code=400, detail="Rejection reason is required.")

    now = datetime.now(timezone.utc).isoformat()
    client.table("evaluations").update({
        "status": "requires_rework",
        "approved_by": None,
        "approved_at": None,
        "updated_at": now,
    }).eq("id", evaluation_id).eq("laboratory_id", caller.laboratory_id).execute()

    # Create immutable entry in audit_logs
    try:
        client.table("audit_logs").insert({
            "laboratory_id": caller.laboratory_id,
            "user_id": caller.user_id,
            "action": "REPORT_REJECTED",
            "entity_type": "evaluation",
            "entity_id": evaluation_id,
            "metadata": {
                "reason": reason_str,
                "previous_status": current_status,
                "new_status": "requires_rework",
            },
        }).execute()
    except Exception as log_err:
        import logging
        logging.getLogger(__name__).warning(f"Audit log insertion warning: {log_err}")

    return {
        "message": "Evaluation rejected. Engineer can now revise and resubmit.",
        "evaluation_id": evaluation_id,
        "status": "requires_rework",
        "rejection_reason": reason_str,
        "rejected_by": caller.full_name,
    }


@router.get("/{evaluation_id}/report-data")
async def get_report_data(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Retrieves full assembled report data model for certificate generation."""
    service = ReportService(client)
    return await service.get_report_data(evaluation_id, caller)
