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
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Pending Verification", value: "PENDING_VERIFICATION" },
  { label: "Approved", value: "APPROVED" },
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
    const st = String(ev.status || "").toUpperCase();
    if (activeTab === "IN_PROGRESS") {
      return st === "IN_PROGRESS" || st === "DRAFT" || st === "REQUIRES_REWORK";
    }
    return st === activeTab;
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
                : tab.value === "IN_PROGRESS"
                ? evaluations.filter((e) => {
                    const st = String(e.status || "").toUpperCase();
                    return st === "IN_PROGRESS" || st === "DRAFT" || st === "REQUIRES_REWORK";
                  }).length
                : evaluations.filter((e) => String(e.status || "").toUpperCase() === tab.value).length;

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
                <tr className="border-b border-border bg-muted/70">
                  <th className="w-[17%] px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
                    Evaluation ID
                  </th>
                  <th className="w-[18%] px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
                    Model
                  </th>
                  <th className="w-[18%] px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
                    Serial No
                  </th>
                  <th className="w-[15%] px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
                    OIML Edition
                  </th>
                  <th className="w-[13%] px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="w-[10%] hidden px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide lg:table-cell">
                    Created
                  </th>
                  <th className="w-[9%] px-4 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wide">
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
                    <td className="w-[17%] px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-medium text-foreground">
                        {(ev as any).evaluation_number || `EVL-${strId(ev.id)}`}
                      </span>
                    </td>
                    <td className="w-[18%] px-4 py-3 text-xs text-foreground font-medium whitespace-nowrap">
                      {ev.instruments?.model || (ev as any).instrument_model || "—"}
                    </td>
                    <td className="w-[18%] px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {ev.instruments?.serial_number || (ev as any).serial_number || "—"}
                    </td>
                    <td className="w-[15%] px-4 py-3 text-xs text-foreground font-medium whitespace-nowrap">
                      {ev.oiml_edition || "2006 (E)"}
                    </td>
                    <td className="w-[13%] px-4 py-3 whitespace-nowrap">
                      <StatusBadge
                        type="evaluation"
                        status={ev.status as EvaluationStatus}
                        size="sm"
                      />
                    </td>
                    <td className="w-[10%] hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell whitespace-nowrap">
                      {formatDate(ev.created_at)}
                    </td>
                    <td className="w-[9%] px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/app/evaluations/${ev.id}`)}
                        className="text-xs"
                      >
                        {["IN_PROGRESS", "DRAFT", "REQUIRES_REWORK"].includes(String(ev.status || "").toUpperCase())
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
