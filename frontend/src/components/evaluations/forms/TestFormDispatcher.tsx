/**
 * METRA — components/evaluations/forms/TestFormDispatcher.tsx
 * Dynamic dispatcher rendering test-specific observation forms based on test_id / test_code.
 *
 * CRITICAL CONTRACT:
 *  - Never returns undefined / null — always renders a valid component.
 *  - Every OIML R-76 test maps 1-to-1 with its dedicated test page/form.
 *  - Specific test IDs are checked BEFORE string keyword fallbacks.
 *  - Falls back to GenericObservationForm for any unrecognised test.
 */

import { WeighingTestForm } from "./WeighingTestForm";
import { RepeatabilityTestForm } from "./RepeatabilityTestForm";
import { EccentricityTestForm } from "./EccentricityTestForm";
import { TareTestForm } from "./TareTestForm";
import { RangeOfZeroSettingTestForm } from "./RangeOfZeroSettingTestForm";
import { AccuracyOfZeroSettingTestForm } from "./AccuracyOfZeroSettingTestForm";
import { DiscriminationTestForm } from "./DiscriminationTestForm";
import { SensitivityTestForm } from "./SensitivityTestForm";
import { CreepTestForm } from "./CreepTestForm";
import { ZeroReturnTestForm } from "./ZeroReturnTestForm";
import { StabilityEquilibriumTestForm } from "./StabilityEquilibriumTestForm";
import { TiltingTestForm } from "./TiltingTestForm";
import { WarmUpTimeTestForm } from "./WarmUpTimeTestForm";
import { StaticTemperatureTestForm } from "./StaticTemperatureTestForm";
import { TemperatureEffectNoLoadTestForm } from "./TemperatureEffectNoLoadTestForm";
import { TemperatureTestForm } from "./TemperatureTestForm";
import { VoltageVariationTestForm } from "./VoltageVariationTestForm";
import { EnduranceTestForm } from "./EnduranceTestForm";
import { DampHeatTestForm } from "./DampHeatTestForm";
import { ACVoltageDipsTestForm } from "./ACVoltageDipsTestForm";
import { BurstsTestForm } from "./BurstsTestForm";
import { ESDTestForm } from "./ESDTestForm";
import { RadiatedEMFieldTestForm } from "./RadiatedEMFieldTestForm";
import { ConductedRFFieldTestForm } from "./ConductedRFFieldTestForm";
import { SpanStabilityTestForm } from "./SpanStabilityTestForm";
import { SenseFunctionSixWireTestForm } from "./SenseFunctionSixWireTestForm";
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

  // ── 1. RANGE OF ZERO-SETTING (TEST-A.4.2.1) ──────────────────────────────────
  if (normalizedId === "TEST-A.4.2.1") {
    return <RangeOfZeroSettingTestForm {...commonProps} />;
  }

  // ── 2. ACCURACY OF ZERO-SETTING (TEST-A.4.2.3) ───────────────────────────────
  if (normalizedId === "TEST-A.4.2.3") {
    return <AccuracyOfZeroSettingTestForm {...commonProps} />;
  }

  // ── 3. WEIGHING TEST (TEST-A.4.4.1) ───────────────────────────────────────────
  if (normalizedId === "TEST-A.4.4.1") {
    return <WeighingTestForm {...commonProps} />;
  }

  // ── 4. TARE WEIGHING TEST (TEST-A.4.6.1) ──────────────────────────────────────
  if (normalizedId === "TEST-A.4.6.1") {
    return <TareTestForm {...commonProps} />;
  }

  // ── 5. ECCENTRICITY TEST (TEST-A.4.7) ────────────────────────────────────────
  if (normalizedId === "TEST-A.4.7") {
    return <EccentricityTestForm {...commonProps} />;
  }

  // ── 6. DIGITAL DISCRIMINATION TEST (TEST-A.4.8.2) ─────────────────────────────
  if (normalizedId === "TEST-A.4.8.2") {
    return <DiscriminationTestForm {...commonProps} />;
  }

  // ── 7. SENSITIVITY OF NON-SELF-INDICATING INSTRUMENT (TEST-A.4.9) ─────────────
  if (normalizedId === "TEST-A.4.9" || normalizedId === "TEST-A.4.8.1") {
    return <SensitivityTestForm {...commonProps} />;
  }

  // ── 8. REPEATABILITY TEST (TEST-A.4.10) ───────────────────────────────────────
  if (normalizedId === "TEST-A.4.10") {
    return <RepeatabilityTestForm {...commonProps} />;
  }

  // ── 9. CREEP TEST (TEST-A.4.11.1) ─────────────────────────────────────────────
  if (normalizedId === "TEST-A.4.11.1") {
    return <CreepTestForm {...commonProps} />;
  }

  // ── 10. ZERO RETURN TEST (TEST-A.4.11.2) ──────────────────────────────────────
  if (normalizedId === "TEST-A.4.11.2") {
    return <ZeroReturnTestForm {...commonProps} />;
  }

  // ── 11. STABILITY OF EQUILIBRIUM (TEST-A.4.12) ────────────────────────────────
  if (normalizedId === "TEST-A.4.12") {
    return <StabilityEquilibriumTestForm {...commonProps} />;
  }

  // ── 12. TILTING TEST (TEST-A.5.1) ─────────────────────────────────────────────
  if (normalizedId === "TEST-A.5.1") {
    return <TiltingTestForm {...commonProps} />;
  }

  // ── 13. WARM-UP TIME TEST (TEST-A.5.2) ────────────────────────────────────────
  if (normalizedId === "TEST-A.5.2") {
    return <WarmUpTimeTestForm {...commonProps} />;
  }

  // ── 14. STATIC TEMPERATURE TEST (TEST-A.5.3.1) ────────────────────────────────
  if (normalizedId === "TEST-A.5.3.1") {
    return <StaticTemperatureTestForm {...commonProps} />;
  }

  // ── 15. TEMPERATURE EFFECT ON NO-LOAD INDICATION (TEST-A.5.3.2) ───────────────
  if (normalizedId === "TEST-A.5.3.2") {
    return <TemperatureEffectNoLoadTestForm {...commonProps} />;
  }

  // ── 16. VOLTAGE VARIATIONS (TEST-A.5.4) ───────────────────────────────────────
  if (normalizedId === "TEST-A.5.4") {
    return <VoltageVariationTestForm {...commonProps} />;
  }

  // ── 17. ENDURANCE TEST (TEST-A.6) ─────────────────────────────────────────────
  if (normalizedId === "TEST-A.6") {
    return <EnduranceTestForm {...commonProps} />;
  }

  // ── 18. DAMP HEAT, STEADY STATE (TEST-B.2 / TEST-B.2.2) ───────────────────────
  if (normalizedId === "TEST-B.2" || normalizedId === "TEST-B.2.2") {
    return <DampHeatTestForm {...commonProps} />;
  }

  // ── 19. AC MAINS VOLTAGE DIPS AND SHORT INTERRUPTIONS (TEST-B.3.1) ───────────
  if (normalizedId === "TEST-B.3.1") {
    return <ACVoltageDipsTestForm {...commonProps} />;
  }

  // ── 20. BURSTS / FAST TRANSIENTS (TEST-B.3.2) ────────────────────────────────
  if (normalizedId === "TEST-B.3.2") {
    return <BurstsTestForm {...commonProps} />;
  }

  // ── 21. ELECTROSTATIC DISCHARGE (TEST-B.3.4) ─────────────────────────────────
  if (normalizedId === "TEST-B.3.4") {
    return <ESDTestForm {...commonProps} />;
  }

  // ── 22. IMMUNITY TO RADIATED ELECTROMAGNETIC FIELDS (TEST-B.3.5) ─────────────
  if (normalizedId === "TEST-B.3.5") {
    return <RadiatedEMFieldTestForm {...commonProps} />;
  }

  // ── 23. IMMUNITY TO CONDUCTED RADIO-FREQUENCY FIELDS (TEST-B.3.6) ────────────
  if (normalizedId === "TEST-B.3.6") {
    return <ConductedRFFieldTestForm {...commonProps} />;
  }

  // ── 24. SPAN STABILITY TEST (TEST-B.4) ────────────────────────────────────────
  if (normalizedId === "TEST-B.4") {
    return <SpanStabilityTestForm {...commonProps} />;
  }

  // ── 25. TESTING THE SENSE FUNCTION (6-WIRE CONNECTION) (TEST-C.3.3) ─────────
  if (normalizedId === "TEST-C.3.3") {
    return <SenseFunctionSixWireTestForm {...commonProps} />;
  }

  // ── Keyword-based Fallbacks for Legacy / Custom Test IDs ─────────────────────
  if (lowerId.includes("range_of_zero") || lowerId.includes("zero_range")) {
    return <RangeOfZeroSettingTestForm {...commonProps} />;
  }

  if (lowerId.includes("accuracy_of_zero") || lowerId.includes("zero_accuracy")) {
    return <AccuracyOfZeroSettingTestForm {...commonProps} />;
  }

  if (lowerId.includes("zero_return")) {
    return <ZeroReturnTestForm {...commonProps} />;
  }

  if (lowerId.includes("weighing")) {
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

  if (lowerId.includes("discrimination")) {
    return <DiscriminationTestForm {...commonProps} />;
  }

  if (lowerId.includes("sensitivity")) {
    return <SensitivityTestForm {...commonProps} />;
  }

  if (lowerId.includes("creep")) {
    return <CreepTestForm {...commonProps} />;
  }

  if (lowerId.includes("stability_of_equilibrium") || lowerId.includes("equilibrium_stability")) {
    return <StabilityEquilibriumTestForm {...commonProps} />;
  }

  if (lowerId.includes("tilting") || lowerId.includes("tilt")) {
    return <TiltingTestForm {...commonProps} />;
  }

  if (lowerId.includes("warmup") || lowerId.includes("warm-up") || lowerId.includes("warm_up")) {
    return <WarmUpTimeTestForm {...commonProps} />;
  }

  if (lowerId.includes("static_temp") || lowerId.includes("static_temperature")) {
    return <StaticTemperatureTestForm {...commonProps} />;
  }

  if (lowerId.includes("temp_effect") || lowerId.includes("temperature_effect")) {
    return <TemperatureEffectNoLoadTestForm {...commonProps} />;
  }

  if (lowerId.includes("temp")) {
    return <TemperatureTestForm {...commonProps} />;
  }

  if (lowerId.includes("voltage_variation") || lowerId.includes("voltage")) {
    return <VoltageVariationTestForm {...commonProps} />;
  }

  if (lowerId.includes("endurance") || lowerId.includes("durability")) {
    return <EnduranceTestForm {...commonProps} />;
  }

  if (lowerId.includes("damp") || lowerId.includes("humidity")) {
    return <DampHeatTestForm {...commonProps} />;
  }

  if (lowerId.includes("dip") || lowerId.includes("interruption")) {
    return <ACVoltageDipsTestForm {...commonProps} />;
  }

  if (lowerId.includes("burst") || lowerId.includes("transient")) {
    return <BurstsTestForm {...commonProps} />;
  }

  if (lowerId.includes("esd") || lowerId.includes("electrostatic")) {
    return <ESDTestForm {...commonProps} />;
  }

  if (lowerId.includes("radiated")) {
    return <RadiatedEMFieldTestForm {...commonProps} />;
  }

  if (lowerId.includes("conducted")) {
    return <ConductedRFFieldTestForm {...commonProps} />;
  }

  if (lowerId.includes("span_stability") || lowerId.includes("span")) {
    return <SpanStabilityTestForm {...commonProps} />;
  }

  if (lowerId.includes("sense") || lowerId.includes("6-wire") || lowerId.includes("6_wire")) {
    return <SenseFunctionSixWireTestForm {...commonProps} />;
  }

  if (lowerId.startsWith("test-b") || lowerId.startsWith("test-c")) {
    return <EMCElectricalTestForm {...commonProps} />;
  }

  // ── Safe Fallback ─────────────────────────────────────────────────────────────
  return <GenericObservationForm {...commonProps} />;
}
