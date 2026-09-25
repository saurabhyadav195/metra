/**
 * METRA — pages/engineer/EngineerDashboard.tsx
 * Route: /app/dashboard for engineer role
 *
 * Changes vs original:
 * - P-1: Migrated from useState+useEffect to React Query
 * - CP-3/VI scaffolding: Removed meaningless "real-time" / "verified" trend props
 * - L-3: QuickActions extracted to reusable component
 */

import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ClipboardCheckIcon,
  Tick02Icon,
  ScaleIcon,
  AddSquareIcon,
  FileTextIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricCard, MetricGrid } from "@/components/common/MetricCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SectionCard } from "@/components/common/SectionCard";
import { QuickActions } from "@/components/common/QuickActions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardStats } from "@/services/api/dashboard";
import { LoadingState, ErrorState } from "@/components/common/EmptyState";
import type { EvaluationStatus } from "@/types/evaluation";

export default function EngineerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  document.title = "METRA — Engineer Dashboard";

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${profile?.full_name ?? "Engineer"}`}
          description="OIML R-76 Type Evaluation Workstation — Laboratory Workbench"
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => navigate("/app/instruments/new")}>
                <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-4 shrink-0" />
                Register Instrument
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/app/evaluations")}>
                <HugeiconsIcon icon={ClipboardCheckIcon} strokeWidth={2} className="size-4 shrink-0" />
                My Evaluations
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <LoadingState message="Loading dashboard metrics…" />
        ) : isError ? (
          <ErrorState
            title="Failed to load dashboard"
            description="Could not retrieve laboratory statistics. Please try again."
            onRetry={() => refetch()}
          />
        ) : (
          <>
            {/* Metric Cards — trend prop removed (was scaffolding: "real-time", "verified") */}
            <MetricGrid columns={4}>
              <MetricCard
                title="Active Evaluations"
                value={stats?.active_evaluations ?? 0}
                description="Draft & In Progress"
                icon={<HugeiconsIcon icon={ClipboardCheckIcon} strokeWidth={2} className="size-5" />}
              />
              <MetricCard
                title="Completed"
                value={stats?.completed_evaluations ?? 0}
                description="Finalized evaluations"
                icon={<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-5" />}
              />
              <MetricCard
                title="My Instruments"
                value={stats?.total_instruments ?? 0}
                description="Registered by you"
                icon={<HugeiconsIcon icon={ScaleIcon} strokeWidth={2} className="size-5" />}
              />
              <MetricCard
                title="Test Reports"
                value={stats?.total_reports ?? 0}
                description="Generated reports"
                icon={<HugeiconsIcon icon={FileTextIcon} strokeWidth={2} className="size-5" />}
              />
            </MetricGrid>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Recent Evaluations Table */}
              <div className="lg:col-span-2">
                <SectionCard
                  title="Recent Evaluations"
                  description="Your latest instrument evaluation activities"
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/app/evaluations")}
                      className="text-xs gap-1"
                    >
                      View all
                      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
                    </Button>
                  }
                >
                  {!stats?.recent_evaluations.length ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No evaluations started yet. Select an instrument to begin evaluation.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/70 text-foreground font-medium">
                            <th className="py-2.5 px-3">Evaluation ID</th>
                            <th className="py-2.5 px-3">Instrument</th>
                            <th className="py-2.5 px-3">Serial No</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {stats.recent_evaluations.map((item) => (
                            <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                                {item.evaluation_number}
                              </td>
                              <td className="py-2.5 px-3 text-foreground font-medium">
                                {item.instrument_model}
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground font-mono">
                                {item.serial_number}
                              </td>
                              <td className="py-2.5 px-3">
                                <StatusBadge status={item.status as EvaluationStatus} />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={() => navigate(`/app/evaluations/${item.id}`)}
                                >
                                  Open
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Quick Actions — extracted to reusable component */}
              <div>
                <QuickActions
                  title="Quick Workstation Actions"
                  items={[
                    { icon: ScaleIcon,          label: "Browse Instruments",    href: "/app/instruments",   iconColor: "text-primary" },
                    { icon: ClipboardCheckIcon, label: "View All Evaluations",  href: "/app/evaluations",   iconColor: "text-success" },
                    { icon: FileTextIcon,       label: "Access Reports",        href: "/app/reports",       iconColor: "text-info" },
                  ]}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
