import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import type { AuthState, UserProfile } from "@/types/auth";
import {
  onAuthStateChange,
  fetchUserProfile,
  signOut as supabaseSignOut,
} from "@/services/supabase/auth";

const DEACTIVATED_MESSAGE =
  "Your account has been deactivated. Please contact your laboratory administrator.";

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (authUser: User) => {
    const { profile: fetchedProfile, error } = await fetchUserProfile(
      authUser.id,
      authUser.email ?? ""
    );

    if (error || !fetchedProfile) {
      await supabaseSignOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      if (!error || error.includes("deactivated") || error.includes("Deactivated")) {
        sessionStorage.setItem("metra_deactivation_error", DEACTIVATED_MESSAGE);
      }
      return;
    }

    setProfile(fetchedProfile);
  }, []);

  const handleDeactivatedEvent = useCallback(async () => {
    sessionStorage.setItem("metra_deactivation_error", DEACTIVATED_MESSAGE);
    await supabaseSignOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    const handleDeactivated = () => {
      handleDeactivatedEvent();
    };

    window.addEventListener("metra:deactivated", handleDeactivated);

    const {
      data: { subscription },
    } = onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (
        (event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED") &&
        newSession?.user
      ) {
        await loadProfile(newSession.user);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      window.removeEventListener("metra:deactivated", handleDeactivated);
      subscription.unsubscribe();
    };
  }, [loadProfile, handleDeactivatedEvent]);

  const handleSignOut = useCallback(async () => {
    await supabaseSignOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!session && !!user && profile?.is_active !== false,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Access the current authentication state.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
