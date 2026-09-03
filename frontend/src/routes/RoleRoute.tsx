import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types/auth";

interface RoleRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

const ROLE_DASHBOARD: Record<UserRole, string> = {
  owner: "/app/owner/dashboard",
  admin: "/app/admin/dashboard",
  engineer: "/app/engineer/dashboard",
};

/**
 * Renders children only when the authenticated user's role is in allowedRoles.
 * If the user's role does not match, redirects to their correct dashboard.
 * If the profile is not yet loaded, renders null (ProtectedRoute handles loading).
 */
export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={ROLE_DASHBOARD[profile.role]} replace />;
  }

  return <>{children}</>;
}

