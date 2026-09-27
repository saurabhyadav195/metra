/**
 * METRA — components/evaluations/forms/GenericObservationForm.tsx
 * Generic fallback observation form for verified OIML procedures
 */

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface GenericObservationFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export function GenericObservationForm({
  observations,
  onObservationsChange,
  disabled = false,
}: GenericObservationFormProps) {
  const [observedValue, setObservedValue] = useState<string>(
    observations?.observed_value !== undefined ? String(observations.observed_value) : ""
  );
  const [notes, setNotes] = useState<string>(
    observations?.notes || ""
  );
  const [manualResult, setManualResult] = useState<string>(
    observations?.manual_assessment || "MANUAL_REVIEW"
  );

  useEffect(() => {
    onObservationsChange({
      observed_value: observedValue,
      notes,
      manual_assessment: manualResult,
    });
  }, [observedValue, notes, manualResult]);

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h4 className="text-xs font-semibold text-foreground">Test Observations</h4>
        <p className="text-[11px] text-muted-foreground">
          Standard laboratory observation recorder
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Observed Value / Measurement:</Label>
          <Input
            type="text"
            value={observedValue}
            onChange={(e) => setObservedValue(e.target.value)}
            disabled={disabled}
            className="h-8 text-xs bg-background"
            placeholder="Enter observed measurement..."
          />
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Assessment Status:</Label>
          <select
            value={manualResult}
            onChange={(e) => setManualResult(e.target.value)}
            disabled={disabled}
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="MANUAL_REVIEW">MANUAL REVIEW REQUIRED</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Observation Notes & Laboratory Details:</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled}
          rows={3}
          className="text-xs bg-background resize-none"
          placeholder="Enter procedure observation notes..."
        />
      </div>
    </div>
  );
}
