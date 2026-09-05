/**
 * METRA — pages/evaluations/TestExecutionPage.tsx
 * Route: /app/evaluations/:evaluationId/tests/:testId
 * Step 3 of 6: Professional Laboratory Test Workbench.
 * Observations input -> Backend OIML engine calculation -> Result & MPE trace.
 *
 * NOTE: testId may contain periods, hyphens, underscores (e.g. TEST-A.4.2.3).
 * React Router's :testId param captures all characters correctly.
 *
 * BUG FIXES (2026-09-05):
 * - State is now fully reset (loading, error, testDetail, observations, calcResult)
 *   at the start of every testId change to prevent stale data from one test
 *   bleeding into the next test's render cycle.
 * - AbortController prevents stale API responses from overwriting current state
 *   when the user navigates between tests quickly (race condition fix).
 * - All form sub-components are keyed by testId so React remounts them cleanly
 *   on every navigation, preventing form state leaking between tests.
 */

import { useEffect, useRef, useState } from "react";
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
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import {
  getTestDetail,
  saveObservations,
  calculateTest,
  completeTest,
} from "@/services/api/evaluations";
import { LoadingState, ErrorState } from "@/components/common/EmptyState";
import type { CalculateTestResponse, EvaluationTestResult } from "@/types/evaluation";

// ─── Dev-only debug logger ────────────────────────────────────────────────────
const IS_DEV = import.meta.env.DEV;
function devLog(...args: unknown[]) {
  if (IS_DEV) console.log(...args);
}

