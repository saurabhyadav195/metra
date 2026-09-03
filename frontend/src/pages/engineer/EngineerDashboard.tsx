import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";

export default function EngineerDashboard() {
  const { profile } = useAuth();

  useEffect(() => {
    document.title = "METRA — Engineer Dashboard";
  }, []);

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Engineer
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Engineer Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, {profile?.full_name ?? "—"}
        </p>

        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Testing Workspace
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            OIML R-76 evaluation procedures, instrument testing, and test report
            generation will be available here.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

