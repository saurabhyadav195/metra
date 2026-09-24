import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

/**
 * Wraps all /app/* routes.
 * - Shows nothing while session is loading (avoids flash-redirect).
 * - Redirects unauthenticated users to /login.
 * - Shows a clear error if the Auth account exists but the METRA profile
 *   is missing (broken registration state) — does NOT silently open a
 *   blank dashboard.
 * - Renders child routes for fully authenticated users with a profile.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading, profile, signOut } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Auth session exists but profile could not be resolved — broken registration.
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Account Setup Incomplete
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your authentication account exists but the laboratory profile could
            not be loaded. This can happen if registration did not complete
            fully.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please contact support or try registering again with a different
            email address.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
