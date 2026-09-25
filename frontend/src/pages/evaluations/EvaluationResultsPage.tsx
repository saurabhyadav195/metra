/**
 * METRA — pages/evaluations/EvaluationResultsPage.tsx
 * Route: /app/evaluations/:evaluationId/results
 * Steps 4 & 5: Compliance Summary, Rule Traceability, and Evaluation Finalization.
 *
 * STATUS DISPLAY RULES (critical — do not regress):
 *   NOT_STARTED    → "Not Started" badge, no result badge (unexecuted tests must NEVER show PASS)
 *   NOT_APPLICABLE → "N/A" badge, no result badge
 *   PASS           → StatusBadge + ResultBadge(PASS)
 *   FAIL           → StatusBadge + ResultBadge(FAIL)
 *   IN_PROGRESS    → "In Progress" badge, no result badge
 *   MANUAL_REVIEW  → "Manual Review" badge, no result badge
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Stepper, EVALUATION_STEPS } from "@/components/common/Stepper";
import { SectionCard } from "@/components/common/SectionCard";
import { ResultBadge, StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEvaluation, finalizeEvaluation } from "@/services/api/evaluations";
import { LoadingState } from "@/components/common/EmptyState";
import type { Evaluation, EvaluationStatus } from "@/types/evaluation";

// Statuses that represent "test was actually executed and has a binary result"
const EXECUTED_WITH_RESULT = new Set(["PASS", "FAIL"]);
// Statuses where no result badge should be shown
const NO_RESULT_STATUSES = new Set(["NOT_STARTED", "NOT_APPLICABLE", "IN_PROGRESS", "MANUAL_REVIEW", "PENDING"]);

export default function EvaluationResultsPage() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    document.title = "METRA — Evaluation Results";
    if (evaluationId) {
      getEvaluation(evaluationId)
        .then(setEvaluation)
        .catch((err) => console.error("Failed to load evaluation summary:", err))
        .finally(() => setLoading(false));
    }
  }, [evaluationId]);

  const handleFinalize = async () => {
    if (!evaluationId) return;
    setIsConfirmOpen(false);
    setFinalizing(true);
    setErrorMessage(null);
    try {
      await finalizeEvaluation(evaluationId);
      // Navigate to the report detail page upon finalization
      navigate(`/app/reports/${evaluationId}`);
    } catch (err: any) {
      console.error("Finalize error:", err);
      setErrorMessage(err?.message || "Failed to finalize evaluation.");
    } finally {
      setFinalizing(false);
    }
  };

  const overallResultStr = typeof evaluation?.overall_result === "object"
    ? (evaluation?.overall_result as any)?.result || (evaluation?.overall_result as any)?.status
    : evaluation?.overall_result;

  /** Return the correct result badge value for a test row, or null if no result to show. */
  function resolveTestResult(tr: any): string | null {
    const statusUpper = String(tr.status || "").toUpperCase();

    // These tests were never executed — do NOT show any result badge
    if (NO_RESULT_STATUSES.has(statusUpper)) return null;

    // For executed tests, prefer manual_result if set, else use status
    if (tr.manual_result) return String(tr.manual_result).toUpperCase();
    if (EXECUTED_WITH_RESULT.has(statusUpper)) return statusUpper;

    return null;
  }

  return (
    <AppLayout>
      <PageHeader
        title="Evaluation Compliance Summary"
        description="Review all test results, rule traceability, and finalize laboratory evaluation"
        breadcrumbs={[
          { label: "Evaluations", href: "/app/evaluations" },
          { label: (evaluation as any)?.evaluation_number || `EVL-${evaluationId?.slice(0, 8)}`, href: `/app/evaluations/${evaluationId}` },
          { label: "Results & Finalization" },
        ]}
      />

      <div className="mb-6">
        <Stepper steps={EVALUATION_STEPS} currentStep={4} />
      </div>

      {loading ? (
        <LoadingState message="Assembling evaluation compliance summary..." />
      ) : (
        <div className="space-y-6">
          {errorMessage && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Rejection Banner */}
          {(evaluation?.status === "REQUIRES_REWORK" || (evaluation?.notes || "").startsWith("[REJECTED")) && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-800 dark:text-rose-300">
              <h4 className="font-semibold text-sm">Evaluation Returned for Rework</h4>
              <p className="text-xs mt-1 leading-relaxed">
                {evaluation?.notes || "This evaluation was rejected during manager verification and requires corrections before approval."}
              </p>
            </div>
          )}

          {/* Banner Summary */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Evaluation Reference
              </p>
              <h2 className="text-xl font-mono font-bold text-foreground mt-0.5">
                {(evaluation as any)?.evaluation_number || `EVL-${evaluationId?.slice(0, 8)}`}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Standard: {evaluation?.oiml_edition || "OIML R 76-1 (2006 E)"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={(evaluation?.status as EvaluationStatus) || "DRAFT"} />
              {overallResultStr && <ResultBadge result={overallResultStr} />}
            </div>
          </div>

          {/* Test Execution Summary */}
          <SectionCard
            title="OIML R-76 Test Results Matrix"
            description="Detailed compliance status per test procedure"
          >
            {!evaluation?.test_results?.length ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No test observations completed yet. Please execute test procedures first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                      <th className="py-2.5 px-3">Test Procedure</th>
                      <th className="py-2.5 px-3">Clause</th>
                      <th className="py-2.5 px-3">Execution Status</th>
                      <th className="py-2.5 px-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {evaluation.test_results.map((tr) => {
                      const resultVal = resolveTestResult(tr);
                      return (
                        <tr key={tr.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-medium text-foreground">{tr.test_name}</td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">{tr.clause || "A.4"}</td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={tr.status as any} size="sm" />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {resultVal ? (
                              <ResultBadge result={resultVal} size="sm" />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Evaluation summary counts */}
          {evaluation?.test_results && evaluation.test_results.length > 0 && (() => {
            const tests = evaluation.test_results;
            const applicable = tests.filter(t =>
              String(t.status || "").toUpperCase() !== "NOT_APPLICABLE"
            );
            const passed = applicable.filter(t => String(t.status || "").toUpperCase() === "PASS").length;
            const failed = applicable.filter(t => String(t.status || "").toUpperCase() === "FAIL").length;
            const pending = applicable.filter(t =>
              !["PASS", "FAIL"].includes(String(t.status || "").toUpperCase())
            ).length;
            const na = tests.filter(t => String(t.status || "").toUpperCase() === "NOT_APPLICABLE").length;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Passed", value: passed, color: "text-emerald-600" },
                  { label: "Failed", value: failed, color: "text-rose-600" },
                  { label: "Pending / Not Started", value: pending, color: "text-amber-600" },
                  { label: "Not Applicable", value: na, color: "text-muted-foreground" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg border border-border bg-card p-4 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Finalization Actions */}
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" size="sm" onClick={() => navigate(`/app/evaluations/${evaluationId}/tests`)}>
              Back to Tests
            </Button>

            {evaluation?.status === "APPROVED" ? (
              <Button size="sm" disabled className="gap-1.5 bg-emerald-600 text-white">
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
                Approved & Locked
              </Button>
            ) : evaluation?.status === "PENDING_VERIFICATION" ? (
              <Button size="sm" disabled className="gap-1.5 bg-blue-600 text-white">
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
                Pending Verification
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsConfirmOpen(true)} disabled={finalizing} className="gap-1.5">
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
                {finalizing ? "Finalizing..." : "Finalize & Generate Report"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Finalize & Generate Report */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Evaluation & Generate Report</DialogTitle>
            <DialogDescription>
              Finalizing this evaluation calculates overall compliance across all test procedures, locks test records, and generates the official metrological evaluation report for verification. Are you sure you want to finalize now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? "Finalizing..." : "Confirm & Finalize"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

