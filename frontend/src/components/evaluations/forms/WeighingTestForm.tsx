/**
 * METRA — components/evaluations/forms/WeighingTestForm.tsx
 * Specialized observation form for Weighing Performance Test (OIML R 76-1 §A.4.4)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface WeighingTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export interface ReadingRow {
  load: number;
  indication: number;
  dL?: number;
}

const DEMO_READINGS: ReadingRow[] = [
  { load: 0, indication: 0, dL: 0 },
  { load: 50, indication: 50.0, dL: 0 },
  { load: 100, indication: 100.1, dL: 0 },
  { load: 200, indication: 199.9, dL: 0 },
  { load: 250, indication: 250.1, dL: 0 },
  { load: 300, indication: 300.0, dL: 0 },
];

export function WeighingTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: WeighingTestFormProps) {
  const initialReadings: ReadingRow[] =
    observations?.readings && Array.isArray(observations.readings) && observations.readings.length > 0
      ? observations.readings
      : DEMO_READINGS;

  const [readings, setReadings] = useState<ReadingRow[]>(initialReadings);
  const [verificationType, setVerificationType] = useState<"initial" | "service">(
    observations?.verification_type || "initial"
  );

  useEffect(() => {
    onObservationsChange({
      readings,
      load_steps: readings.map((r) => ({ L: r.load, I: r.indication, dL: r.dL || 0 })),
      verification_type: verificationType,
    });
  }, [readings, verificationType]);

  const handleAddRow = () => {
    const last = readings[readings.length - 1];
    const nextLoad = (last?.load || 0) + 50;
    setReadings([...readings, { load: nextLoad, indication: nextLoad, dL: 0 }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (readings.length <= 1) return;
    setReadings(readings.filter((_, i) => i !== idx));
  };

  const handleChange = (idx: number, field: keyof ReadingRow, val: string) => {
    const num = parseFloat(val);
    const updated = [...readings];
    updated[idx] = {
      ...updated[idx],
      [field]: isNaN(num) ? 0 : num,
    };
    setReadings(updated);
  };

  const handleLoadDemoData = () => {
    setReadings(DEMO_READINGS);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Label className="text-xs font-semibold text-foreground">Verification Stage:</Label>
          <select
            value={verificationType}
            onChange={(e) => setVerificationType(e.target.value as "initial" | "service")}
            disabled={disabled}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="initial">Initial Verification (MPE Table 6)</option>
            <option value="service">In-Service Inspection (2 × MPE)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Load Step
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Representative demonstration data — not a certified laboratory measurement.
      </p>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="py-2.5 px-3">Point #</th>
              <th className="py-2.5 px-3">Applied Load (m) [kg]</th>
              <th className="py-2.5 px-3">Indicated Value (I) [kg]</th>
              <th className="py-2.5 px-3">Error (E = I - m) [kg]</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {readings.map((r, i) => {
              const err = r.indication - r.load;
              return (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-3 font-medium text-foreground">{i + 1}</td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={r.load}
                      onChange={(e) => handleChange(i, "load", e.target.value)}
                      disabled={disabled}
                      className="h-8 w-32 font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={r.indication}
                      onChange={(e) => handleChange(i, "indication", e.target.value)}
                      disabled={disabled}
                      className="h-8 w-32 font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-block rounded border border-border/60 bg-muted/60 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                      {err >= 0 ? `+${err.toFixed(2)}` : err.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRow(i)}
                      disabled={disabled || readings.length <= 1}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
