"""
METRA Backend — app/routers/settings.py
REST endpoints for laboratory settings management.
Accessible to laboratory owner/admin roles.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client, require_roles

router = APIRouter()


class LabSettingsResponse(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    accreditation_number: Optional[str] = None
    default_oiml_edition: str = "2006 (E)"


class UpdateLabSettingsRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
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
            code="NML-OIML",
            default_oiml_edition="2006 (E)",
        )

    lab = res.data[0]
    return LabSettingsResponse(
        id=lab["id"],
        name=lab.get("name") or "National Metrology Laboratory",
        code=lab.get("code"),
        address=lab.get("address"),
        contact_email=lab.get("contact_email"),
        contact_phone=lab.get("contact_phone"),
        accreditation_number=lab.get("accreditation_number"),
        default_oiml_edition=lab.get("default_oiml_edition") or "2006 (E)",
    )


@router.patch("", response_model=LabSettingsResponse)
async def update_lab_settings(
    body: UpdateLabSettingsRequest,
    caller: AuthenticatedUser = Depends(require_roles("owner", "admin")),
    client: Client = Depends(get_supabase_client),
):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        return await get_lab_settings(caller, client)

    res = (
        client.table("laboratories")
        .update(payload)
        .eq("id", caller.laboratory_id)
        .select("*")
        .execute()
    )
    if not res.data:
        return await get_lab_settings(caller, client)

    lab = res.data[0]
    return LabSettingsResponse(
        id=lab["id"],
        name=lab.get("name", "National Metrology Laboratory"),
        code=lab.get("code"),
        address=lab.get("address"),
        contact_email=lab.get("contact_email"),
        contact_phone=lab.get("contact_phone"),
        accreditation_number=lab.get("accreditation_number"),
        default_oiml_edition=lab.get("default_oiml_edition") or "2006 (E)",
    )
