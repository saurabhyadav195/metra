/**
 * METRA — components/evaluations/forms/TemperatureTestForm.tsx
 * Specialized observation form for Temperature Tests (OIML R 76-1 §A.5.3)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TemperatureTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export function TemperatureTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: TemperatureTestFormProps) {
  const [chamberTemp, setChamberTemp] = useState<number>(
    observations?.chamber_temp !== undefined ? Number(observations.chamber_temp) : 40.0
  );
  const [noLoadIndication, setNoLoadIndication] = useState<number>(
    observations?.no_load_indication !== undefined ? Number(observations.no_load_indication) : 0.0
  );
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : 100.0
  );
  const [indicatedValue, setIndicatedValue] = useState<number>(
    observations?.indicated_value !== undefined ? Number(observations.indicated_value) : 100.1
  );
  const [zeroDriftPerK, setZeroDriftPerK] = useState<number>(
    observations?.zero_drift_per_k !== undefined ? Number(observations.zero_drift_per_k) : 0.2
  );

  useEffect(() => {
    onObservationsChange({
      chamber_temp: chamberTemp,
      no_load_indication: noLoadIndication,
      test_load: testLoad,
      indicated_value: indicatedValue,
      zero_drift_per_k: zeroDriftPerK,
      load_steps: [{ L: testLoad, I: indicatedValue, dL: 0 }],
    });
  }, [chamberTemp, noLoadIndication, testLoad, indicatedValue, zeroDriftPerK]);

  const handleLoadDemoData = () => {
    setChamberTemp(40.0);
    setNoLoadIndication(0.0);
    setTestLoad(100.0);
    setIndicatedValue(100.1);
    setZeroDriftPerK(0.2);
  };

  const obsError = indicatedValue - testLoad;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Static Temperature Chamber Observations</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.5.3.1 (Static Temp Limits) & §A.5.3.2 (Zero Drift ≤ 1 e per 5 K)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Prescribed Chamber Temperature:</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="1"
              value={chamberTemp}
              onChange={(e) => setChamberTemp(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">°C</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">No-Load Indication at Temperature:</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={noLoadIndication}
              onChange={(e) => setNoLoadIndication(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Applied Test Load (m):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={testLoad}
              onChange={(e) => setTestLoad(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Indicated Value (I):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={indicatedValue}
              onChange={(e) => setIndicatedValue(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Observed Zero Drift Rate:</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.05"
              value={zeroDriftPerK}
              onChange={(e) => setZeroDriftPerK(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">e / K</span>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div>
          <span className="text-muted-foreground">Observed Error at {chamberTemp}°C: </span>
          <span className="font-bold text-foreground">
            {obsError >= 0 ? `+${obsError.toFixed(2)}` : obsError.toFixed(2)} kg
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Zero Drift Status: </span>
          <span className="font-bold text-emerald-600">
            {zeroDriftPerK <= 1.0 ? "Within Limit (≤ 1.0 e/K)" : "Exceeds Limit"}
          </span>
        </div>
      </div>
    </div>
  );
}
