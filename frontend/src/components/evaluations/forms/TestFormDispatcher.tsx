/**
 * METRA — components/evaluations/forms/TestFormDispatcher.tsx
 * Dynamic dispatcher rendering test-specific observation forms based on test_id / test_code.
 *
 * CRITICAL CONTRACT:
 *  - Never returns undefined / null — always renders a valid component.
 *  - All matched test IDs are checked BEFORE broad string-includes rules
 *    so a specific test is never accidentally caught by a generic pattern.
 *  - Falls back to GenericObservationForm for any unrecognised test.
 *  - Never crashes: the ErrorBoundary in TestExecutionPage wraps this component,
 *    but we also guarantee every branch returns a renderable element.
 *
 * TEST-SPECIFIC ROUTING ORDER (most-specific first):
 *  TEST-A.4.2.1 / TEST-A.4.2.3 / TEST-A.4.11.2  → ZeroSettingTestForm
 *  TEST-A.4.4.1                                   → WeighingTestForm
 *  TEST-A.4.6.1                                   → TareTestForm
 *  TEST-A.4.7                                     → EccentricityTestForm
 *  TEST-A.4.10                                    → RepeatabilityTestForm
 *  TEST-A.4.12                                    → WeighingTestForm (Stability of Equilibrium)
 *  TEST-A.5.3.x                                   → TemperatureTestForm
 *  TEST-A.5.4 / TEST-A.5.2                        → VoltageVariationTestForm
 *  TEST-B.x / TEST-C.x                            → EMCElectricalTestForm
 *  Generic keyword matches                        → appropriate specialist or generic
 *  Fallback                                       → GenericObservationForm
 */

import { WeighingTestForm } from "./WeighingTestForm";
import { RepeatabilityTestForm } from "./RepeatabilityTestForm";
import { EccentricityTestForm } from "./EccentricityTestForm";
import { TareTestForm } from "./TareTestForm";
import { ZeroSettingTestForm } from "./ZeroSettingTestForm";
import { TemperatureTestForm } from "./TemperatureTestForm";
import { VoltageVariationTestForm } from "./VoltageVariationTestForm";
import { EMCElectricalTestForm } from "./EMCElectricalTestForm";
import { GenericObservationForm } from "./GenericObservationForm";

export interface TestFormDispatcherProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export function TestFormDispatcher({
  testId,
  testName,
  observations,
  onObservationsChange,
  disabled = false,
}: TestFormDispatcherProps) {
  const normalizedId = (testId || "").toUpperCase().trim();
  const lowerId = (testId || "").toLowerCase().trim();

  const commonProps = {
    testId,
    testName,
    observations,
    onObservationsChange,
    disabled,
  };

  // ── 1. Zero Setting & Accuracy Tests (TEST-A.4.2.1, TEST-A.4.2.3, TEST-A.4.11.2) ──
  if (
    normalizedId === "TEST-A.4.2.1" ||
    normalizedId === "TEST-A.4.2.3" ||
    normalizedId === "TEST-A.4.11.2"
  ) {
    return <ZeroSettingTestForm {...commonProps} />;
  }

  // ── 2. Weighing Performance Test (TEST-A.4.4.1) ───────────────────────────────
  if (normalizedId === "TEST-A.4.4.1") {
    return <WeighingTestForm {...commonProps} />;
  }

  // ── 3. Tare Test (TEST-A.4.6.1) ───────────────────────────────────────────────
  if (normalizedId === "TEST-A.4.6.1") {
    return <TareTestForm {...commonProps} />;
  }

  // ── 4. Eccentricity Test (TEST-A.4.7) ────────────────────────────────────────
  if (normalizedId === "TEST-A.4.7") {
    return <EccentricityTestForm {...commonProps} />;
  }

  // ── 5. Repeatability Test (TEST-A.4.10) ──────────────────────────────────────
  if (normalizedId === "TEST-A.4.10") {
    return <RepeatabilityTestForm {...commonProps} />;
  }

  // ── 6. Stability of Equilibrium (TEST-A.4.12) ────────────────────────────────
  // IMPORTANT: This must come BEFORE the broad EMC/keyword block below because
  // the test name "Stability of Equilibrium" contains the word "equilibrium",
  // which was previously matched by the EMCElectricalTestForm catch-all.
  if (normalizedId === "TEST-A.4.12") {
    return <WeighingTestForm {...commonProps} />;
  }

  // ── 7. Temperature Tests (TEST-A.5.3.1, TEST-A.5.3.2) ───────────────────────
  if (
    normalizedId === "TEST-A.5.3.1" ||
    normalizedId === "TEST-A.5.3.2"
  ) {
    return <TemperatureTestForm {...commonProps} />;
  }

  // ── 8. Voltage / Warm-up Tests (TEST-A.5.4, TEST-A.5.2) ─────────────────────
  if (
    normalizedId === "TEST-A.5.4" ||
    normalizedId === "TEST-A.5.2"
  ) {
    return <VoltageVariationTestForm {...commonProps} />;
  }

  // ── 9. EMC / Electrical Tests (Annex B, Annex C) ─────────────────────────────
  if (
    normalizedId.startsWith("TEST-B") ||
    normalizedId.startsWith("TEST-C")
  ) {
    return <EMCElectricalTestForm {...commonProps} />;
  }

  // ── 10. Keyword-based fallbacks (for legacy / custom test IDs) ───────────────
  // NOTE: Keyword matching runs AFTER all explicit ID checks above to prevent
  // false positives on test IDs that contain common words.

  if (lowerId.includes("weighing_test") || lowerId === "weighing") {
    return <WeighingTestForm {...commonProps} />;
  }

  if (lowerId.includes("repeatability")) {
    return <RepeatabilityTestForm {...commonProps} />;
  }

  if (lowerId.includes("eccentricity")) {
    return <EccentricityTestForm {...commonProps} />;
  }

  if (lowerId.includes("tare")) {
    return <TareTestForm {...commonProps} />;
  }

  // "zero" includes stability-of-zero and range-of-zero tests
  if (lowerId.includes("zero")) {
    return <ZeroSettingTestForm {...commonProps} />;
  }

  if (lowerId.includes("temp")) {
    return <TemperatureTestForm {...commonProps} />;
  }

  if (
    lowerId.includes("voltage") ||
    lowerId.includes("warmup") ||
    lowerId.includes("warm-up")
  ) {
    return <VoltageVariationTestForm {...commonProps} />;
  }

  if (
    lowerId.includes("damp") ||
    lowerId.includes("burst") ||
    lowerId.includes("esd") ||
    lowerId.includes("radiated") ||
    lowerId.includes("conducted") ||
    lowerId.includes("dip") ||
    lowerId.includes("span") ||
    lowerId.includes("sense") ||
    lowerId.includes("tilting") ||
    lowerId.includes("endurance") ||
    lowerId.includes("discrimination") ||
    lowerId.includes("sensitivity") ||
    lowerId.includes("creep")
  ) {
    return <EMCElectricalTestForm {...commonProps} />;
  }

  // ── 11. Safe Fallback — Generic Observation Form ──────────────────────────────
  // Always renders something valid. Never returns null / undefined.
  return <GenericObservationForm {...commonProps} />;
}
