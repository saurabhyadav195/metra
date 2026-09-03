import type { User, Session } from "@supabase/supabase-js";

/** Application roles for METRA users */
export type UserRole = "owner" | "admin" | "engineer";

/** Roles available for demo account selection */
export type DemoRole = UserRole;

/** METRA user profile stored in the profiles table */
export interface UserProfile {
  id: string;
  laboratory_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

/** Auth state managed by AuthProvider */
export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
