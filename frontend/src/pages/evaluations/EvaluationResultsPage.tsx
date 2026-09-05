/**
 * METRA — pages/evaluations/EvaluationResultsPage.tsx
 * Route: /app/evaluations/:evaluationId/results
 * Steps 4 & 5: Compliance Summary, Rule Traceability, and Evaluation Finalization.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon,
  FileTextIcon,
  ArrowRight01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Stepper, EVALUATION_STEPS } from "@/components/common/Stepper";
import { SectionCard } from "@/components/common/SectionCard";
import { ResultBadge, StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { getEvaluation, finalizeEvaluation } from "@/services/api/evaluations";
import { LoadingState } from "@/components/common/EmptyState";
import type { Evaluation, EvaluationStatus } from "@/types/evaluation";

export default function EvaluationResultsPage() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setFinalizing(true);
    setErrorMessage(null);
    try {
      await finalizeEvaluation(evaluationId);
      // Navigate to reports page upon finalization
      navigate("/app/reports");
    } catch (err: any) {
      console.error("Finalize error:", err);
      setErrorMessage(err?.message || "Failed to finalize evaluation.");
    } finally {
      setFinalizing(false);
    }
  };

  const overallResultStr = typeof evaluation?.overall_result === "object"
    ? (evaluation?.overall_result as any)?.result
    : evaluation?.overall_result || "PASS";

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
              <ResultBadge result={(overallResultStr as any) || "PASS"} />
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
                    {evaluation.test_results.map((tr) => (
                      <tr key={tr.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-medium text-foreground">{tr.test_name}</td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">{tr.clause || "A.4"}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={tr.status as any} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <ResultBadge result={(tr.manual_result as any) || "PASS"} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Finalization Actions */}
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" size="sm" onClick={() => navigate(`/app/evaluations/${evaluationId}/tests`)}>
              Back to Tests
            </Button>
            <Button size="sm" onClick={handleFinalize} disabled={finalizing} className="gap-1.5">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
              {finalizing ? "Finalizing..." : "Finalize & Generate Report"}
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
