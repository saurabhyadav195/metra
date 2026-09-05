/**
 * METRA — components/evaluations/forms/TestFormDispatcher.tsx
 * Dynamic dispatcher rendering test-specific observation forms based on test_id / test_code
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

  // 1. Weighing Test (TEST-A.4.4.1 / weighing_test)
  if (normalizedId === "TEST-A.4.4.1" || lowerId.includes("weighing_test") || lowerId === "weighing") {
    return (
      <WeighingTestForm
        testId={testId}
        testName={testName}
        observations={observations}
        onObservationsChange={onObservationsChange}
        disabled={disabled}
      />
    );
  }

  // 2. Repeatability Test (TEST-A.4.10 / repeatability_test)
  if (normalizedId === "TEST-A.4.10" || lowerId.includes("repeatability")) {
    return (
      <RepeatabilityTestForm
        testId={testId}
        testName={testName}
        observations={observations}
        onObservationsChange={onObservationsChange}
        disabled={disabled}
      />
    );
  }

  // 3. Eccentricity Test (TEST-A.4.7 / eccentricity_test)
  if (normalizedId === "TEST-A.4.7" || lowerId.includes("eccentricity")) {
    return (
      <EccentricityTestForm
        testId={testId}
        testName={testName}
        observations={observations}
        onObservationsChange={onObservationsChange}
        disabled={disabled}
      />
    );
  }

  // 4. Tare Test (TEST-A.4.6.1 / tare_test)
  if (normalizedId === "TEST-A.4.6.1" || lowerId.includes("tare")) {
    return (
      <TareTestForm
        testId={testId}
        testName={testName}
        observations={observations}
        onObservationsChange={onObservationsChange}
        disabled={disabled}
      />
    );
  }

  // 5. Zero Setting & Accuracy Tests (TEST-A.4.2.1, TEST-A.4.2.3, TEST-A.4.11.2)
  if (
    normalizedId === "TEST-A.4.2.1" ||
    normalizedId === "TEST-A.4.2.3" ||
    normalizedId === "TEST-A.4.11.2" ||
    lowerId.includes("zero")
  ) {
    return (
      <ZeroSettingTestForm
        testId={testId}
        testName={testName}
        observations={observations}
        onObservationsChange={onObservationsChange}
        disabled={disabled}
      />
    );
  }

  // 6. Temperature Tests (TEST-A.5.3.1, TEST-A.5.3.2)
  if (
    normalizedId === "TEST-A.5.3.1" ||
    normalizedId === "TEST-A.5.3.2" ||
    lowerId.includes("temp")
  ) {
    return (
      <TemperatureTestForm
        testId={testId}
        testName={testName}
        observations={observations}
        onObservationsChange={onObservationsChange}
        disabled={disabled}
      />
    );
  }

  // 7. Voltage Variations & Warm-up (TEST-A.5.4, TEST-A.5.2)
  if (
    normalizedId === "TEST-A.5.4" ||
    normalizedId === "TEST-A.5.2" ||
    lowerId.includes("voltage") ||
    lowerId.includes("warmup") ||
    lowerId.includes("warm-up")
  ) {
    return (
      <VoltageVariationTestForm
        testId={testId}
        testName={testName}
        observations={observations}
        onObservationsChange={onObservationsChange}
        disabled={disabled}
      />
    );
  }

  // 8. EMC / Electrical Tests (TEST-B.2, TEST-B.3.1, TEST-B.3.2, TEST-B.3.4, TEST-B.3.5, TEST-B.3.6, TEST-B.4, TEST-C.3.3, etc.)
  if (
    normalizedId.startsWith("TEST-B") ||
    normalizedId.startsWith("TEST-C") ||
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
    lowerId.includes("creep") ||
    lowerId.includes("equilibrium")
  ) {
    return (
      <EMCElectricalTestForm
        testId={testId}
        testName={testName}
        observations={observations}
        onObservationsChange={onObservationsChange}
        disabled={disabled}
      />
    );
  }

  // 9. Generic Fallback
  return (
    <GenericObservationForm
      testId={testId}
      testName={testName}
      observations={observations}
      onObservationsChange={onObservationsChange}
      disabled={disabled}
    />
  );
}
