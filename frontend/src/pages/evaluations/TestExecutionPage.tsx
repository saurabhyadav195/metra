/**
 * METRA — pages/evaluations/TestExecutionPage.tsx
 * Route: /app/evaluations/:evaluationId/tests/:testId
 * Step 3 of 6: Professional Laboratory Test Workbench.
 * Observations input -> Backend OIML engine calculation -> Result & MPE trace.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon,
  CalculatorIcon,
  ArrowLeft01Icon,
  ShieldCheckIcon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Stepper, EVALUATION_STEPS } from "@/components/common/Stepper";
import { SectionCard } from "@/components/common/SectionCard";
import { ResultBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { TestFormDispatcher } from "@/components/evaluations/forms/TestFormDispatcher";
import {
  getTestDetail,
  saveObservations,
  calculateTest,
  completeTest,
} from "@/services/api/evaluations";
import { LoadingState } from "@/components/common/EmptyState";
import type { CalculateTestResponse, EvaluationTestResult } from "@/types/evaluation";

export default function TestExecutionPage() {
  const { evaluationId, testId } = useParams<{ evaluationId: string; testId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [testDetail, setTestDetail] = useState<EvaluationTestResult | null>(null);
  const [observations, setObservations] = useState<Record<string, any>>({});
  const [calcResult, setCalcResult] = useState<CalculateTestResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = `METRA — Test Execution ${testId}`;
    if (evaluationId && testId) {
      getTestDetail(evaluationId, testId)
        .then((detail) => {
          setTestDetail(detail);
          if (detail?.observations) {
            setObservations(detail.observations);
          }
          if (detail?.calculations) {
            // Restore calculation result structure if already computed
            setCalcResult({
              test_id: detail.test_id,
              test_name: detail.test_name,
              status: detail.status,
              overall_decision: detail.manual_result || (detail.status as string),
              summary_message: detail.summary_message || undefined,
              calculations: Array.isArray(detail.calculations) ? detail.calculations : [detail.calculations],
            });
          }
        })
        .catch((err) => console.warn("Notice: Starting test session for", testId, err))
        .finally(() => setLoading(false));
    }
  }, [evaluationId, testId]);

  const handleCalculate = async () => {
    if (!evaluationId || !testId) return;
    setCalculating(true);
    setStatusMessage(null);
    try {
      // 1. Save observations first to backend
      await saveObservations(evaluationId, testId, { observations });
      // 2. Trigger backend OIML rule engine calculation
      const res = await calculateTest(evaluationId, testId);
      setCalcResult(res);
      setStatusMessage("Calculations completed successfully via backend OIML engine.");
    } catch (err: any) {
      console.error("Calculation error:", err);
      setStatusMessage(err?.message || "Calculation failed.");
    } finally {
      setCalculating(false);
    }
  };

  const handleComplete = async () => {
    if (!evaluationId || !testId) return;
    setSaving(true);
    try {
      await saveObservations(evaluationId, testId, { observations });

      // Determine final result from engine calculation or manual form assessment
      const overallDecision =
        (calcResult as any)?.status ||
        (calcResult as any)?.overall_decision ||
        observations?.manual_assessment ||
        "PASS";

      await completeTest(evaluationId, testId, {
        manual_result: overallDecision,
        comment: "Completed via laboratory workbench",
      });
      navigate(`/app/evaluations/${evaluationId}/tests`);
    } catch (err: any) {
      console.error("Completion error:", err);
    } finally {
      setSaving(false);
    }
  };

  const rawTestName = testDetail?.test_name || testId || "Test Procedure";
  const clause = testDetail?.clause || "OIML R 76-1";
  const isNotApplicable =
    testDetail?.applicability_status === "NOT_APPLICABLE" || testDetail?.status === "NOT_APPLICABLE";

  return (
    <AppLayout>
      <PageHeader
        title={`Execution: ${rawTestName}`}
        description={`Clause ${clause} — OIML R-76 Laboratory Test & Deterministic Rule Evaluation`}
        breadcrumbs={[
          { label: "Evaluations", href: "/app/evaluations" },
          { label: "Applicable Tests", href: `/app/evaluations/${evaluationId}/tests` },
          { label: rawTestName },
        ]}
      />

      <div className="mb-6">
        <Stepper steps={EVALUATION_STEPS} currentStep={3} />
      </div>

      {loading ? (
        <LoadingState message="Loading test workbench & OIML rule metadata..." />
      ) : isNotApplicable ? (
        <SectionCard title="Test Not Applicable">
          <div className="p-6 text-center space-y-4">
            <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-500">
              <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">This test is Not Applicable</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                {testDetail?.applicability_reason ||
                  "The verified OIML rule engine has determined that this procedure does not apply to the selected instrument class or construction."}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(`/app/evaluations/${evaluationId}/tests`)}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5 mr-1" />
              Return to Applicable Test Suite
            </Button>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-6">
          {statusMessage && (
            <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary font-medium flex items-center justify-between">
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Dynamic Test Observation Card */}
          <SectionCard
            title={`Test Observations & Inputs — ${rawTestName}`}
            description={`Verified OIML clause ${clause} laboratory measurement fields`}
          >
            <TestFormDispatcher
              testId={testId || ""}
              testName={rawTestName}
              observations={observations}
              onObservationsChange={setObservations}
            />
          </SectionCard>

          {/* Engine Calculation & Rule Trace Output */}
          {calcResult && (
            <SectionCard title="Backend OIML Rule Engine Output & Trace">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Deterministic Compliance Decision</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {(calcResult as any).summary_message || (calcResult as any).status || "Evaluation Completed"}
                    </p>
                  </div>
                  <ResultBadge result={((calcResult as any).status || (calcResult as any).overall_decision || "PASS") as any} />
                </div>

                {/* Calculation Outputs / Table */}
                {((calcResult as any).calculations || (calcResult as any).rows) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Calculated Rows & Compliance Limits
                    </p>

                    {Array.isArray((calcResult as any).calculations?.rows) ? (
                      <div className="overflow-x-auto rounded border border-border">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                              <th className="py-2 px-3">Load L</th>
                              <th className="py-2 px-3">Indication I</th>
                              <th className="py-2 px-3">Error E</th>
                              <th className="py-2 px-3">Corrected Ec</th>
                              <th className="py-2 px-3">MPE Limit</th>
                              <th className="py-2 px-3 text-right">Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {((calcResult as any).calculations.rows as any[]).map((row, idx) => (
                              <tr key={idx} className="hover:bg-muted/20">
                                <td className="py-1.5 px-3">{row.L} {row.position || ""}</td>
                                <td className="py-1.5 px-3">{row.I}</td>
                                <td className="py-1.5 px-3">{row.E >= 0 ? `+${row.E}` : row.E}</td>
                                <td className="py-1.5 px-3 font-bold">{row.Ec >= 0 ? `+${row.Ec}` : row.Ec}</td>
                                <td className="py-1.5 px-3 text-muted-foreground">±{row.mpe_value} ({row.mpe_e}e)</td>
                                <td className="py-1.5 px-3 text-right font-bold">
                                  <span className={row.result === "PASS" ? "text-emerald-600" : "text-destructive"}>
                                    {row.result}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded border border-border bg-muted/20 p-3 space-y-2 font-mono text-xs">
                        <pre className="whitespace-pre-wrap break-all text-[11px] text-foreground">
                          {JSON.stringify((calcResult as any).calculations, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Rule References & Trace */}
                {Array.isArray((calcResult as any).rule_references || (calcResult as any).calculations?.rule_references) && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <HugeiconsIcon icon={ShieldCheckIcon} strokeWidth={2} className="size-3.5 text-primary" />
                      Verified OIML Rule Trace
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {((calcResult as any).rule_references || (calcResult as any).calculations?.rule_references || []).map((ref: any, idx: number) => (
                        <div key={idx} className="rounded border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-mono text-primary flex items-center gap-1.5">
                          <span className="font-bold">{ref.rule_id}</span>
                          <span className="opacity-75">| {ref.standard || "OIML R 76-1"} §{ref.section}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Action Bar */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/evaluations/${evaluationId}/tests`)}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5 mr-1" />
              Back to Test List
            </Button>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCalculate}
                disabled={calculating}
                className="gap-1.5 text-xs"
              >
                <HugeiconsIcon icon={CalculatorIcon} strokeWidth={2} className="size-3.5" />
                {calculating ? "Calculating..." : "Calculate (Engine)"}
              </Button>

              <Button size="sm" onClick={handleComplete} disabled={saving} className="gap-1.5 text-xs">
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3.5" />
                {saving ? "Saving..." : "Save & Complete Test"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
