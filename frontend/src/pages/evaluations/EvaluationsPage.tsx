/**
 * METRA — pages/evaluations/EvaluationsPage.tsx
 * Route: /app/evaluations
 * Lists all evaluations with real API data and status tab filtering.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ClipboardCheckIcon } from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState, LoadingState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { listEvaluations } from "@/services/api/evaluations";
import type { Evaluation, EvaluationStatus } from "@/types/evaluation";

type FilterTab = "all" | string;

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "DRAFT" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Passed", value: "PASSED" },
  { label: "Failed", value: "FAILED" },
];

export default function EvaluationsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    document.title = "METRA — Evaluations";
    listEvaluations()
      .then(setEvaluations)
      .catch((err) => console.error("Failed to list evaluations:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = evaluations.filter((ev) => {
    if (activeTab === "all") return true;
    return ev.status === activeTab;
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Evaluations"
        description="OIML R-76 instrument evaluation records"
        actions={
          <Button size="sm" onClick={() => navigate("/app/instruments")}>
            <HugeiconsIcon
              icon={ClipboardCheckIcon}
              strokeWidth={2}
              className="size-3.5"
            />
            Start Evaluation
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="mb-4 border-b border-border">
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? evaluations.length
                : evaluations.filter((e) => e.status === tab.value).length;

            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={activeTab === tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2 pt-1 text-xs font-medium transition-colors focus-visible:outline-none ${
                  activeTab === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    activeTab === tab.value
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <LoadingState message="Loading laboratory evaluations..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardCheckIcon}
            title="No evaluations found"
            description={
              activeTab === "all"
                ? "Start by selecting an instrument and beginning an evaluation."
                : `No evaluations with status "${activeTab.replace("_", " ").toLowerCase()}" found.`
            }
            action={
              activeTab === "all" ? (
                <Button size="sm" onClick={() => navigate("/app/instruments")}>
                  Go to Instruments
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Evaluation ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    OIML Edition
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide lg:table-cell">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ev) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-foreground">
                        {(ev as any).evaluation_number || `EVL-${strId(ev.id)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground font-medium">
                      {ev.oiml_edition || "2006 (E)"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        type="evaluation"
                        status={ev.status as EvaluationStatus}
                        size="sm"
                      />
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                      {formatDate(ev.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/app/evaluations/${ev.id}`)}
                        className="text-xs"
                      >
                        {ev.status === "IN_PROGRESS" || ev.status === "DRAFT"
                          ? "Continue"
                          : "View"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function strId(id: string): string {
  return String(id).slice(0, 8).toUpperCase();
}
