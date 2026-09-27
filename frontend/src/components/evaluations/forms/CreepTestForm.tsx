/**
 * METRA — components/evaluations/forms/CreepTestForm.tsx
 * Creep Test (OIML R 76-1 §A.4.11.1 & §3.9.4.1)
 *
 * Captures time-series readings under constant load close to Max:
 *   - Constant applied load (L)
 *   - Optional initial zero error (E0)
 *   - Multiple timed indication readings (I at t=0, t=5min, t=15min, t=30min ... up to 4h)
 *   - Changeover weight (ΔL) at each time point
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
  { time_min: 5, indication: 0, dL: 0 },
  { time_min: 15, indication: 0, dL: 0 },
  { time_min: 30, indication: 0, dL: 0 },
];

export function CreepTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: CreepTestFormProps) {
  const [load, setLoad] = useState<string>(
    observations?.load !== undefined && observations?.load !== null ? String(observations.load) : ""
  );
  const [E0, setE0] = useState<string>(
    observations?.E0 !== undefined && observations?.E0 !== null ? String(observations.E0) : ""
  );

  const parseReadings = (): CreepReading[] => {
    if (observations?.readings && Array.isArray(observations.readings) && observations.readings.length > 0) {
      return observations.readings.map((r: any) => ({
        time_min: Number(r.time_min ?? r.time ?? 0),
        indication: Number(r.I ?? r.indication ?? 0),
        dL: Number(r.dL ?? r.changeover ?? 0),
      }));
    }
    return DEFAULT_READINGS;
  };

  const [readings, setReadings] = useState<CreepReading[]>(parseReadings);

  useEffect(() => {
    const payload: Record<string, any> = {
      load: load !== "" ? Number(load) : 0,
      readings: readings.map((r) => ({
        time_min: r.time_min,
        I: r.indication,
        dL: r.dL,
      })),
    };
    if (E0 !== "" && !isNaN(Number(E0))) {
      payload.E0 = Number(E0);
    }
    onObservationsChange(payload);
  }, [load, E0, readings]);

  const handleChange = (idx: number, field: keyof CreepReading, val: string) => {
    const num = parseFloat(val);
    const updated = [...readings];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    setReadings(updated);
  };

  const handleAddRow = () => {
    const last = readings[readings.length - 1];
    const nextTime = (last?.time_min ?? 0) >= 30 ? (last?.time_min ?? 0) + 30 : (last?.time_min ?? 0) + 5;
    const currentLoad = load !== "" ? Number(load) : 0;
    setReadings([...readings, { time_min: nextTime, indication: currentLoad, dL: 0 }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (readings.length <= 1) return;
    setReadings(readings.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground font-mono">OIML R 76-1 §A.4.11.1 — Creep Test Observations</h4>
          <p className="text-[11px] text-muted-foreground max-w-xl">
            Apply a constant load close to Max and record the indication at specified time intervals. The test may terminate after 30 minutes when the OIML termination conditions are satisfied; otherwise it continues up to 4 hours.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Reading
          </Button>
        </div>
      </div>

      {/* Load and E0 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
          <Label className="text-xs font-semibold text-foreground">Applied Load (L) [kg]:</Label>
          <p className="text-[10px] text-muted-foreground">Constant load applied throughout test (close to Max)</p>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.001"
              placeholder="e.g. 15.000"
              value={load}
              onChange={(e) => setLoad(e.target.value)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium shrink-0">kg</span>
          </div>
        </div>
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
          <Label className="text-xs font-semibold text-foreground">Initial Zero Error (E₀) [kg] (Optional):</Label>
          <p className="text-[10px] text-muted-foreground">Leave blank if zero error was not recorded</p>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.0001"
              placeholder="Optional"
              value={E0}
              onChange={(e) => setE0(e.target.value)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
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
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={r.time_min}
                    onChange={(e) => handleChange(idx, "time_min", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-20 font-mono text-xs"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <Input
                    type="number"
                    step="0.001"
                    value={r.indication}
                    onChange={(e) => handleChange(idx, "indication", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-24 font-mono text-xs"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={r.dL}
                    onChange={(e) => handleChange(idx, "dL", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-20 font-mono text-xs border-amber-400/50"
                  />
                </td>
                <td className="py-1.5 px-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={disabled || readings.length <= 1}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
