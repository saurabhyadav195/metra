"""
METRA Backend — app/routers/settings.py
REST endpoints for laboratory settings management.
Accessible to laboratory owner/admin roles.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client, require_roles

logger = logging.getLogger(__name__)
router = APIRouter()


class LabSettingsResponse(BaseModel):
    id: str
    name: str
    laboratory_code: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    accreditation_number: Optional[str] = None
    default_oiml_edition: str = "2006 (E)"


class UpdateLabSettingsRequest(BaseModel):
    name: Optional[str] = None
    laboratory_code: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    accreditation_number: Optional[str] = None
    default_oiml_edition: Optional[str] = None


@router.get("", response_model=LabSettingsResponse)
async def get_lab_settings(
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    res = (
        client.table("laboratories")
        .select("*")
        .eq("id", caller.laboratory_id)
        .execute()
    )
    if not res.data:
        # Fallback response if laboratory row not populated
        return LabSettingsResponse(
            id=caller.laboratory_id,
            name="National Metrology Laboratory",
            laboratory_code=None,
            default_oiml_edition="2006 (E)",
        )

    lab = res.data[0]
    return LabSettingsResponse(
        id=lab["id"],
        name=lab.get("name"),
        laboratory_code=lab.get("laboratory_code"),
        address=lab.get("address"),
        contact_email=lab.get("email"),
        contact_phone=lab.get("phone"),
        accreditation_number=lab.get("registration_number"),
        default_oiml_edition=lab.get("default_oiml_edition") or "2006 (E)",
    )


@router.patch("", response_model=LabSettingsResponse)
async def update_lab_settings(
    body: UpdateLabSettingsRequest,
    caller: AuthenticatedUser = Depends(require_roles("owner", "admin")),
    client: Client = Depends(get_supabase_client),
):
    payload = body.model_dump(exclude_none=True)

    # Map frontend DTO field names to real database column names
    if "contact_email" in payload:
        payload["email"] = payload.pop("contact_email")
    if "contact_phone" in payload:
        payload["phone"] = payload.pop("contact_phone")
    if "accreditation_number" in payload:
        payload["registration_number"] = payload.pop("accreditation_number")

    # Handle laboratory_code whitespace normalization
    if "laboratory_code" in payload:
        val = payload["laboratory_code"]
        if isinstance(val, str):
            val = val.strip()
            payload["laboratory_code"] = val if val else None

    # Strip non-DB columns
    payload.pop("default_oiml_edition", None)

    if not payload:
        return await get_lab_settings(caller, client)

    try:
        res = (
            client.table("laboratories")
            .update(payload)
            .eq("id", caller.laboratory_id)
            .select("*")
            .execute()
        )
    except Exception as db_err:
        err_msg = str(db_err).lower()
        logger.error(
            "[update_lab_settings] DB update error for lab %s: %s",
            caller.laboratory_id,
            db_err,
        )
        if (
            "23505" in err_msg
            or "unique" in err_msg
            or "laboratories_laboratory_code_unique" in err_msg
            or "already exists" in err_msg
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Laboratory code is already in use.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update laboratory settings. Please try again.",
        )

    if not res.data:
        return await get_lab_settings(caller, client)

    lab = res.data[0]
    return LabSettingsResponse(
        id=lab["id"],
        name=lab.get("name"),
        laboratory_code=lab.get("laboratory_code"),
        address=lab.get("address"),
        contact_email=lab.get("email"),
        contact_phone=lab.get("phone"),
        accreditation_number=lab.get("registration_number"),
        default_oiml_edition=lab.get("default_oiml_edition") or "2006 (E)",
    )
