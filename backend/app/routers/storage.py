"""
METRA Backend — app/routers/storage.py

REST endpoints for Supabase Storage integration.

Handles:
  - Instrument supporting documents (photos, PDFs, certificates)
    Bucket: metra-supporting-documents
    Path:   {laboratory_id}/instruments/{instrument_id}/{uuid}_{filename}

  - Evaluation report PDFs
    Bucket: metra-reports
    Path:   {laboratory_id}/reports/{evaluation_id}/v{version}.pdf

Security:
  - All endpoints require bearer JWT authentication.
  - laboratory_id is ALWAYS resolved from the authenticated user's profile,
    never from the request body.
  - Signed URLs use the service-role key (backend only) for read access.
  - Upload URLs are generated via the Supabase storage API using service key.
  - The service-role key is NEVER sent to the frontend.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client
from app.config import get_settings

router = APIRouter()

INSTRUMENT_DOCS_BUCKET = "metra-supporting-documents"
REPORTS_BUCKET = "metra-reports"
SIGNED_URL_EXPIRES = 3600  # 1 hour


# ── Request / Response models ─────────────────────────────────────────────────

class ConfirmUploadRequest(BaseModel):
    storage_path: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    instrument_id: str
    file_name: str
    file_type: Optional[str]
    file_size: Optional[int]
    storage_path: str
    signed_url: Optional[str] = None
    created_at: str


class ConfirmReportRequest(BaseModel):
    storage_path: str
    file_name: str
    file_size: Optional[int] = None
    version: Optional[int] = 1


class ReportPdfResponse(BaseModel):
    id: str
    evaluation_id: str
    storage_path: str
    file_name: str
    version: int
    signed_url: str
    generated_at: str
    generated_by: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_signed_upload_url(client: Client, bucket: str, path: str) -> str:
    """Generate a signed upload URL for a given storage path."""
    try:
        res = client.storage.from_(bucket).create_signed_upload_url(path)
        # The supabase-py SDK returns a dict with 'signedURL' or nested structure
        if isinstance(res, dict):
            return res.get("signedUrl") or res.get("signedURL") or res.get("url") or ""
        return ""
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate upload URL: {str(e)}"
        )


def _generate_signed_read_url(client: Client, bucket: str, path: str, expires: int = SIGNED_URL_EXPIRES) -> str:
    """Generate a signed read URL for a stored file."""
    try:
        res = client.storage.from_(bucket).create_signed_url(path, expires)
        if isinstance(res, dict):
            return res.get("signedUrl") or res.get("signedURL") or res.get("url") or ""
        return ""
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate signed read URL: {str(e)}"
        )


def _delete_storage_object(client: Client, bucket: str, path: str) -> None:
    """Delete a file from Supabase Storage. Silently ignores 404."""
    try:
        client.storage.from_(bucket).remove([path])
    except Exception:
        pass  # Best-effort deletion; don't block metadata cleanup


def _verify_instrument_access(
    client: Client,
    instrument_id: str,
    caller: AuthenticatedUser
) -> dict:
    """Verify the instrument exists in the caller's laboratory. Returns instrument row."""
    res = (
        client.table("instruments")
        .select("id, laboratory_id, created_by")
        .eq("id", instrument_id)
        .eq("laboratory_id", caller.laboratory_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instrument not found in your laboratory."
        )
    return res.data[0]


def _verify_evaluation_access(
    client: Client,
    evaluation_id: str,
    caller: AuthenticatedUser
) -> dict:
    """
    Verify the evaluation exists in the caller's laboratory. Returns evaluation row.
    Handles evaluation UUIDs as well as human-readable 'RPT-' reference prefixes safely.
    """
    if evaluation_id.startswith("RPT-"):
        res = (
            client.table("evaluations")
            .select("id, laboratory_id, status")
            .eq("laboratory_id", caller.laboratory_id)
            .execute()
        )
        found = None
        for row in (res.data or []):
            if f"RPT-{str(row['id'])[:8].upper()}" == evaluation_id.upper():
                found = row
                break
        if not found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evaluation not found for given report reference."
            )
        return found

    try:
        uuid.UUID(evaluation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid evaluation UUID format: {evaluation_id}"
        )

    res = (
        client.table("evaluations")
        .select("id, laboratory_id, status")
        .eq("id", evaluation_id)
        .eq("laboratory_id", caller.laboratory_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found in your laboratory."
        )
    return res.data[0]


# ── Instrument Document Endpoints ─────────────────────────────────────────────

@router.get("/instruments/{instrument_id}/documents", response_model=List[DocumentResponse])
async def list_instrument_documents(
    instrument_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """List all uploaded documents/photos for an instrument, with signed read URLs."""
    _verify_instrument_access(client, instrument_id, caller)

    res = (
        client.table("instrument_documents")
        .select("*")
        .eq("instrument_id", instrument_id)
        .eq("laboratory_id", caller.laboratory_id)
        .order("created_at", desc=False)
        .execute()
    )
    docs = res.data or []

    result = []
    for doc in docs:
        signed_url = None
        try:
            signed_url = _generate_signed_read_url(client, INSTRUMENT_DOCS_BUCKET, doc["storage_path"])
        except Exception:
            pass

        result.append(DocumentResponse(
            id=str(doc["id"]),
            instrument_id=str(doc["instrument_id"]),
            file_name=doc["file_name"],
            file_type=doc.get("file_type"),
            file_size=doc.get("file_size"),
            storage_path=doc["storage_path"],
            signed_url=signed_url,
            created_at=str(doc["created_at"]),
        ))

    return result


@router.post("/instruments/{instrument_id}/documents/upload-url")
async def get_instrument_document_upload_url(
    instrument_id: str,
    file_name: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """
    Generate a signed upload URL for uploading a document/photo for an instrument.
    The frontend uploads directly to Supabase Storage using this URL.
    After upload, call /confirm to save metadata to the database.
    """
    _verify_instrument_access(client, instrument_id, caller)

    # Build storage path: {lab_id}/instruments/{inst_id}/{uuid}_{filename}
    safe_name = file_name.replace(" ", "_")
    file_uuid = str(uuid.uuid4())
    storage_path = f"{caller.laboratory_id}/instruments/{instrument_id}/{file_uuid}_{safe_name}"

    signed_url = _generate_signed_upload_url(client, INSTRUMENT_DOCS_BUCKET, storage_path)

    return {
        "signed_url": signed_url,
        "storage_path": storage_path,
        "bucket": INSTRUMENT_DOCS_BUCKET,
    }


@router.post("/instruments/{instrument_id}/documents/confirm")
async def confirm_instrument_document_upload(
    instrument_id: str,
    body: ConfirmUploadRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """
    Confirm a successful upload by saving file metadata to the database.
    Called after the frontend has successfully uploaded the file to Supabase Storage.
    """
    _verify_instrument_access(client, instrument_id, caller)

    now = datetime.now(timezone.utc).isoformat()
    row = {
        "laboratory_id": caller.laboratory_id,
        "instrument_id": instrument_id,
        "uploaded_by": caller.user_id,
        "storage_path": body.storage_path,
        "file_name": body.file_name,
        "file_size": body.file_size,
        "file_type": body.file_type,
        "created_at": now,
    }

    res = client.table("instrument_documents").insert(row).select("*").execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save document metadata.")

    doc = res.data[0]
    signed_url = None
    try:
        signed_url = _generate_signed_read_url(client, INSTRUMENT_DOCS_BUCKET, doc["storage_path"])
    except Exception:
        pass

    return DocumentResponse(
        id=str(doc["id"]),
        instrument_id=str(doc["instrument_id"]),
        file_name=doc["file_name"],
        file_type=doc.get("file_type"),
        file_size=doc.get("file_size"),
        storage_path=doc["storage_path"],
        signed_url=signed_url,
        created_at=str(doc["created_at"]),
    )


@router.delete("/instruments/{instrument_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_instrument_document(
    instrument_id: str,
    doc_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """Delete an instrument document from storage and remove its metadata from the database."""
    _verify_instrument_access(client, instrument_id, caller)

    # Fetch doc to get storage path
    doc_res = (
        client.table("instrument_documents")
        .select("storage_path")
        .eq("id", doc_id)
        .eq("instrument_id", instrument_id)
        .eq("laboratory_id", caller.laboratory_id)
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    storage_path = doc_res.data[0]["storage_path"]

    # Delete from storage (best-effort)
    _delete_storage_object(client, INSTRUMENT_DOCS_BUCKET, storage_path)

    # Delete metadata from DB
    client.table("instrument_documents").delete().eq("id", doc_id).execute()


# ── Report PDF Endpoints ──────────────────────────────────────────────────────

@router.get("/reports/{evaluation_id}/signed-url")
async def get_report_pdf_signed_url(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """
    Returns a signed read URL for the current stored report PDF.
    Returns 404 if no PDF has been generated/stored yet for this evaluation.
    """
    eval_row = _verify_evaluation_access(client, evaluation_id, caller)
    real_eval_id = eval_row["id"]

    # Find the current version PDF for this evaluation
    res = (
        client.table("report_pdfs")
        .select("*")
        .eq("evaluation_id", real_eval_id)
        .eq("laboratory_id", caller.laboratory_id)
        .eq("is_current", True)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )

    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No stored report PDF found for this evaluation."
        )

    pdf = res.data[0]
    signed_url = _generate_signed_read_url(client, REPORTS_BUCKET, pdf["storage_path"])

    return ReportPdfResponse(
        id=str(pdf["id"]),
        evaluation_id=str(pdf["evaluation_id"]),
        storage_path=pdf["storage_path"],
        file_name=pdf["file_name"],
        version=pdf["version"],
        signed_url=signed_url,
        generated_at=str(pdf["generated_at"]),
        generated_by=str(pdf["generated_by"]),
    )


@router.post("/reports/{evaluation_id}/upload-url")
async def get_report_pdf_upload_url(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """
    Generate a signed upload URL for storing a report PDF.
    Automatically increments version number.
    The frontend uploads the PDF blob using this URL, then calls /confirm.
    """
    _verify_evaluation_access(client, evaluation_id, caller)

    # Determine next version number
    existing = (
        client.table("report_pdfs")
        .select("version")
        .eq("evaluation_id", evaluation_id)
        .eq("laboratory_id", caller.laboratory_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    next_version = 1
    if existing.data:
        next_version = (existing.data[0].get("version") or 0) + 1

    file_name = f"report_v{next_version}.pdf"
    storage_path = f"{caller.laboratory_id}/reports/{evaluation_id}/{file_name}"

    signed_url = _generate_signed_upload_url(client, REPORTS_BUCKET, storage_path)

    return {
        "signed_url": signed_url,
        "storage_path": storage_path,
        "file_name": file_name,
        "version": next_version,
        "bucket": REPORTS_BUCKET,
    }


@router.post("/reports/{evaluation_id}/confirm")
async def confirm_report_pdf_upload(
    evaluation_id: str,
    body: ConfirmReportRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client),
):
    """
    Confirm a successful report PDF upload by saving metadata to the database.
    Marks all previous versions as not current.
    """
    _verify_evaluation_access(client, evaluation_id, caller)

    # Mark previous versions as not current
    client.table("report_pdfs").update({"is_current": False}).eq("evaluation_id", evaluation_id).execute()

    now = datetime.now(timezone.utc).isoformat()
    row = {
        "laboratory_id": caller.laboratory_id,
        "evaluation_id": evaluation_id,
        "generated_by": caller.user_id,
        "storage_path": body.storage_path,
        "file_name": body.file_name,
        "file_size": body.file_size,
        "version": body.version or 1,
        "is_current": True,
        "generated_at": now,
    }

    res = client.table("report_pdfs").insert(row).select("*").execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save report PDF metadata.")

    pdf = res.data[0]
    signed_url = _generate_signed_read_url(client, REPORTS_BUCKET, pdf["storage_path"])

    return ReportPdfResponse(
        id=str(pdf["id"]),
        evaluation_id=str(pdf["evaluation_id"]),
        storage_path=pdf["storage_path"],
        file_name=pdf["file_name"],
        version=pdf["version"],
        signed_url=signed_url,
        generated_at=str(pdf["generated_at"]),
        generated_by=str(pdf["generated_by"]),
    )
