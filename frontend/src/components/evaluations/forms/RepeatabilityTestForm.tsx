/**
 * METRA — components/evaluations/forms/RepeatabilityTestForm.tsx
 * Specialized observation form for Repeatability Test (OIML R 76-1 §A.4.10)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RepeatabilityTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

const DEMO_TEST_LOAD = 100;
const DEMO_READINGS = [100.0, 100.1, 100.0, 99.9, 100.0, 100.1, 100.0, 99.9, 100.0, 100.1];

export function RepeatabilityTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: RepeatabilityTestFormProps) {
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : DEMO_TEST_LOAD
  );
  const [readings, setReadings] = useState<number[]>(
    Array.isArray(observations?.readings) && observations.readings.length > 0
      ? observations.readings.map((r: any) => (typeof r === "object" ? r.indication || r.I || 0 : Number(r)))
      : DEMO_READINGS
  );

  useEffect(() => {
    onObservationsChange({
      test_load: testLoad,
      readings,
      repeatability_readings: readings,
    });
  }, [testLoad, readings]);

  const handleReadingChange = (idx: number, val: string) => {
    const num = parseFloat(val);
    const updated = [...readings];
    updated[idx] = isNaN(num) ? 0 : num;
    setReadings(updated);
  };

  const handleLoadDemoData = () => {
    setTestLoad(DEMO_TEST_LOAD);
    setReadings(DEMO_READINGS);
  };

  const validReadings = readings.filter((r) => !isNaN(r));
  const minVal = validReadings.length > 0 ? Math.min(...validReadings) : 0;
  const maxVal = validReadings.length > 0 ? Math.max(...validReadings) : 0;
  const rangeVal = maxVal - minVal;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Label className="text-xs font-semibold text-foreground">Test Load (m):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.1"
              value={testLoad}
              onChange={(e) => setTestLoad(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 w-28 font-mono text-xs"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
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

      {/* Grid of 10 Repeated Indications */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-foreground">
          Repeated Indications (10 consecutive weighings of same load):
        </Label>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {readings.map((val, idx) => (
            <div key={idx} className="rounded-md border border-border bg-muted/20 p-2.5 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground block">
                Reading #{idx + 1}
              </span>
              <Input
                type="number"
                step="0.01"
                value={val}
                onChange={(e) => handleReadingChange(idx, e.target.value)}
                disabled={disabled}
                className="h-8 font-mono text-xs bg-background"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Derived range preview */}
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div>
          <span className="text-muted-foreground">Minimum Indication: </span>
          <span className="font-bold text-foreground">{minVal.toFixed(2)} kg</span>
        </div>
        <div>
          <span className="text-muted-foreground">Maximum Indication: </span>
          <span className="font-bold text-foreground">{maxVal.toFixed(2)} kg</span>
        </div>
        <div>
          <span className="text-muted-foreground">Repeatability Range (I<sub>max</sub> - I<sub>min</sub>): </span>
          <span className="font-bold text-primary">{rangeVal.toFixed(2)} kg</span>
        </div>
      </div>
    </div>
  );
}
