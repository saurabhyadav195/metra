"""
METRA Backend — app/routers/instruments.py

REST endpoints for instrument management.

Security guarantees:
- laboratory_id and created_by are NEVER taken from the request body.
- Both are derived exclusively from the authenticated user's profile.
- All queries are filtered by laboratory_id — laboratory isolation is enforced here.

Role permissions:
- owner/admin: full CRUD on all lab instruments
- engineer:    create + view own instruments + edit own instruments
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client
from app.models.instrument import (
    CreateInstrumentRequest,
    InstrumentListResponse,
    InstrumentResponse,
    UpdateInstrumentRequest,
)


router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _row_to_response(row: dict) -> InstrumentResponse:
    """
    Map database column names to API response field names.
    Database uses `model`; API uses `model_designation`.
    """
    row = dict(row)

    if row.get("model_designation") is None:
        row["model_designation"] = row.get("model")

    return InstrumentResponse(**row)


def _assert_can_modify(
    instrument: dict,
    caller: AuthenticatedUser,
) -> None:
    """
    Verify the caller has permission to modify/delete the instrument.
    Owners and admins can modify any instrument in their lab.
    Engineers can only modify instruments they created.
    """
    if caller.role in ("owner", "admin"):
        return
    if caller.role == "engineer" and instrument["created_by"] == caller.user_id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to modify this instrument.",
    )


def _assert_can_delete(caller: AuthenticatedUser) -> None:
    """Only owners and admins can delete instruments."""
    if caller.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only laboratory owners and admins can delete instruments.",
        )


# ── GET /api/instruments ───────────────────────────────────────────────────────

@router.get("", response_model=InstrumentListResponse)
async def list_instruments(
    search: Optional[str] = Query(None, description="Search by model, manufacturer, or serial number"),
    status_filter: Optional[str] = Query(None, alias="status"),
    instrument_type: Optional[str] = Query(None),
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """
    List instruments for the authenticated user's laboratory.
    Engineers only see instruments they created.
    """
    query = (
        client.table("instruments")
        .select("*")
        .eq("laboratory_id", caller.laboratory_id)
        .order("created_at", desc=True)
    )

    # Engineers only see their own instruments
    if caller.role == "engineer":
        query = query.eq("created_by", caller.user_id)

    if status_filter:
        query = query.eq("status", status_filter)

    if instrument_type:
        query = query.eq("instrument_type", instrument_type)

    result = query.execute()
    rows = result.data or []

    # Apply search filter in Python (Supabase JS-style ilike on multiple columns
    # requires OR which is simpler to handle here for MVP)
    if search:
        term = search.lower()
        rows = [
            r for r in rows
            if term in (r.get("model") or r.get("model_designation") or "").lower()
            or term in (r.get("manufacturer") or "").lower()
            or term in (r.get("serial_number") or "").lower()
        ]

    instruments = [_row_to_response(r) for r in rows]
    return InstrumentListResponse(instruments=instruments, total=len(instruments))


# ── GET /api/instruments/{id} ──────────────────────────────────────────────────

@router.get("/{instrument_id}", response_model=InstrumentResponse)
async def get_instrument(
    instrument_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    result = (
        client.table("instruments")
        .select("*")
        .eq("id", instrument_id)
        .eq("laboratory_id", caller.laboratory_id)  # laboratory isolation
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instrument not found.",
        )

    instrument = result.data[0]

    # Engineers can only view instruments they created
    if caller.role == "engineer" and instrument["created_by"] != caller.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this instrument.",
        )

    return _row_to_response(instrument)


# ── POST /api/instruments ──────────────────────────────────────────────────────

@router.post("", response_model=InstrumentResponse, status_code=status.HTTP_201_CREATED)
async def create_instrument(
    body: CreateInstrumentRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    # Check for duplicate serial number within this laboratory
    dup_check = (
        client.table("instruments")
        .select("id")
        .eq("laboratory_id", caller.laboratory_id)
        .eq("serial_number", body.serial_number)
        .execute()
    )
    if dup_check.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An instrument with serial number '{body.serial_number}' already exists in this laboratory.",
        )

    now = datetime.now(timezone.utc).isoformat()

    payload = body.model_dump(exclude_none=True)

    # Database uses `model`; API uses `model_designation`
    if "model_designation" in payload:
        payload["model"] = payload.pop("model_designation")

    # Convert date to ISO string if present
    if "submission_date" in payload and isinstance(payload["submission_date"], date):
        payload["submission_date"] = payload["submission_date"].isoformat()

    # These fields come from the authenticated identity — never from the request body.
    payload["laboratory_id"] = caller.laboratory_id
    payload["created_by"] = caller.user_id
    payload["status"] = "registered"
    payload["created_at"] = now
    payload["updated_at"] = now

    result = (
        client
        .table("instruments")
        .insert(payload)
        .select("*")
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail="Instrument was not created."
        )

    instrument = result.data[0]

    return instrument


# ── PATCH /api/instruments/{id} ────────────────────────────────────────────────

@router.patch("/{instrument_id}", response_model=InstrumentResponse)
async def update_instrument(
    instrument_id: str,
    body: UpdateInstrumentRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    # Fetch instrument first to verify ownership/lab
    fetch = (
        client.table("instruments")
        .select("*")
        .eq("id", instrument_id)
        .eq("laboratory_id", caller.laboratory_id)
        .single()
        .execute()
    )

    if not fetch.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instrument not found.",
        )

    instrument = fetch.data
    _assert_can_modify(instrument, caller)

    # If serial number changed, check for duplicates
    updates = body.model_dump(exclude_none=True)
    new_serial = updates.get("serial_number")
    if new_serial and new_serial != instrument["serial_number"]:
        dup_check = (
            client.table("instruments")
            .select("id")
            .eq("laboratory_id", caller.laboratory_id)
            .eq("serial_number", new_serial)
            .neq("id", instrument_id)
            .execute()
        )
        if dup_check.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An instrument with serial number '{new_serial}' already exists in this laboratory.",
            )

    if not updates:
        return _row_to_response(instrument)

    # Convert date to ISO string if present
    if "submission_date" in updates and isinstance(updates["submission_date"], date):
        updates["submission_date"] = updates["submission_date"].isoformat()

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        client.table("instruments")
        .update(updates)
        .eq("id", instrument_id)
        .select("*")
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update instrument. Please try again.",
        )

    return _row_to_response(result.data)


# ── DELETE /api/instruments/{id} ───────────────────────────────────────────────

@router.delete("/{instrument_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_instrument(
    instrument_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    _assert_can_delete(caller)

    # Verify instrument belongs to this laboratory before deleting
    fetch = (
        client.table("instruments")
        .select("id")
        .eq("id", instrument_id)
        .eq("laboratory_id", caller.laboratory_id)
        .single()
        .execute()
    )

    if not fetch.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instrument not found.",
        )

    client.table("instruments").delete().eq("id", instrument_id).execute()
