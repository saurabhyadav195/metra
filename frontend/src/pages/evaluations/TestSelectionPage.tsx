/**
 * METRA — pages/evaluations/TestSelectionPage.tsx
 * Route: /app/evaluations/:evaluationId/tests
 * Step 2 of 6: Applicable OIML R-76 Test Suite Selection.
 * Visually grouped into OIML categories without adding extra workflow steps.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  QuestionIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  AlertCircleIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Stepper, EVALUATION_STEPS } from "@/components/common/Stepper";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { getEvaluation } from "@/services/api/evaluations";
import { LoadingState } from "@/components/common/EmptyState";
import type { Evaluation, EvaluationTestResult } from "@/types/evaluation";

const DEFAULT_TESTS: Partial<EvaluationTestResult>[] = [
  {
    test_id: "TEST-A.4.4.1",
    test_name: "Weighing test",
    clause: "A.4.4.1",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
  {
    test_id: "TEST-A.4.10",
    test_name: "Repeatability test",
    clause: "A.4.10",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
  {
    test_id: "TEST-A.4.7",
    test_name: "Eccentricity test",
    clause: "A.4.7",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
  {
    test_id: "TEST-A.4.8.2",
    test_name: "Discrimination test (digital)",
    clause: "A.4.8.2",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
  {
    test_id: "TEST-A.4.6.1",
    test_name: "Tare weighing test",
    clause: "A.4.6.1",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
  {
    test_id: "TEST-A.4.2.1",
    test_name: "Range of zero-setting",
    clause: "A.4.2.1",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
  {
    test_id: "TEST-A.5.3.1",
    test_name: "Static temperatures",
    clause: "A.5.3.1",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
  {
    test_id: "TEST-A.5.4",
    test_name: "Voltage variations",
    clause: "A.5.4",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
  {
    test_id: "TEST-B.3.4",
    test_name: "Electrostatic discharge (ESD)",
    clause: "B.3.4",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
  {
    test_id: "TEST-B.4",
    test_name: "Span stability test",
    clause: "B.4",
    status: "NOT_STARTED",
    applicability_status: "APPLICABLE",
  },
];

interface TestCategoryGroup {
  id: string;
  title: string;
  description: string;
  tests: EvaluationTestResult[];
}

function groupTestsByCategory(tests: EvaluationTestResult[]): TestCategoryGroup[] {
  const catA: EvaluationTestResult[] = [];
  const catB: EvaluationTestResult[] = [];
  const catC: EvaluationTestResult[] = [];
  const catD: EvaluationTestResult[] = [];

  tests.forEach((t) => {
    const id = (t.test_id || "").toUpperCase();
    const clause = (t.clause || "").toUpperCase();
    const name = (t.test_name || "").toLowerCase();

    // Category C: EMC / ELECTRICAL TESTS
    if (
      id.startsWith("TEST-B.2") ||
      id.startsWith("TEST-B.3") ||
      clause.includes("B.2") ||
      clause.includes("B.3") ||
      name.includes("damp heat") ||
      name.includes("voltage dips") ||
      name.includes("bursts") ||
      name.includes("electrostatic") ||
      name.includes("esd") ||
      name.includes("radiated") ||
      name.includes("conducted")
    ) {
      catC.push(t);
    }
    // Category B: MECHANICAL / ENVIRONMENTAL TESTS
    else if (
      id.startsWith("TEST-A.5") ||
      id.startsWith("TEST-A.6") ||
      clause.includes("A.5") ||
      clause.includes("A.6") ||
      name.includes("tilting") ||
      name.includes("warm-up") ||
      name.includes("warmup") ||
      name.includes("static temperatures") ||
      name.includes("temperature effect") ||
      name.includes("voltage variations") ||
      name.includes("endurance")
    ) {
      catB.push(t);
    }
    // Category D: ADDITIONAL / SPECIAL TESTS
    else if (
      id.startsWith("TEST-B.4") ||
      id.startsWith("TEST-C.3") ||
      clause.includes("B.4") ||
      clause.includes("C.3") ||
      name.includes("span stability") ||
      name.includes("sense function") ||
      name.includes("6-wire")
    ) {
      catD.push(t);
    }
    // Category A: METROLOGICAL TESTS (default for A.4)
    else {
      catA.push(t);
    }
  });

  const groups: TestCategoryGroup[] = [];
  if (catA.length > 0) {
    groups.push({
      id: "metrological",
      title: "A. METROLOGICAL TESTS",
      description: "Static weighing, repeatability, eccentricity, zero setting, tare & performance procedures",
      tests: catA,
    });
  }
  if (catB.length > 0) {
    groups.push({
      id: "environmental",
      title: "B. MECHANICAL / ENVIRONMENTAL TESTS",
      description: "Temperature, tilting, power variations, warm-up & endurance stability tests",
      tests: catB,
    });
  }
  if (catC.length > 0) {
    groups.push({
      id: "emc",
      title: "C. EMC / ELECTRICAL TESTS",
      description: "Electromagnetic compatibility, ESD, radiated/conducted RF & electrical transients",
      tests: catC,
    });
  }
  if (catD.length > 0) {
    groups.push({
      id: "additional",
      title: "D. ADDITIONAL / SPECIAL TESTS",
      description: "Span stability over 28 days & 6-wire sense function compensation",
      tests: catD,
    });
  }

  return groups;
}

export default function TestSelectionPage() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = "METRA — Applicable OIML Tests";
    if (evaluationId) {
      getEvaluation(evaluationId)
        .then(setEvaluation)
        .catch((err) => console.error("Failed to load evaluation tests:", err))
        .finally(() => setLoading(false));
    }
  }, [evaluationId]);

  const testResults: EvaluationTestResult[] = evaluation?.test_results || (DEFAULT_TESTS as any);
  const categories = groupTestsByCategory(testResults);

  const toggleReason = (testId: string) => {
    setExpandedReasons((prev) => ({ ...prev, [testId]: !prev[testId] }));
  };

  const renderStatusBadge = (test: EvaluationTestResult) => {
    const isNotApp = test.applicability_status === "NOT_APPLICABLE" || test.status === "NOT_APPLICABLE";
    const statusStr = String(test.status || "NOT_STARTED").toUpperCase();

    if (isNotApp) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3 text-muted-foreground" />
          NOT APPLICABLE
        </span>
      );
    }
    if (statusStr === "PASS" || statusStr === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3 text-emerald-500" />
          PASS
        </span>
      );
    }
    if (statusStr === "FAIL") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3 text-destructive" />
          FAIL
        </span>
      );
    }
    if (statusStr === "MANUAL_REVIEW") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3 text-amber-500" />
          MANUAL REVIEW
        </span>
      );
    }
    if (statusStr === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3 text-primary" />
          IN PROGRESS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border">
        NOT STARTED
      </span>
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Applicable OIML R-76 Tests"
        description="Select a test procedure to execute observations and calculate compliance"
        breadcrumbs={[
          { label: "Evaluations", href: "/app/evaluations" },
          { label: evaluation?.evaluation_number || `EVL-${evaluationId?.slice(0, 8)}`, href: `/app/evaluations/${evaluationId}` },
          { label: "Applicable Tests" },
        ]}
      />

      <div className="mb-6">
        <Stepper steps={EVALUATION_STEPS} currentStep={2} />
      </div>

      {loading ? (
        <LoadingState message="Loading applicable test suite from OIML rule engine..." />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <SectionCard
              key={cat.id}
              title={cat.title}
              description={cat.description}
            >
              <div className="divide-y divide-border">
                {cat.tests.map((test) => {
                  const isNotApp = test.applicability_status === "NOT_APPLICABLE" || test.status === "NOT_APPLICABLE";
                  const isFinished = test.status === "COMPLETED" || test.status === "PASS" || test.status === "FAIL" || test.status === "IN_PROGRESS";
                  const showReason = expandedReasons[test.test_id];

                  return (
                    <div key={test.test_id} className="py-3.5 px-2 hover:bg-muted/20 transition-colors space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{test.test_name}</span>
                            <span className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                              OIML R 76-1 {test.clause}
                            </span>
                            {renderStatusBadge(test)}
                          </div>
                        </div>

                        <div>
                          {isNotApp ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() => toggleReason(test.test_id)}
                            >
                              <HugeiconsIcon icon={QuestionIcon} strokeWidth={2} className="size-3.5" />
                              Why?
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant={isFinished ? "outline" : "default"}
                              className="text-xs gap-1.5"
                              onClick={() => navigate(`/app/evaluations/${evaluationId}/tests/${test.test_id}`)}
                            >
                              {isFinished ? "Review Data" : "Execute Test"}
                              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Not Applicable reason dropdown note */}
                      {isNotApp && showReason && (
                        <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground font-medium flex items-start gap-2">
                          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4 shrink-0 text-amber-500 mt-0.5" />
                          <div>
                            <span className="font-bold text-foreground">Applicability Exemption: </span>
                            {test.applicability_reason || "This test is not applicable based on verified instrument specifications (e.g., electronic construction, accuracy class, or lack of specific features)."}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ))}

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => navigate(`/app/evaluations/${evaluationId}`)}>
              Back to Setup
            </Button>
            <Button size="sm" onClick={() => navigate(`/app/evaluations/${evaluationId}/results`)}>
              View Evaluation Summary →
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
