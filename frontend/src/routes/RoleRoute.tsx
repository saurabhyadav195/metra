import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import type { UserRole } from '@/types/auth'

interface RoleRouteProps {
  allowedRoles: UserRole[]
  children: ReactNode
}

/**
 * Renders children only when the authenticated user's role is in allowedRoles.
 * Shows a safe error state for unknown/unconfigured roles — does not crash.
 */
export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { profile } = useAuth()

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">
            Account not configured
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your account is not configured for METRA.
            Please contact your laboratory administrator.
          </p>
        </div>
      </div>
    )
  }

  if (!allowedRoles.includes(profile.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">Access denied</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You do not have permission to access this area.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
