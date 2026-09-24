/**
 * METRA Frontend — services/supabase/laboratories.ts
 *
 * Laboratory registration is delegated entirely to the FastAPI backend via
 * POST /api/auth/register-laboratory.  The backend uses its Supabase
 * service-role key to atomically create:
 *   1. Supabase Auth user
 *   2. laboratories row
 *   3. profiles row (id = auth user UUID, role = "owner")
 *
 * The frontend never inserts into `laboratories` or `profiles` directly —
 * that would require the service-role key in the browser bundle, which is
 * a serious security violation.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface RegisterLaboratoryInput {
  // Laboratory
  lab_name: string;
  lab_license?: string;
  lab_address?: string;
  lab_city?: string;
  lab_state?: string;
  lab_country?: string;
  lab_email: string;
  lab_phone?: string;

  // Owner account
  owner_name: string;
  owner_email: string;
  owner_password: string;
}

export interface RegisterLaboratoryResult {
  success: boolean;
  message: string;
  user_id?: string;
  laboratory_id?: string;
  email_confirmation_required?: boolean;
  error?: string;   // human-readable error for display
}

/**
 * Register a new laboratory owner account.
 * Calls the backend's public registration endpoint which atomically creates
 * the Auth user, laboratory record, and owner profile using the service-role key.
 *
 * Never throws — always returns a result with success/error distinction.
 */
export async function registerLaboratory(
  input: RegisterLaboratoryInput
): Promise<RegisterLaboratoryResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register-laboratory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    let body: Record<string, unknown>;
    try {
      body = await response.json();
    } catch {
      return {
        success: false,
        message: "Unexpected server response.",
        error: "The server returned an unexpected response. Please try again.",
      };
    }

    if (!response.ok) {
      const detail =
        typeof body.detail === "string"
          ? body.detail
          : `Registration failed (HTTP ${response.status}).`;

      console.error("[METRA] Registration backend error:", response.status, body);

      // Map specific HTTP statuses to user-friendly messages
      if (response.status === 409) {
        return {
          success: false,
          message: detail,
          error: "An account with this email already exists. Please sign in instead.",
        };
      }

      return {
        success: false,
        message: detail,
        error: detail,
      };
    }

    return {
      success: true,
      message: (body.message as string) ?? "Laboratory account created successfully.",
      user_id: body.user_id as string | undefined,
      laboratory_id: body.laboratory_id as string | undefined,
      email_confirmation_required: (body.email_confirmation_required as boolean) ?? false,
    };
  } catch (networkErr) {
    console.error("[METRA] Registration network error:", networkErr);
    return {
      success: false,
      message: "Unable to reach the server.",
      error: "Unable to reach the server. Check your connection and try again.",
    };
  }
}