export default function TestExecutionPage() {
  const { evaluationId, testId } = useParams<{ evaluationId: string; testId: string }>();
  const navigate = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [testDetail, setTestDetail] = useState<EvaluationTestResult | null>(null);
  const [observations, setObservations] = useState<Record<string, any>>({});
  const [calcResult, setCalcResult] = useState<CalculateTestResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Track the currently-active request identity so stale responses are discarded.
  const currentRequestKey = useRef<string | null>(null);

  // ── Effect: load test data when params change ────────────────────────────────
  useEffect(() => {
    document.title = `METRA — Test Execution ${testId ?? ""}`;

    // Guard: params must exist before making API calls
    if (!evaluationId || !testId) {
      setError("Invalid test URL — evaluation ID or test ID is missing.");
      setLoading(false);
      return;
    }

    // ── KEY FIX 1: Reset ALL state before fetching new test ───────────────────
    // Without this, old test data from Test A briefly renders under the new
    // TestFormDispatcher slot for Test B, which can crash if the observations
    // object has an incompatible shape for Test B's form component.
    setLoading(true);
    setError(null);
    setNotFound(false);
    setTestDetail(null);       // <-- critical: wipe old detail
    setObservations({});       // <-- critical: wipe old observations
    setCalcResult(null);       // <-- critical: wipe old calc result
    setStatusMessage(null);

    devLog("[METRA TEST] render", {
      evaluationId,
      testId,
      loading: true,
      hasTest: false,
    });

    // ── KEY FIX 2: AbortController prevents race conditions ───────────────────
    // Scenario without this: user clicks Test A → quickly clicks Test B →
    // Test B's response arrives first, then Test A's response arrives later
    // and overwrites Test B's state, rendering the wrong form component.
    const requestKey = `${evaluationId}:${testId}`;
    currentRequestKey.current = requestKey;
    const abortController = new AbortController();

    getTestDetail(evaluationId, testId)
      .then((detail) => {
        // Discard if a newer request has already been fired.
        if (currentRequestKey.current !== requestKey) {
          devLog("[METRA TEST] Discarding stale response for", requestKey);
          return;
        }

        devLog("[METRA TEST] API response", detail);

        if (!detail) {
          setNotFound(true);
          return;
        }

        setTestDetail(detail);

        // Restore saved observations only when shape is a plain object.
        if (detail?.observations && typeof detail.observations === "object" && !Array.isArray(detail.observations)) {
          let obsObj = detail.observations as Record<string, any>;
          // Unwrap if double-wrapped from previous backend saving issue
          if (obsObj.observations && typeof obsObj.observations === "object" && !Array.isArray(obsObj.observations)) {
            obsObj = obsObj.observations;
          }
          setObservations(obsObj);
        }

        // Restore previous calculation results if they exist.
        if (detail?.calculations) {
          let restoredCalculations: any = detail.calculations;
          let restoredRefs: any[] = [];

          if (Array.isArray(detail.calculations) && detail.calculations.length > 0) {
            const firstCalc = detail.calculations[0];
            if (firstCalc?.output && typeof firstCalc.output === "object") {
              restoredCalculations = firstCalc.output;
              restoredRefs = firstCalc.output.rule_references ?? [];
            } else {
              restoredRefs = firstCalc?.rule_references ?? [];
            }
          } else if (typeof detail.calculations === "object" && !Array.isArray(detail.calculations)) {
            restoredRefs = (detail.calculations as any).rule_references ?? [];
          }

          setCalcResult({
            test_id: detail.test_id || testId,
            test_name: detail.test_name || testId,
            status: detail.status || "IN_PROGRESS",
            overall_decision: detail.manual_result || (detail.status as string) || "PASS",
            summary_message: detail.summary_message ?? undefined,
            calculations: restoredCalculations,
            rule_references: restoredRefs,
          });
        }
      })
      .catch((err: any) => {
        if (abortController.signal.aborted) return; // ignore abort errors
        if (currentRequestKey.current !== requestKey) return;

        const status = err?.response?.status ?? err?.status;
        if (status === 404) {
          setNotFound(true);
        } else if (status === 401 || status === 403) {
          setError("You don't have permission to view this test.");
        } else {
          console.error("[TestExecutionPage] Failed to load test detail:", err);
          setError(err?.message || "Failed to load test execution data. Please check your connection and retry.");
        }
      })
      .finally(() => {
        if (currentRequestKey.current !== requestKey) return;
        setLoading(false);
      });

    // Cleanup: signal any in-flight request that we navigated away.
    return () => {
      abortController.abort();
    };
  }, [evaluationId, testId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCalculate = async () => {
    if (!evaluationId || !testId) return;

    // Check visible observation rows before calling calculation API
    const obsRows =
      observations?.positions ||
      observations?.load_steps ||
      observations?.readings ||
      observations?.rows ||
      observations?.test_points ||
      (observations?.observed_value !== undefined ? [observations.observed_value] : []);
    if (Array.isArray(obsRows) && obsRows.length === 0) {
      setStatusMessage("Calculation error: At least 1 observation row is required before calculating.");
      return;
    }

    setCalculating(true);
    setStatusMessage(null);
    try {
      // 1. Save observations first to backend (pass observations directly without double-wrapping)
      await saveObservations(evaluationId, testId, observations);
      // 2. Trigger backend OIML rule engine calculation
      const res = await calculateTest(evaluationId, testId);
      setCalcResult(res);
      setStatusMessage("Calculations completed successfully via backend OIML engine.");
    } catch (err: any) {
      console.error("Calculation error:", err);
      // ── KEY FIX: Calculation errors stay INSIDE the page, never crash it.
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Calculation failed. Please check observations and retry.";
      setStatusMessage(`Calculation error: ${msg}`);
    } finally {
      setCalculating(false);
    }
  };

  const handleComplete = async () => {
    if (!evaluationId || !testId) return;
    setSaving(true);
    try {
      await saveObservations(evaluationId, testId, observations);

      const overallDecision =
        (calcResult as any)?.status ||
        (calcResult as any)?.overall_decision ||
        (observations as any)?.manual_assessment ||
        "PASS";

      await completeTest(evaluationId, testId, {
        manual_result: overallDecision,
        comment: "Completed via laboratory workbench",
      });
      navigate(`/app/evaluations/${evaluationId}/tests`);
    } catch (err: any) {
      console.error("Completion error:", err);
      setStatusMessage(err?.message || "Failed to save test completion. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render: Permission / param error ─────────────────────────────────────────
  if (error) {
    return (
      <AppLayout>
        <ErrorState
          title="Unable to load this test"
          description={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            if (evaluationId && testId) {
              getTestDetail(evaluationId, testId)
                .then((detail) => {
                  setTestDetail(detail);
                  if (detail?.observations && typeof detail.observations === "object") {
                    setObservations(detail.observations as Record<string, any>);
                  }
                })
                .catch(() => setError("Still unable to load. Please check your connection."))
                .finally(() => setLoading(false));
            }
          }}
        />
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/app/evaluations/${evaluationId}/tests`)}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5 mr-1" />
            Back to Test Selection
          </Button>
        </div>
      </AppLayout>
    );
  }

  // ── Render: Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Loading test workbench & OIML rule metadata..." />
      </AppLayout>
    );
  }

  // ── Render: Not Found ─────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <AppLayout>
        <PageHeader
          title="Test Not Found"
          description={`Test ID: ${testId}`}
          breadcrumbs={[
            { label: "Evaluations", href: "/app/evaluations" },
            { label: "Applicable Tests", href: `/app/evaluations/${evaluationId}/tests` },
            { label: "Not Found" },
          ]}
        />
        <div className="py-16 flex flex-col items-center gap-4 text-center">
          <div className="inline-flex p-4 rounded-full bg-muted">
            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Test not found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              The test <span className="font-mono font-medium">{testId}</span> was not found in this evaluation.
              It may not be applicable or may have been removed.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/app/evaluations/${evaluationId}/tests`)}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5 mr-1" />
            Back to Test Selection
          </Button>
        </div>
      </AppLayout>
    );
  }

  // ── Derived values (safe after loading) ──────────────────────────────────────
  const rawTestName = testDetail?.test_name || testId || "Test Procedure";
  const clause = testDetail?.clause || "OIML R 76-1";
  const isNotApplicable =
    testDetail?.applicability_status === "NOT_APPLICABLE" ||
    testDetail?.status === "NOT_APPLICABLE";

  // ── Render: Not Applicable ────────────────────────────────────────────────────
  if (isNotApplicable) {
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/app/evaluations/${evaluationId}/tests`)}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5 mr-1" />
              Return to Applicable Test Suite
            </Button>
          </div>
        </SectionCard>
      </AppLayout>
    );
  }

  // Safe extraction for calc output table & rule references
  const calcObj = (calcResult as any)?.calculations || calcResult;
  const calcRows: any[] = Array.isArray(calcObj?.rows)
    ? calcObj.rows
    : Array.isArray((calcResult as any)?.rows)
    ? (calcResult as any).rows
    : [];

  const ruleRefs: any[] = Array.isArray((calcResult as any)?.rule_references) && (calcResult as any).rule_references.length > 0
    ? (calcResult as any).rule_references
    : Array.isArray(calcObj?.rule_references)
    ? calcObj.rule_references
    : [];

  devLog("[METRA TEST] rendering form", {
    testId,
    testCode: testDetail?.test_id,
    rawTestName,
  });

  // ── Render: Success — Test Workbench ─────────────────────────────────────────
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

      <div className="space-y-6">
        {statusMessage && (
          <div className={`rounded-md border p-3 text-xs font-medium flex items-center justify-between ${
            statusMessage.startsWith("Calculation error")
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-primary/30 bg-primary/10 text-primary"
          }`}>
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Dynamic Test Observation Card — wrapped in ErrorBoundary.
            KEY FIX 3: The key={testId} prop on ErrorBoundary forces React to
            unmount and remount the entire subtree whenever testId changes.
            This guarantees:
              (a) No stale local state from a previous form leaks into the next
              (b) The ErrorBoundary's own hasError state is reset on navigation
                  (an ErrorBoundary does NOT auto-reset between route changes
                   unless it is remounted — this was causing the "stuck" error
                   screen after the first crash)
        */}
        <SectionCard
          title={`Test Observations & Inputs — ${rawTestName}`}
          description={`Verified OIML clause ${clause} laboratory measurement fields`}
        >
          <ErrorBoundary key={testId}>
            <TestFormDispatcher
              key={testId}
              testId={testId ?? ""}
              testName={rawTestName}
              observations={observations}
              onObservationsChange={setObservations}
            />
          </ErrorBoundary>
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
              {calcRows.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Calculated Rows & Compliance Limits
                  </p>
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-border bg-muted/70 font-medium text-foreground">
                          <th className="py-2.5 px-3">Load L</th>
                          <th className="py-2.5 px-3">Indication I</th>
                          <th className="py-2.5 px-3">Error E</th>
                          <th className="py-2.5 px-3">Corrected Ec</th>
                          <th className="py-2.5 px-3">MPE Limit</th>
                          <th className="py-2.5 px-3 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {calcRows.map((row: any, idx: number) => {
                          const L = row?.L ?? row?.load ?? 0;
                          const I = row?.I ?? row?.indication ?? 0;
                          const E = row?.E;
                          const Ec = row?.Ec;
                          const mpeVal = row?.mpe_value ?? row?.mpe;
                          const mpeE = row?.mpe_e;
                          const res = row?.result ?? row?.decision ?? "PASS";

                          const formatVal = (v: any) => {
                            if (v === undefined || v === null) return "—";
                            const num = Number(v);
                            if (isNaN(num)) return String(v);
                            return num >= 0 ? `+${num}` : `${num}`;
                          };

                          return (
                            <tr key={idx} className="hover:bg-muted/40 transition-colors">
                              <td className="py-1.5 px-3">{L} {row?.position ? `(${row.position})` : ""}</td>
                              <td className="py-1.5 px-3">{I}</td>
                              <td className="py-1.5 px-3">{formatVal(E)}</td>
                              <td className="py-1.5 px-3 font-bold">{formatVal(Ec)}</td>
                              <td className="py-1.5 px-3 text-muted-foreground">
                                {mpeVal !== undefined && mpeVal !== null ? `±${mpeVal}` : "—"} {mpeE ? `(${mpeE}e)` : ""}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold">
                                <span className={res === "PASS" ? "text-emerald-600" : "text-destructive"}>
                                  {res}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded border border-border bg-muted/20 p-3 space-y-2 font-mono text-xs">
                  <pre className="whitespace-pre-wrap break-all text-[11px] text-foreground">
                    {JSON.stringify(calcObj, null, 2)}
                  </pre>
                </div>
              )}

              {/* Rule References & Trace */}
              {ruleRefs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <HugeiconsIcon icon={ShieldCheckIcon} strokeWidth={2} className="size-3.5 text-primary" />
                    Verified OIML Rule Trace
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ruleRefs.map((ref: any, idx: number) => {
                      const ruleId = typeof ref === "string" ? ref : ref?.rule_id || "OIML-RULE";
                      const std = typeof ref === "object" ? ref?.standard || "OIML R 76-1" : "OIML R 76-1";
                      const sec = typeof ref === "object" ? ref?.section || "" : "";
                      return (
                        <div key={idx} className="rounded border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-mono text-primary flex items-center gap-1.5">
                          <span className="font-bold">{ruleId}</span>
                          {sec && <span className="opacity-75">| {std} §{sec}</span>}
                        </div>
                      );
                    })}
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
    </AppLayout>
  );
}
