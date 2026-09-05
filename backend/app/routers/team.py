"""
METRA Backend — app/routers/team.py
REST endpoints for managing laboratory team members.
Isolated strictly by the authenticated user's laboratory_id.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client, require_roles

router = APIRouter()


class TeamMemberResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: str


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
                is_active=item.get("is_active", True),
                created_at=item.get("created_at") or "",
            )
        )
    return members
