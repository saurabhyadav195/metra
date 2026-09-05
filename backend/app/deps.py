"""
METRA Backend — app/deps.py
FastAPI dependencies for authentication and authorization.

Security model:
- The Supabase JWT from the Authorization header is verified server-side.
- The user's laboratory_id and role come ONLY from the profiles table.
- These are NEVER taken from the request body or URL parameters.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from app.config import settings

security = HTTPBearer()


@lru_cache
def get_supabase_client() -> Client:
    """Return a cached Supabase admin client (service role key).
    This client bypasses RLS for profile lookups.
    """
    return create_client(settings.supabase_url, settings.supabase_service_key)


@dataclass(frozen=True)
class AuthenticatedUser:
    """Resolved identity of the calling user."""
    user_id: str
    laboratory_id: str
    role: str  # 'owner' | 'admin' | 'engineer'
    full_name: str


async def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    client: Client = Depends(get_supabase_client),
) -> AuthenticatedUser:
    """
    FastAPI dependency that:
    1. Verifies the Supabase JWT.
    2. Fetches the caller's profile from the database.
    3. Returns an AuthenticatedUser with trusted identity.

    Raises 401 if the token is invalid/expired.
    Raises 403 if the user has no profile in the system.
    """
    token = credentials.credentials

    # Step 1: Verify JWT via Supabase — this makes a server-to-server call.
    try:
        user_response = client.auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_response or not user_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = user_response.user.id

    # Step 2: Fetch the METRA profile — authoritative source of lab and role.
    try:
        result = (
            client.table("profiles")
            .select("id, laboratory_id, role, full_name, is_active")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found. Contact your laboratory administrator.",
        )

    profile = result.data
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found. Contact your laboratory administrator.",
        )

    if not profile.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated.",
        )

    return AuthenticatedUser(
        user_id=user_id,
        laboratory_id=profile["laboratory_id"],
        role=profile["role"],
        full_name=profile["full_name"],
    )


def require_roles(*roles: str):
    """Return a dependency that enforces the caller has one of the given roles."""
    async def _check(
        caller: AuthenticatedUser = Depends(get_authenticated_user),
    ) -> AuthenticatedUser:
        if caller.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {' or '.join(roles)}.",
            )
        return caller

    return _check
