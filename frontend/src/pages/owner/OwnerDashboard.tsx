import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";

export default function OwnerDashboard() {
  const { profile } = useAuth();

  useEffect(() => {
    document.title = "METRA — Owner Dashboard";
  }, []);

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Owner
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Owner Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, {profile?.full_name ?? "—"}
        </p>

        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Laboratory Workspace
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Laboratory management, instrument registry, evaluation oversight,
            and report generation will be available here.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

