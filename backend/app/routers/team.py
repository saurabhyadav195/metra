"""
METRA Backend — app/routers/team.py
REST endpoints for managing laboratory team members.
Isolated strictly by the authenticated user's laboratory_id.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client, require_roles

logger = logging.getLogger(__name__)
router = APIRouter()


class TeamMemberResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: str


class CreateTeamMemberRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str  # "admin" or "engineer"


class UpdateTeamMemberStatusRequest(BaseModel):
    is_active: bool


@router.get("", response_model=List[TeamMemberResponse])
async def list_team_members(
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """List all profiles belonging to the caller's laboratory."""
    res = (
        client.table("profiles")
        .select("id, full_name, email, role, is_active, created_at")
        .eq("laboratory_id", caller.laboratory_id)
        .order("created_at", desc=False)
        .execute()
    )
    
    members = []
    for item in (res.data or []):
        members.append(
            TeamMemberResponse(
                id=item["id"],
                full_name=item.get("full_name") or "User",
                email=item.get("email") or "",
                role=item.get("role") or "engineer",
                is_active=item.get("is_active") if item.get("is_active") is not None else True,
                created_at=str(item.get("created_at") or ""),
            )
        )
    return members


@router.post(
    "",
    response_model=TeamMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new team member to the caller's laboratory",
)
async def create_team_member(
    body: CreateTeamMemberRequest,
    caller: AuthenticatedUser = Depends(require_roles("owner", "admin")),
    client: Client = Depends(get_supabase_client),
):
    """
    Create a new team member account (Supabase Auth + profiles record).
    Strictly scoped to the caller's laboratory_id.
    - OWNER can create ADMIN or ENGINEER.
    - ADMIN can create ENGINEER.
    - Cannot create OWNER.
    """
    target_role = body.role.lower().strip()
    if target_role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign 'owner' role to new team members.",
        )
    if target_role not in ("admin", "engineer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Allowed roles: admin, engineer.",
        )

    if caller.role == "admin" and target_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators can only add Engineers to the team.",
        )

    email_clean = body.email.strip().lower()
    full_name_clean = body.full_name.strip()

    if not full_name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required.",
        )

    if not body.password or len(body.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    # 1. Check if email already exists in profiles
    try:
        existing = (
            client.table("profiles")
            .select("id")
            .eq("email", email_clean)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[create_team_member] Email pre-check failed: %s", e)

    # 2. Create Supabase Auth User via Service Role Admin Client
    try:
        auth_resp = client.auth.admin.create_user(
            {
                "email": email_clean,
                "password": body.password,
                "email_confirm": True,
            }
        )
    except Exception as auth_err:
        err_str = str(auth_err).lower()
        logger.error("[create_team_member] Auth creation failed for %s: %s", email_clean, auth_err)
        if "already registered" in err_str or "already exists" in err_str or "duplicate" in err_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user authentication account. Please try again.",
        )

    user = getattr(auth_resp, "user", None)
    if not user or not user.id:
        logger.error("[create_team_member] Auth user creation returned empty user object: %s", auth_resp)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user authentication account. Please try again.",
        )

    created_user_id = str(user.id)

    # 3. Create profile row in database
    profile_payload = {
        "id": created_user_id,
        "laboratory_id": caller.laboratory_id,
        "full_name": full_name_clean,
        "email": email_clean,
        "role": target_role,
        "is_active": True,
    }

    try:
        prof_res = client.table("profiles").insert(profile_payload).select("*").execute()
    except Exception as prof_err:
        logger.error(
            "[create_team_member] Profile insert failed for user %s / lab %s: %s",
            created_user_id,
            caller.laboratory_id,
            prof_err,
        )
        try:
            client.auth.admin.delete_user(created_user_id)
        except Exception as cleanup_err:
            logger.error("[create_team_member] Auth cleanup failed: %s", cleanup_err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create team member profile. Please try again.",
        )

    raw_data = getattr(prof_res, "data", None)
    item = raw_data[0] if (raw_data and len(raw_data) > 0) else profile_payload
    return TeamMemberResponse(
        id=created_user_id,
        full_name=item.get("full_name") or full_name_clean,
        email=item.get("email") or email_clean,
        role=item.get("role") or target_role,
        is_active=item.get("is_active") if item.get("is_active") is not None else True,
        created_at=str(item.get("created_at") or ""),
    )


@router.patch(
    "/{member_id}/status",
    response_model=TeamMemberResponse,
    summary="Update active status (deactivate/activate) of a team member",
)
async def update_team_member_status(
    member_id: str,
    body: UpdateTeamMemberStatusRequest,
    caller: AuthenticatedUser = Depends(require_roles("owner", "admin")),
    client: Client = Depends(get_supabase_client),
):
    """
    Deactivate or activate a team member within the caller's laboratory.
    Invariants:
    - Cannot deactivate self.
    - Cannot modify owner.
    - Admin cannot modify admin.
    - Strictly scoped to caller's laboratory_id.
    """
    if member_id == caller.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )

    # 1. Fetch target member profile in caller's laboratory
    target_res = (
        client.table("profiles")
        .select("*")
        .eq("id", member_id)
        .eq("laboratory_id", caller.laboratory_id)
        .execute()
    )
    if not target_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found in your laboratory.",
        )

    target = target_res.data[0]
    target_role = str(target.get("role", "")).lower()

    if target_role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Laboratory owner account status cannot be modified.",
        )

    if caller.role == "admin" and target_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators cannot modify status of other administrators.",
        )

    # 2. Update status
    upd_res = (
        client.table("profiles")
        .update({"is_active": body.is_active})
        .eq("id", member_id)
        .eq("laboratory_id", caller.laboratory_id)
        .select("*")
        .execute()
    )

    if not upd_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update team member status.",
        )

    item = upd_res.data[0]
    return TeamMemberResponse(
        id=item["id"],
        full_name=item.get("full_name") or "User",
        email=item.get("email") or "",
        role=item.get("role") or "engineer",
        is_active=item.get("is_active") if item.get("is_active") is not None else body.is_active,
        created_at=str(item.get("created_at") or ""),
    )
