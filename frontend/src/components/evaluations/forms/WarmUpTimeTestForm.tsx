/**
 * METRA — components/evaluations/forms/WarmUpTimeTestForm.tsx
 * Warm-up Time Test (OIML R 76-1 §A.5.2)
 *
 * Captures observations for warm-up time performance:
 *   - Power disconnection duration (hours, e.g. 8h)
 *   - Power-on timestamp
 *   - Zero indication immediately after power-on
 *   - Test load L (near Max)
 *   - Observations at elapsed times (e.g., 5 min, 15 min, 30 min):
 *       zero indication, load indication I, changeover dL, ambient temperature
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface WarmUpTimeTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface WarmUpReading {
  elapsed_min: number;
  zero_indication: number;
  indication: number;
  dL: number;
  temperature: number;
}

const DEFAULT_READINGS: WarmUpReading[] = [
  { elapsed_min: 5, zero_indication: 0, indication: 100, dL: 0, temperature: 20 },
  { elapsed_min: 15, zero_indication: 0, indication: 100, dL: 0, temperature: 20 },
  { elapsed_min: 30, zero_indication: 0, indication: 100, dL: 0, temperature: 20 },
];

export function WarmUpTimeTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: WarmUpTimeTestFormProps) {
  const [disconnectHours, setDisconnectHours] = useState<number>(
    observations?.disconnect_duration_hours !== undefined
      ? Number(observations.disconnect_duration_hours)
      : 8
  );
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : 100
  );

  const parseReadings = (): WarmUpReading[] => {
    if (observations?.readings && Array.isArray(observations.readings) && observations.readings.length > 0) {
      return observations.readings.map((r: any) => ({
        elapsed_min: Number(r.elapsed_min ?? r.time ?? 0),
        zero_indication: Number(r.zero_indication ?? r.E0 ?? 0),
        indication: Number(r.I ?? r.indication ?? 0),
        dL: Number(r.dL ?? 0),
        temperature: Number(r.temperature ?? 20),
      }));
    }
    return DEFAULT_READINGS;
  };

  const [readings, setReadings] = useState<WarmUpReading[]>(parseReadings);

  useEffect(() => {
    onObservationsChange({
      disconnect_duration_hours: disconnectHours,
      test_load: testLoad,
      readings: readings.map((r) => ({
        elapsed_min: r.elapsed_min,
        zero_indication: r.zero_indication,
        L: testLoad,
        I: r.indication,
        dL: r.dL,
        temperature: r.temperature,
      })),
    });
  }, [disconnectHours, testLoad, readings]);

  const handleChange = (idx: number, field: keyof WarmUpReading, val: string) => {
    const num = parseFloat(val);
    const updated = [...readings];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    setReadings(updated);
  };

  const handleAddReading = () => {
    const last = readings[readings.length - 1];
    setReadings([
      ...readings,
      {
        elapsed_min: (last?.elapsed_min ?? 0) + 15,
        zero_indication: 0,
        indication: testLoad,
        dL: 0,
        temperature: 20,
      },
    ]);
  };

  const handleRemoveReading = (idx: number) => {
    if (readings.length <= 1) return;
    setReadings(readings.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h4 className="text-xs font-semibold text-foreground font-mono">
          OIML R 76-1 §A.5.2 — Warm-up Time Test Observations
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Disconnect instrument from mains for ≥ 8 hours, power on, then record zero and load indications at 5, 15, and 30 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Power Disconnection Duration [hours]:</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={disconnectHours}
            onChange={(e) => setDisconnectHours(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>

        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Test Load (L) [kg]:</Label>
          <p className="text-[10px] text-muted-foreground">Load close to Max applied during test points</p>
          <Input
            type="number"
            step="0.001"
            value={testLoad}
            onChange={(e) => setTestLoad(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground">Timed Observation Points</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddReading}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Time Point
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <th className="py-2.5 px-3">Elapsed (min)</th>
                <th className="py-2.5 px-3">Zero Indication (I₀) [kg]</th>
                <th className="py-2.5 px-3">Load Indication (I) [kg]</th>
                <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
                <th className="py-2.5 px-3">Temp (°C)</th>
                <th className="py-2.5 px-3 text-right">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {readings.map((r, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={r.elapsed_min}
                      onChange={(e) => handleChange(idx, "elapsed_min", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-20 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={r.zero_indication}
                      onChange={(e) => handleChange(idx, "zero_indication", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-24 font-mono text-xs"
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
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.5"
                      value={r.temperature}
                      onChange={(e) => handleChange(idx, "temperature", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveReading(idx)}
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
    </div>
  );
}
