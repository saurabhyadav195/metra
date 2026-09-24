import { supabase } from "./client";
import type { UserProfile } from "@/types/auth";

const DEACTIVATED_MESSAGE =
  "Your account has been deactivated. Please contact your laboratory administrator.";

/**
 * Sign in with email and password via Supabase Auth.
 * Immediately verifies profiles.is_active before granting session access.
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { data: null, profile: null, error };
  }

  if (data?.user) {
    const { profile, error: profileError } = await fetchUserProfile(
      data.user.id,
      data.user.email ?? ""
    );

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return {
        data: null,
        profile: null,
        error: new Error(profileError ?? DEACTIVATED_MESSAGE),
      };
    }

    return { data, profile, error: null };
  }

  return { data, profile: null, error: null };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current session.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Fetch the METRA user profile for the given Supabase Auth user ID.
 * Queries the `profiles` table — role and active status are authoritative from DB.
 */
export async function fetchUserProfile(
  userId: string,
  _email: string
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, laboratory_id, full_name, email, role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[METRA] Profile fetch error:", error.code, error.message);
      const errStr = (error.message || "").toLowerCase();
      if (errStr.includes("failed to fetch") || errStr.includes("network")) {
        return {
          profile: null,
          error: "Unable to reach the server. Check your connection and try again.",
        };
      }
      return { profile: null, error: DEACTIVATED_MESSAGE };
    }

    if (!data || data.is_active === false || data.is_active === null) {
      return { profile: null, error: DEACTIVATED_MESSAGE };
    }

    const profile: UserProfile = {
      id: data.id,
      laboratory_id: data.laboratory_id,
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      is_active: data.is_active,
    };

    return { profile, error: null };
  } catch (err: any) {
    console.error("[METRA] Profile fetch exception:", err);
    return { profile: null, error: DEACTIVATED_MESSAGE };
  }
}

/**
 * Create a new Supabase Auth account.
 * Used during laboratory registration.
 */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined,
    },
  });
  return { data, error };
}
