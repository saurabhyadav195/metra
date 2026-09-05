"""
METRA Backend — app/routers/reports.py
REST endpoints for test report list and detail generation.
Enforces laboratory isolation on all report lookups.
Handles column schema variations safely.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client
from app.services.report_service import ReportService

router = APIRouter()


class ReportListItem(BaseModel):
    id: str
    evaluation_id: str
    report_number: str
    instrument_model: str
    instrument_manufacturer: str
    serial_number: str
    generated_by: str
    generated_at: str
    status: str
    overall_result: Optional[str] = None


@router.get("", response_model=List[ReportListItem])
async def list_reports(
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """
    List reports for the authenticated user's laboratory.
    Reports correspond to completed/finalized evaluations.
    """
    res = (
        client.table("evaluations")
        .select("*, instruments(model, model_designation, manufacturer, serial_number)")
        .eq("laboratory_id", caller.laboratory_id)
        .execute()
    )

    raw_evals = res.data or []
    if caller.role == "engineer":
        evals = [
            e for e in raw_evals
            if e.get("created_by") == caller.user_id or e.get("created_by") is None
        ]
    else:
        evals = raw_evals

    reports = []
    for ev in evals:
        inst = ev.get("instruments") or {}
        model_name = inst.get("model_designation") or inst.get("model") or "N/A"
        overall_res = None
        if isinstance(ev.get("overall_result"), dict):
            overall_res = ev.get("overall_result").get("result")
        elif isinstance(ev.get("overall_result"), str):
            overall_res = ev.get("overall_result")

        reports.append(
            ReportListItem(
                id=f"RPT-{str(ev.get('id'))[:8].upper()}",
                evaluation_id=ev["id"],
                report_number=f"TR-{str(ev.get('id'))[:8].upper()}-2026",
                instrument_model=model_name,
                instrument_manufacturer=inst.get("manufacturer", "Unknown"),
                serial_number=inst.get("serial_number", "N/A"),
                generated_by=caller.full_name,
                generated_at=ev.get("completed_at") or ev.get("updated_at") or ev.get("created_at") or "",
                status=ev.get("status", "DRAFT"),
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
        if not found and res.data:
            eval_id = res.data[0]["id"]

    report_service = ReportService(client)
    return await report_service.get_report_data(eval_id, caller)
