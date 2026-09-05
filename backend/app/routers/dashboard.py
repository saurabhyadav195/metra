"""
METRA Backend — app/routers/dashboard.py
Real-time dashboard statistics and activity metrics backed by Supabase.
Strictly isolates metrics by authenticated user's laboratory_id.
Handles database column schema variations safely.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client

router = APIRouter()


class DashboardStatsResponse(BaseModel):
    active_evaluations: int
    completed_evaluations: int
    total_instruments: int
    total_reports: int
    engineers_count: int
    recent_evaluations: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    # 1. Instruments for caller's laboratory
    inst_res = (
        client.table("instruments")
        .select("*")
        .eq("laboratory_id", caller.laboratory_id)
        .execute()
    )
    raw_instruments = inst_res.data or []
    if caller.role == "engineer":
        filtered_instruments = [
            i for i in raw_instruments
            if i.get("created_by") == caller.user_id or i.get("created_by") is None
        ]
    else:
        filtered_instruments = raw_instruments

    total_instruments = len(filtered_instruments)
    instruments_map = {item["id"]: item for item in raw_instruments}

    # 2. Evaluations for caller's laboratory
    eval_res = (
        client.table("evaluations")
        .select("*, instruments(model, model_designation, manufacturer, serial_number)")
        .eq("laboratory_id", caller.laboratory_id)
        .order("created_at", desc=True)
        .execute()
    )
    raw_evals = eval_res.data or []
    if caller.role == "engineer":
        all_evals = [
            e for e in raw_evals
            if e.get("created_by") == caller.user_id or e.get("created_by") is None
        ]
    else:
        all_evals = raw_evals

    active_evaluations = sum(1 for e in all_evals if e.get("status") in ("DRAFT", "IN_PROGRESS"))
    completed_evaluations = sum(1 for e in all_evals if e.get("status") in ("COMPLETED", "PASSED", "FAILED", "PASS", "FAIL"))
    total_reports = completed_evaluations

    # 3. Team Engineers count
    profiles_res = (
        client.table("profiles")
        .select("id")
        .eq("laboratory_id", caller.laboratory_id)
        .eq("is_active", True)
        .execute()
    )
    engineers_count = len(profiles_res.data or [])

    # Format recent evaluations
    recent_evaluations = []
    for ev in all_evals[:5]:
        inst = ev.get("instruments") or instruments_map.get(ev.get("instrument_id")) or {}
        model_name = inst.get("model_designation") or inst.get("model") or "Instrument"
        recent_evaluations.append({
            "id": ev.get("id"),
            "evaluation_number": ev.get("evaluation_number") or f"EVL-{str(ev.get('id'))[:8].upper()}",
            "instrument_id": ev.get("instrument_id"),
            "instrument_model": model_name,
            "instrument_manufacturer": inst.get("manufacturer", "Unknown"),
            "serial_number": inst.get("serial_number", ""),
            "status": ev.get("status", "DRAFT"),
            "overall_result": (ev.get("overall_result") or {}).get("result") if isinstance(ev.get("overall_result"), dict) else ev.get("overall_result"),
            "created_at": ev.get("created_at"),
            "updated_at": ev.get("updated_at"),
        })

    # Format recent activity feed
    recent_activity = []
    for idx, ev in enumerate(all_evals[:5]):
        model_title = recent_evaluations[idx]["instrument_model"] if idx < len(recent_evaluations) else "Instrument"
        recent_activity.append({
            "id": f"act-{ev.get('id')}",
            "type": "evaluation_updated",
            "message": f"Evaluation status: {ev.get('status')} for {model_title}",
            "actor": caller.full_name,
            "created_at": ev.get("updated_at") or ev.get("created_at"),
        })

    return DashboardStatsResponse(
        active_evaluations=active_evaluations,
        completed_evaluations=completed_evaluations,
        total_instruments=total_instruments,
        total_reports=total_reports,
        engineers_count=engineers_count,
        recent_evaluations=recent_evaluations,
        recent_activity=recent_activity,
    )
