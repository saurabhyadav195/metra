import { supabase } from "./client";
import type { UserProfile } from "@/types/auth";

/**
 * Sign in with email and password via Supabase Auth.
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
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
 * Queries the `profiles` table — role is authoritative from the database only.
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
      .single();

    if (error) {
      console.error("[METRA] Profile fetch error:", error.code);
      return { profile: null, error: "Failed to load your profile." };
    }

    if (!data) {
      return { profile: null, error: "Profile not found." };
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
  } catch {
    return { profile: null, error: "Failed to load your profile." };
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

