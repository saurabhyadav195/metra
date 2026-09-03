import { supabase } from "./client";
import type { UserProfile, UserRole } from "@/types/auth";

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
 * Derive role from a demo email address.
 * Only used as a fallback until the profiles table is configured.
 */
function deriveRoleFromEmail(email: string): UserRole {
  if (email.includes("demo.owner")) return "owner";
  if (email.includes("demo.admin")) return "admin";
  if (email.includes("demo.engineer")) return "engineer";
  // Default to engineer for unknown users
  return "engineer";
}

/**
 * Fetch the METRA user profile for the given user ID.
 *
 * Currently derives the profile from the authenticated user's email
 * since the Supabase profiles table is not yet configured.
 * This will be replaced with an actual database query once the
 * profiles table and RLS policies are set up.
 */
export async function fetchUserProfile(
  userId: string,
  email: string
): Promise<{ profile: UserProfile | null; error: string | null }> {
  // TODO: Replace with actual Supabase query once profiles table exists:
  // const { data, error } = await supabase
  //   .from("profiles")
  //   .select("*")
  //   .eq("id", userId)
  //   .single();

  try {
    const role = deriveRoleFromEmail(email);
    const namePart = role.charAt(0).toUpperCase() + role.slice(1);

    const profile: UserProfile = {
      id: userId,
      laboratory_id: "demo-lab-001",
      full_name: `Demo ${namePart}`,
      email,
      role,
      is_active: true,
    };

    return { profile, error: null };
  } catch {
    return { profile: null, error: "Failed to fetch user profile." };
  }
}
