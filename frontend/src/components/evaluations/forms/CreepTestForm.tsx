/**
 * METRA — components/evaluations/forms/CreepTestForm.tsx
 * Creep / Stress Relaxation Test (OIML R 76-1 §A.4.9)
 *
 * Captures time-series readings under constant load:
 *   - Fixed applied load
 *   - Multiple timed indication readings (I at t=0, t=1min, t=2min ... t=30min)
 *   - Changeover weight at each time point
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CreepTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface CreepReading {
  time_min: number;
  indication: number;
  dL: number;
}

const DEFAULT_READINGS: CreepReading[] = [
  { time_min: 0, indication: 0, dL: 0 },
];

export function CreepTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: CreepTestFormProps) {
  const [load, setLoad] = useState<number>(
    observations?.load !== undefined ? Number(observations.load) : 10.0
  );
  const [E0, setE0] = useState<number>(
    observations?.E0 !== undefined ? Number(observations.E0) : 0
  );

  const parseReadings = (): CreepReading[] => {
    if (observations?.readings && Array.isArray(observations.readings) && observations.readings.length > 0) {
      return observations.readings.map((r: any) => ({
        time_min: Number(r.time_min ?? r.time ?? 0),
        indication: Number(r.I ?? r.indication ?? 0),
        dL: Number(r.dL ?? 0),
      }));
    }
    return DEFAULT_READINGS;
  };

  const [readings, setReadings] = useState<CreepReading[]>(parseReadings);

  useEffect(() => {
    onObservationsChange({
      load,
      E0,
      readings: readings.map((r) => ({
        time_min: r.time_min,
        I: r.indication,
        dL: r.dL,
      })),
    });
  }, [load, E0, readings]);

  const handleChange = (idx: number, field: keyof CreepReading, val: string) => {
    const num = parseFloat(val);
    const updated = [...readings];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    setReadings(updated);
  };

  const handleAddRow = () => {
    const last = readings[readings.length - 1];
    setReadings([...readings, { time_min: (last?.time_min ?? 0) + 5, indication: load, dL: 0 }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (readings.length <= 1) return;
    setReadings(readings.filter((_, i) => i !== idx));
  };

  const handleDemo = () => {
    setLoad(10.0);
    setE0(0);
    setReadings(DEFAULT_READINGS);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Creep Test — Time-Series Indication under Constant Load</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.4.9 — Apply constant load; record indication at set time intervals up to 30 min
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDemo} disabled={disabled}
            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
            Load Sample
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleAddRow} disabled={disabled}
            className="h-7 text-xs gap-1">
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Reading
          </Button>
        </div>
      </div>

      {/* Load and E0 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
          <Label className="text-xs font-semibold text-foreground">Applied Load (L) [kg]:</Label>
          <p className="text-[10px] text-muted-foreground">Constant load applied throughout test</p>
          <div className="flex items-center gap-1.5">
            <Input type="number" step="0.001" value={load}
              onChange={(e) => setLoad(parseFloat(e.target.value) || 0)}
              disabled={disabled} className="h-8 font-mono text-xs bg-background" />
            <span className="text-xs text-muted-foreground font-medium shrink-0">kg</span>
          </div>
        </div>
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
          <Label className="text-xs font-semibold text-foreground">Initial Zero Error (E₀) [kg]:</Label>
          <div className="flex items-center gap-1.5">
            <Input type="number" step="0.0001" value={E0}
              onChange={(e) => setE0(parseFloat(e.target.value) || 0)}
              disabled={disabled} className="h-8 font-mono text-xs bg-background" />
            <span className="text-xs text-muted-foreground font-medium shrink-0">kg</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Time (min)</th>
              <th className="py-2.5 px-3">Indication (I) [kg]</th>
              <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
              <th className="py-2.5 px-3 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {readings.map((r, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-3 font-medium text-foreground">{idx + 1}</td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="1" min="0" value={r.time_min}
                    onChange={(e) => handleChange(idx, "time_min", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={r.indication}
                    onChange={(e) => handleChange(idx, "indication", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.0001" min="0" value={r.dL}
                    onChange={(e) => handleChange(idx, "dL", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs border-amber-400/50" />
                </td>
                <td className="py-1.5 px-3 text-right">
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={disabled || readings.length <= 1}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Representative demonstration data — not a certified laboratory measurement.
      </p>
    </div>
  );
}
