import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

export default function EngineerDashboard() {
  const { profile, signOut } = useAuth()

  useEffect(() => {
    document.title = 'METRA — Engineer Dashboard'
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight text-foreground">
              METRA
            </span>
            <span className="text-xs text-muted-foreground">
              Metrology Evaluation &amp; Test Report Automation
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              {profile?.full_name}
            </span>
            <button
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl">
          <div className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Engineer
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Engineer Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome, {profile?.full_name ?? 'Demo Engineer'}
          </p>

          <div className="mt-8 rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Testing workspace
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
