/**
 * METRA — components/evaluations/forms/EMCElectricalTestForm.tsx
 * Professional Observation Form for EMC & Electrical Disturbance Tests (OIML R 76-1 Annex B)
 * Does NOT force Applied Load / Indicated Value / Error table!
 * Provides structured observation fields & Manual Review requirement.
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, AlertCircleIcon, ShieldCheckIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface EMCElectricalTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export function EMCElectricalTestForm({
  testId,
  testName,
  observations,
  onObservationsChange,
  disabled = false,
}: EMCElectricalTestFormProps) {
  const [testCondition, setTestCondition] = useState<string>(
    observations?.test_condition || "Level 3: 6 kV Contact Discharge / 8 kV Air Discharge"
  );
  const [observedBehavior, setObservedBehavior] = useState<string>(
    observations?.observed_behavior || "No disturbance or temporary loss of function detected. Display remained stable."
  );
  const [instrumentResponse, setInstrumentResponse] = useState<string>(
    observations?.instrument_response || "Normal Operation"
  );
  const [significantFault, setSignificantFault] = useState<boolean>(
    observations?.significant_fault_detected || false
  );
  const [indicationDifference, setIndicationDifference] = useState<number>(
    observations?.indication_difference !== undefined ? Number(observations.indication_difference) : 0.0
  );
  const [engineerNotes, setEngineerNotes] = useState<string>(
    observations?.engineer_notes || "EMC laboratory immunity test executed in accordance with OIML R 76-1 Annex B."
  );
  const [manualAssessment, setManualAssessment] = useState<"PASS" | "FAIL" | "MANUAL_REVIEW">(
    observations?.manual_assessment || "MANUAL_REVIEW"
  );

  useEffect(() => {
    onObservationsChange({
      test_condition: testCondition,
      observed_behavior: observedBehavior,
      instrument_response: instrumentResponse,
      significant_fault_detected: significantFault,
      indication_difference: indicationDifference,
      engineer_notes: engineerNotes,
      manual_assessment: manualAssessment,
    });
  }, [testCondition, observedBehavior, instrumentResponse, significantFault, indicationDifference, engineerNotes, manualAssessment]);

  const handleLoadDemoData = () => {
    setTestCondition("Level 3 Immunity: 10 V/m field strength, 80 MHz - 2000 MHz");
    setObservedBehavior("Instrument maintained steady reading without significant fault during RF exposure.");
    setInstrumentResponse("Normal Operation");
    setSignificantFault(false);
    setIndicationDifference(0.0);
    setEngineerNotes("Verified in anechoic chamber under reference environmental conditions.");
    setManualAssessment("PASS");
  };

  return (
    <div className="space-y-4">
      {/* Header & Demo Data button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">EMC & Electrical Immunity Observation Workbench</h4>
          <p className="text-[11px] text-muted-foreground">
            {testName} — OIML R 76-1 Annex B Electromagnetic Disturbance Compliance
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLoadDemoData}
          disabled={disabled}
          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
        >
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
          Load Sample Observations
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Representative demonstration data — not a certified laboratory measurement.
      </p>

      {/* Notice Card for Manual Review */}
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">EMC & Electrical Disturbance Protocol</p>
          <p className="text-[11px] opacity-90 mt-0.5">
            OIML R 76-1 Annex B immunity tests require engineer observation of instrument behavior during disturbance exposure.
            Verify that any change in indication does not exceed 1 e or that significant faults are detected and acted upon.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Test Condition / Severity Level */}
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Test Condition / Severity Level:</Label>
          <Input
            type="text"
            value={testCondition}
            onChange={(e) => setTestCondition(e.target.value)}
            disabled={disabled}
            className="h-8 text-xs bg-background"
            placeholder="e.g. 6 kV contact discharge / 8 kV air discharge"
          />
        </div>

        {/* Instrument Response */}
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Instrument Response:</Label>
          <select
            value={instrumentResponse}
            onChange={(e) => setInstrumentResponse(e.target.value)}
            disabled={disabled}
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="Normal Operation">Normal Operation (No Disturbance)</option>
            <option value="Temporary Disturbance Restored">Temporary Disturbance (Restored Automatically)</option>
            <option value="Fault Message Displayed">Fault Message Displayed (Significant Fault Suppressed)</option>
            <option value="System Reset Required">System Reset Required</option>
            <option value="Permanent Damage / Failure">Permanent Damage / Failure</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Indication Difference */}
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Indication Difference (ΔI) during Disturbance:</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={indicationDifference}
              onChange={(e) => setIndicationDifference(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">e</span>
          </div>
        </div>

        {/* Significant Fault Detected? */}
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Significant Fault (&gt; 1 e) Occurred?</Label>
          <select
            value={significantFault ? "YES" : "NO"}
            onChange={(e) => setSignificantFault(e.target.value === "YES")}
            disabled={disabled}
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="NO">No Significant Fault Detected (Diff ≤ 1 e)</option>
            <option value="YES">Yes, Significant Fault Detected (&gt; 1 e)</option>
          </select>
        </div>
      </div>

      {/* Observed Behavior & Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Observed Behavior & Measurement Notes:</Label>
        <Textarea
          value={observedBehavior}
          onChange={(e) => setObservedBehavior(e.target.value)}
          disabled={disabled}
          rows={2}
          className="text-xs bg-background resize-none"
          placeholder="Describe instrument behavior during disturbance..."
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Engineer Assessment & Laboratory Notes:</Label>
        <Textarea
          value={engineerNotes}
          onChange={(e) => setEngineerNotes(e.target.value)}
          disabled={disabled}
          rows={2}
          className="text-xs bg-background resize-none"
          placeholder="Add official laboratory assessment notes..."
        />
      </div>

      {/* Assessment Decision */}
      <div className="rounded-md border border-border bg-muted/30 p-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ShieldCheckIcon} strokeWidth={2} className="size-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Engineer Assessment Decision:</span>
        </div>
        <select
          value={manualAssessment}
          onChange={(e) => setManualAssessment(e.target.value as any)}
          disabled={disabled}
          className="h-8 rounded-md border border-input bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="MANUAL_REVIEW">MANUAL REVIEW REQUIRED</option>
          <option value="PASS">PASS (Complies with Annex B)</option>
          <option value="FAIL">FAIL (Non-compliant disturbance response)</option>
        </select>
      </div>
    </div>
  );
}
