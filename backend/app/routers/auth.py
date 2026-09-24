"""
METRA Backend — app/routers/auth.py

Public endpoint for laboratory owner registration.
Creates the Supabase Auth user + laboratory + profile as one logical
registration transaction, using the service-role key on the backend.

Security:
- SUPABASE_SERVICE_KEY never leaves the backend.
- No VITE_* secrets exposed.
- RLS is bypassed server-side for the insert operations via the admin client.
- Auth user cleanup is attempted on failure so no broken orphan accounts remain.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from supabase import Client

from app.deps import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request / Response models ──────────────────────────────────────────────────

class RegisterLaboratoryRequest(BaseModel):
    # Laboratory fields
    lab_name: str
    lab_code: Optional[str] = None
    laboratory_code: Optional[str] = None
    lab_license: Optional[str] = None
    lab_address: Optional[str] = None
    lab_city: Optional[str] = None
    lab_state: Optional[str] = None
    lab_country: str = "India"
    lab_email: str          # Official laboratory contact email
    lab_phone: Optional[str] = None

    # Owner fields
    owner_name: str
    owner_email: str        # Supabase Auth credential
    owner_password: str     # Supabase Auth credential


class RegisterLaboratoryResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    laboratory_id: Optional[str] = None
    email_confirmation_required: bool = False


# ── Helper: attempt to delete a newly-created auth user on rollback ───────────

def _cleanup_auth_user(client: Client, user_id: str) -> None:
    """
    Best-effort deletion of a Supabase Auth user created during a failed
    registration attempt.  Uses the admin client (service-role key).
    Errors are logged but NOT re-raised so as not to mask the original failure.
    """
    try:
        client.auth.admin.delete_user(user_id)
        logger.info(
            "[register_laboratory] Cleaned up orphan auth user %s after registration failure.",
            user_id,
        )
    except Exception as cleanup_err:
        logger.error(
            "[register_laboratory] Could not delete orphan auth user %s: %s",
            user_id,
            cleanup_err,
        )


# ── Registration endpoint ──────────────────────────────────────────────────────

@router.post(
    "/register-laboratory",
    response_model=RegisterLaboratoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new laboratory and owner account",
)
async def register_laboratory(
    body: RegisterLaboratoryRequest,
    client: Client = Depends(get_supabase_client),
):
    """
    Atomic laboratory registration transaction:
      1. Create Supabase Auth user (owner credentials).
      2. Create `laboratories` row.
      3. Create `profiles` row (id = auth user UUID, role = 'owner').

    If steps 2 or 3 fail, best-effort cleanup of the auth user is performed
    so no broken orphan account is left behind.
    """

    # ── Step 1: Create Supabase Auth user ────────────────────────────────────

    created_user_id: Optional[str] = None

    try:
        auth_resp = client.auth.admin.create_user(
            {
                "email": body.owner_email,
                "password": body.owner_password,
                "email_confirm": True,   # auto-confirm so login works immediately
            }
        )
    except Exception as auth_err:
        err_msg = str(auth_err).lower()
        logger.error("[register_laboratory] Auth user creation failed: %s", auth_err)

        if "already registered" in err_msg or "already exists" in err_msg or "duplicate" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create the authentication account. Please try again.",
        )

    user = getattr(auth_resp, "user", None)
    if not user or not user.id:
        logger.error(
            "[register_laboratory] Auth user creation returned no user object: %s",
            auth_resp,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create the authentication account. Please try again.",
        )

    created_user_id = str(user.id)
    logger.info("[register_laboratory] Auth user created: %s", created_user_id)

    # ── Step 2: Create laboratory record ─────────────────────────────────────

    lab_payload = {
        "name": body.lab_name,
        "address": body.lab_address or None,
        "city": body.lab_city or None,
        "state": body.lab_state or None,
        "country": body.lab_country or "India",
        "email": body.lab_email,
        "phone": body.lab_phone or None,
    }

    lab_code_val = body.lab_code or body.laboratory_code
    if lab_code_val and lab_code_val.strip():
        lab_payload["laboratory_code"] = lab_code_val.strip()

    # registration_number is the DB column mapping to the license / accreditation number supplied.
    if body.lab_license:
        lab_payload["registration_number"] = body.lab_license

    try:
        lab_res = (
            client.table("laboratories")
            .insert(lab_payload)
            .select("id")   # returns SyncQueryRequestBuilder — no .single() here
            .execute()
        )
    except Exception as lab_err:
        err_str = str(lab_err).lower()
        logger.error(
            "[register_laboratory] Laboratory insert failed for auth user %s: %s",
            created_user_id,
            lab_err,
        )
        _cleanup_auth_user(client, created_user_id)
        if "laboratories_laboratory_code_unique" in err_str or "23505" in err_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Laboratory code is already in use.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Laboratory account setup could not be completed. Please try again.",
        )

    # .insert().select().execute() returns data as a list — take the first row
    raw_lab_data = getattr(lab_res, "data", None)
    lab_data = raw_lab_data[0] if (raw_lab_data and len(raw_lab_data) > 0) else None
    if not lab_data or not lab_data.get("id"):
        logger.error(
            "[register_laboratory] Laboratory insert returned no id for auth user %s. Response: %s",
            created_user_id,
            lab_res,
        )
        _cleanup_auth_user(client, created_user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Laboratory account setup could not be completed. Please try again.",
        )

    laboratory_id = lab_data["id"]
    logger.info(
        "[register_laboratory] Laboratory created: %s for auth user %s",
        laboratory_id,
        created_user_id,
    )

    # ── Step 3: Create owner profile ──────────────────────────────────────────

    profile_payload = {
        "id": created_user_id,          # MUST equal auth.users.id
        "laboratory_id": laboratory_id,
        "full_name": body.owner_name,
        "email": body.owner_email,
        "role": "owner",
        "is_active": True,
    }

    try:
        profile_res = (
            client.table("profiles")
            .insert(profile_payload)
            .execute()
        )
    except Exception as profile_err:
        logger.error(
            "[register_laboratory] Profile insert failed for auth user %s / lab %s: %s",
            created_user_id,
            laboratory_id,
            profile_err,
        )
        # Best-effort: delete the laboratory row we just created
        try:
            client.table("laboratories").delete().eq("id", laboratory_id).execute()
            logger.info(
                "[register_laboratory] Cleaned up orphan laboratory %s after profile failure.",
                laboratory_id,
            )
        except Exception as lab_cleanup_err:
            logger.error(
                "[register_laboratory] Could not delete orphan laboratory %s: %s",
                laboratory_id,
                lab_cleanup_err,
            )
        _cleanup_auth_user(client, created_user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Laboratory account setup could not be completed. Please try again.",
        )

    # ── Step 4: Verify both records exist ─────────────────────────────────────

    try:
        verify_res = (
            client.table("profiles")
            .select("id, laboratory_id, role")
            .eq("id", created_user_id)
            .single()
            .execute()
        )
        profile_data = getattr(verify_res, "data", None)
        if not profile_data or profile_data.get("laboratory_id") != laboratory_id:
            raise ValueError("Profile verification failed — record mismatch.")
    except Exception as verify_err:
        logger.error(
            "[register_laboratory] Post-registration verification failed for user %s: %s",
            created_user_id,
            verify_err,
        )
        # Don't roll back at this point — partial data likely committed.
        # Log the issue and return a partial-success so the user can still sign in.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration completed but verification could not be confirmed. Please try signing in.",
        )

    logger.info(
        "[register_laboratory] Registration successful — user=%s lab=%s role=owner",
        created_user_id,
        laboratory_id,
    )

    return RegisterLaboratoryResponse(
        success=True,
        message="Laboratory account created successfully.",
        user_id=created_user_id,
        laboratory_id=laboratory_id,
        email_confirmation_required=False,
    )
