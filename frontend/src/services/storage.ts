/**
 * METRA Frontend — services/storage.ts
 *
 * Supabase Storage helper for instrument documents and report PDFs.
 *
 * Upload flow:
 *   1. Call backend API to get a signed upload URL + storage_path
 *   2. PUT the file blob directly to the signed URL (no backend proxy, no service key in browser)
 *   3. Call backend API to confirm the upload and save metadata to the DB
 *
 * Read flow:
 *   1. Call backend API to get a signed read URL (1h expiry)
 *   2. Use the signed URL directly in <img>, <iframe>, or anchor href
 *
 * Security:
 *   - The service-role key never leaves the backend.
 *   - The frontend uses only the anon key for Supabase client operations.
 *   - Signed URLs are short-lived (1 hour) and scoped to one object.
 */

import { supabase } from "@/services/supabase/client";
import { apiGet, apiPost, apiDelete } from "@/services/api/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadedDocument {
  id: string;
  instrument_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  signed_url: string | null;
  created_at: string;
}

export interface StoredReportPdf {
  id: string;
  evaluation_id: string;
  storage_path: string;
  file_name: string;
  version: number;
  signed_url: string;
  generated_at: string;
  generated_by: string;
}

export interface UploadUrlResponse {
  signed_url: string;
  storage_path: string;
  file_name?: string;
  version?: number;
  bucket: string;
}

// ── Instrument Document Operations ────────────────────────────────────────────

/**
 * List all documents for an instrument (with signed read URLs).
 */
export function listInstrumentDocuments(instrumentId: string): Promise<UploadedDocument[]> {
  return apiGet<UploadedDocument[]>(`/api/storage/instruments/${instrumentId}/documents`);
}

/**
 * Upload a file as an instrument document.
 * Handles the full 3-step flow: get URL → upload → confirm.
 */
export async function uploadInstrumentDocument(
  instrumentId: string,
  file: File
): Promise<UploadedDocument> {
  // Step 1: Get signed upload URL from backend
  const urlRes = await apiGet<UploadUrlResponse>(
    `/api/storage/instruments/${instrumentId}/documents/upload-url?file_name=${encodeURIComponent(file.name)}`
  );

  // Step 2: Upload file blob directly to Supabase Storage via the signed URL
  await _putToSignedUrl(urlRes.signed_url, file);

  // Step 3: Confirm upload and save metadata to DB
  const doc = await apiPost<UploadedDocument>(
    `/api/storage/instruments/${instrumentId}/documents/confirm`,
    {
      storage_path: urlRes.storage_path,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || "application/octet-stream",
    }
  );

  return doc;
}

/**
 * Delete an instrument document from storage and DB.
 */
export function deleteInstrumentDocument(instrumentId: string, docId: string): Promise<void> {
  return apiDelete(`/api/storage/instruments/${instrumentId}/documents/${docId}`);
}

// ── Report PDF Operations ─────────────────────────────────────────────────────

/**
 * Check if a stored report PDF exists for an evaluation.
 * Returns the PDF metadata (with signed URL) or null if none exists.
 */
export async function getStoredReportPdf(evaluationId: string): Promise<StoredReportPdf | null> {
  try {
    return await apiGet<StoredReportPdf>(`/api/storage/reports/${evaluationId}/signed-url`);
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

/**
 * Upload a report PDF blob to Supabase Storage.
 * Handles the full 3-step flow: get URL → upload → confirm.
 */
export async function uploadReportPdf(
  evaluationId: string,
  pdfBlob: Blob
): Promise<StoredReportPdf> {
  // Step 1: Get signed upload URL from backend
  const urlRes = await apiPost<UploadUrlResponse & { version: number }>(
    `/api/storage/reports/${evaluationId}/upload-url`,
    {}
  );

  // Step 2: Upload PDF blob directly to Supabase Storage via the signed URL
  await _putToSignedUrl(urlRes.signed_url, pdfBlob, "application/pdf");

  // Step 3: Confirm upload and save metadata to DB
  const pdf = await apiPost<StoredReportPdf>(
    `/api/storage/reports/${evaluationId}/confirm`,
    {
      storage_path: urlRes.storage_path,
      file_name: urlRes.file_name || `report_v${urlRes.version}.pdf`,
      file_size: pdfBlob.size,
      version: urlRes.version,
    }
  );

  return pdf;
}

// ── Private Helpers ───────────────────────────────────────────────────────────

/**
 * PUT a file/blob to a Supabase Storage signed upload URL.
 * The signed URL is pre-authorized — no auth header needed.
 */
async function _putToSignedUrl(
  signedUrl: string,
  data: File | Blob,
  contentType?: string
): Promise<void> {
  const mimeType = contentType || (data instanceof File ? data.type : "application/octet-stream");

  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: data,
  });

  if (!response.ok) {
    let detail = `Storage upload failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      detail = body?.message || body?.error || detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
}
