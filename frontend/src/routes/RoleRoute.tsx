import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types/auth";
import { LoadingState } from "@/components/common/EmptyState";

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
 *
 * FIXED: Previously returned null while profile was loading, causing a blank screen.
 * Now shows a LoadingState until the profile is available.
 */
export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { profile, isLoading } = useAuth();

  // Wait for auth profile to be fully loaded before rendering role content
  if (isLoading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState message="Loading…" />
      </div>
    );
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={ROLE_DASHBOARD[profile.role]} replace />;
  }

  return <>{children}</>;
}
