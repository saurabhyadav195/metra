/**
 * METRA — pages/admin/AdminDashboard.tsx
 * Route: /app/dashboard for admin role
 * Real database metrics for laboratory administration.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ClipboardCheckIcon,
  Tick02Icon,
  ScaleIcon,
  UserGroupIcon,
  FileTextIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricCard, MetricGrid } from "@/components/common/MetricCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardStats, type DashboardStats } from "@/services/api/dashboard";
import { LoadingState } from "@/components/common/EmptyState";
import type { EvaluationStatus } from "@/types/evaluation";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "METRA — Admin Dashboard";
    getDashboardStats()
      .then(setStats)
      .catch((err) => console.error("Failed to load admin stats:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Admin Console — ${profile?.full_name ?? "Administrator"}`}
          description="Laboratory Evaluation Monitoring & Compliance Management"
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => navigate("/app/evaluations")}>
                <HugeiconsIcon icon={ClipboardCheckIcon} strokeWidth={2} className="size-4 shrink-0" />
                Manage Evaluations
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/app/team")}>
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4 shrink-0" />
                Laboratory Team
              </Button>
            </div>
          }
        />

        {loading ? (
          <LoadingState message="Loading laboratory stats..." />
        ) : (
          <>
            <MetricGrid columns={4}>
              <MetricCard
                title="Total Instruments"
                value={stats?.total_instruments ?? 0}
                description="In laboratory catalog"
                icon={<HugeiconsIcon icon={ScaleIcon} strokeWidth={2} className="size-5" />}
              />
              <MetricCard
                title="Active Evaluations"
                value={stats?.active_evaluations ?? 0}
                description="Under evaluation"
                icon={<HugeiconsIcon icon={ClipboardCheckIcon} strokeWidth={2} className="size-5" />}
              />
              <MetricCard
                title="Completed Evaluations"
                value={stats?.completed_evaluations ?? 0}
                description="Finalized reports"
                icon={<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-5" />}
              />
              <MetricCard
                title="Active Engineers"
                value={stats?.engineers_count ?? 0}
                description="Laboratory staff"
                icon={<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-5" />}
              />
            </MetricGrid>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionCard
                  title="Laboratory Evaluations Overview"
                  description="Recent evaluations across all engineers"
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
                      No evaluations registered in this laboratory yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-muted-foreground font-medium">
                            <th className="py-2.5 px-3">Evaluation ID</th>
                            <th className="py-2.5 px-3">Instrument</th>
                            <th className="py-2.5 px-3">Manufacturer</th>
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
                              <td className="py-2.5 px-3 text-muted-foreground">
                                {item.instrument_manufacturer}
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
                                  Review
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

              <div>
                <SectionCard title="Quick Management">
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 h-9 text-xs"
                      onClick={() => navigate("/app/instruments")}
                    >
                      <HugeiconsIcon icon={ScaleIcon} strokeWidth={2} className="size-4 text-primary" />
                      Manage Instruments
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 h-9 text-xs"
                      onClick={() => navigate("/app/team")}
                    >
                      <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4 text-success" />
                      Manage Team
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 h-9 text-xs"
                      onClick={() => navigate("/app/reports")}
                    >
                      <HugeiconsIcon icon={FileTextIcon} strokeWidth={2} className="size-4 text-info" />
                      View Reports
                    </Button>
                  </div>
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
