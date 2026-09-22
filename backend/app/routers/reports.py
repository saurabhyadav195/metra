"""
METRA Backend — app/routers/reports.py
REST endpoints for test report list and detail generation.
Enforces laboratory isolation on all report lookups.
Handles column schema variations safely.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client, require_roles
from app.services.report_service import ReportService

router = APIRouter()


class ReportListItem(BaseModel):
    id: str
    evaluation_id: str
    report_number: str
    instrument_model: str
    instrument_manufacturer: str
    serial_number: str
    generated_by: str           # Name of original engineer (not the viewer)
    generated_at: str
    status: str
    evaluation_status: str      # Actual evaluation status for role-gated UI actions
    overall_result: Optional[str] = None


class ApproveRejectPayload(BaseModel):
    reason: Optional[str] = None


@router.get("", response_model=List[ReportListItem])
async def list_reports(
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """
    List reports for the authenticated user's laboratory.
    Reports correspond to completed/finalized evaluations.
    generated_by is resolved from the profiles table using evaluation.created_by,
    NOT the calling user's name.
    """
    # Only surface evaluations that have completed the report generation workflow.
    # IN_PROGRESS evaluations must NEVER appear in the Reports dashboard.
    # Only surface evaluations that have completed the report generation workflow.
    # in_progress evaluations must NEVER appear in the Reports dashboard.
    REPORT_VISIBLE_STATUSES = [
        "pending_verification", "approved", "requires_rework",
        "PENDING_VERIFICATION", "APPROVED", "REQUIRES_REWORK",
    ]
    res = (
        client.table("evaluations")
        .select("*, instruments(model, manufacturer, serial_number)")
        .eq("laboratory_id", caller.laboratory_id)
        .in_("status", REPORT_VISIBLE_STATUSES)
        .execute()
    )

    raw_evals = res.data or []
    if caller.role == "engineer":
        evals = [
            e for e in raw_evals
            if e.get("engineer_id") == caller.user_id or e.get("engineer_id") is None
        ]
    else:
        evals = raw_evals

    # ── Bulk-resolve engineer names from profiles table ───────────────────────
    # Collect distinct engineer UUIDs to avoid N+1 queries
    engineer_ids = list({e.get("engineer_id") for e in evals if e.get("engineer_id")})
    profile_name_map: Dict[str, str] = {}

    if engineer_ids:
        try:
            prof_res = (
                client.table("profiles")
                .select("id, full_name")
                .in_("id", engineer_ids)
                .execute()
            )
            for row in (prof_res.data or []):
                profile_name_map[row["id"]] = row.get("full_name") or "Unknown Engineer"
        except Exception:
            pass  # Fallback: names will show as Unknown

    reports = []
    for ev in evals:
        inst = ev.get("instruments") or {}
        model_name = inst.get("model") or "N/A"
        overall_res = None
        if isinstance(ev.get("overall_result"), dict):
            overall_res = ev.get("overall_result").get("result") or ev.get("overall_result").get("status")
        elif isinstance(ev.get("overall_result"), str):
            overall_res = ev.get("overall_result")

        # Resolve engineer name strictly from bulk-fetched profiles map via engineer_id
        eng_id = ev.get("engineer_id")
        engineer_name = profile_name_map.get(eng_id, "Unknown Engineer") if eng_id else "Unknown Engineer"

        eval_status = ev.get("status", "draft")

        reports.append(
            ReportListItem(
                id=f"RPT-{str(ev.get('id'))[:8].upper()}",
                evaluation_id=ev["id"],
                report_number=f"TR-{str(ev.get('id'))[:8].upper()}-2026",
                instrument_model=model_name,
                instrument_manufacturer=inst.get("manufacturer", "Unknown"),
                serial_number=inst.get("serial_number", "N/A"),
                generated_by=engineer_name,
                generated_at=ev.get("completed_at") or ev.get("updated_at") or ev.get("created_at") or "",
                status=eval_status,
                evaluation_status=eval_status,
                overall_result=overall_res,
            )
        )

    return reports


@router.get("/{report_id}")
async def get_report_detail(
    report_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """
    Get full evaluation report certificate data.
    `report_id` can be either evaluation UUID or RPT-prefixed id.
    Raises 404 if the report/evaluation is not found.
    """
    eval_id = report_id
    if report_id.startswith("RPT-"):
        res = (
            client.table("evaluations")
            .select("id")
            .eq("laboratory_id", caller.laboratory_id)
            .execute()
        )
        found = False
        for row in (res.data or []):
            if f"RPT-{str(row['id'])[:8].upper()}" == report_id:
                eval_id = row["id"]
                found = True
                break
        if not found:
            raise HTTPException(status_code=404, detail="Report not found in your laboratory.")

    report_service = ReportService(client)
    return await report_service.get_report_data(eval_id, caller)


@router.post("/{evaluation_id}/approve")
async def approve_report(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(require_roles("owner", "admin")),
    client: Client = Depends(get_supabase_client),
):
    """
    Owner/Admin approves a finalized evaluation.
    Sets status to approved and stamps approved_by, approved_at, completed_at, updated_at.
    Creates an immutable REPORT_APPROVED record in audit_logs.
    Once approved, the evaluation is permanently locked for further edits.
    """
    eval_res = (
        client.table("evaluations")
        .select("id, status, laboratory_id, evaluation_number")
        .eq("id", evaluation_id)
        .eq("laboratory_id", caller.laboratory_id)
        .execute()
    )
    if not eval_res.data:
        raise HTTPException(status_code=404, detail="Evaluation not found.")

    ev = eval_res.data[0]
    current_status = str(ev.get("status", "")).lower()
    if current_status == "approved":
        raise HTTPException(status_code=409, detail="Evaluation is already approved.")
    if current_status not in ("pending_verification", "requires_rework", "passed", "failed", "requires_review"):
        raise HTTPException(
            status_code=422,
            detail=f"Evaluation cannot be approved from status '{current_status}'. Submit it for verification first."
        )

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

    return {"message": "Evaluation approved successfully.", "evaluation_id": evaluation_id, "status": "approved"}


@router.post("/{evaluation_id}/reject")
async def reject_report(
    evaluation_id: str,
    body: ApproveRejectPayload,
    caller: AuthenticatedUser = Depends(require_roles("owner", "admin")),
    client: Client = Depends(get_supabase_client),
):
    """
    Owner/Admin rejects a finalized evaluation.
    Sets status back to requires_rework so the engineer can fix and resubmit.
    Clears approved_by and approved_at.
    Stores rejection reason in audit_logs metadata.
    """
    eval_res = (
        client.table("evaluations")
        .select("id, status, laboratory_id, evaluation_number")
        .eq("id", evaluation_id)
        .eq("laboratory_id", caller.laboratory_id)
        .execute()
    )
    if not eval_res.data:
        raise HTTPException(status_code=404, detail="Evaluation not found.")

    ev = eval_res.data[0]
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
    }
