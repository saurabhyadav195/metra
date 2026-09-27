/**
 * METRA — components/evaluations/forms/SpanStabilityTestForm.tsx
 * Span Stability Test (OIML R 76-1 §B.4)
 *
 * Captures:
 *   - Test load near Max
 *   - Duration in days (default 28 days)
 *   - 28-Day Periodic Measurement Table (at least 8 measurement events):
 *       measurement number, date/time timestamp, indication I, changeover dL, ambient temp (°C), relative humidity (%), atmospheric pressure (hPa), power disconnection event (yes/no)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SpanStabilityTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface SpanMeasurement {
  measurement_index: number;
  timestamp: string;
  I: number;
  dL: number;
  temperature: number;
  humidity: number;
  pressure_hpa: number;
  power_interrupted: boolean;
}

const DEFAULT_MEASUREMENTS: SpanMeasurement[] = [
  { measurement_index: 1, timestamp: "Day 1 09:00", I: 100, dL: 0, temperature: 20, humidity: 50, pressure_hpa: 1013, power_interrupted: false },
  { measurement_index: 2, timestamp: "Day 4 09:00", I: 100, dL: 0, temperature: 21, humidity: 52, pressure_hpa: 1012, power_interrupted: false },
  { measurement_index: 3, timestamp: "Day 8 09:00", I: 100, dL: 0, temperature: 20, humidity: 48, pressure_hpa: 1015, power_interrupted: false },
  { measurement_index: 4, timestamp: "Day 12 09:00", I: 100, dL: 0, temperature: 22, humidity: 51, pressure_hpa: 1011, power_interrupted: false },
  { measurement_index: 5, timestamp: "Day 16 09:00", I: 100, dL: 0, temperature: 20, humidity: 50, pressure_hpa: 1013, power_interrupted: false },
  { measurement_index: 6, timestamp: "Day 20 09:00", I: 100, dL: 0, temperature: 19, humidity: 49, pressure_hpa: 1014, power_interrupted: false },
  { measurement_index: 7, timestamp: "Day 24 09:00", I: 100, dL: 0, temperature: 20, humidity: 50, pressure_hpa: 1013, power_interrupted: false },
  { measurement_index: 8, timestamp: "Day 28 09:00", I: 100, dL: 0, temperature: 20, humidity: 50, pressure_hpa: 1013, power_interrupted: false },
];

export function SpanStabilityTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: SpanStabilityTestFormProps) {
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : 100
  );
  const [testDurationDays, setTestDurationDays] = useState<number>(
    observations?.test_duration_days !== undefined ? Number(observations.test_duration_days) : 28
  );

  const parseMeasurements = (): SpanMeasurement[] => {
    if (observations?.measurements && Array.isArray(observations.measurements) && observations.measurements.length > 0) {
      return observations.measurements.map((r: any, i: number) => ({
        measurement_index: i + 1,
        timestamp: String(r.timestamp ?? r.date ?? `Day ${i + 1}`),
        I: Number(r.I ?? r.indication ?? 0),
        dL: Number(r.dL ?? 0),
        temperature: Number(r.temperature ?? r.temp ?? 20),
        humidity: Number(r.humidity ?? 50),
        pressure_hpa: Number(r.pressure_hpa ?? r.pressure ?? 1013),
        power_interrupted: Boolean(r.power_interrupted ?? false),
      }));
    }
    return DEFAULT_MEASUREMENTS;
  };

  const [measurements, setMeasurements] = useState<SpanMeasurement[]>(parseMeasurements);

  useEffect(() => {
    onObservationsChange({
      test_load: testLoad,
      test_duration_days: testDurationDays,
      measurements: measurements.map((m) => ({
        measurement_index: m.measurement_index,
        timestamp: m.timestamp,
        L: testLoad,
        I: m.I,
        dL: m.dL,
        temperature: m.temperature,
        humidity: m.humidity,
        pressure_hpa: m.pressure_hpa,
        power_interrupted: m.power_interrupted,
      })),
    });
  }, [testLoad, testDurationDays, measurements]);

  const handleChange = (idx: number, field: keyof SpanMeasurement, val: any) => {
    const updated = [...measurements];
    if (field === "power_interrupted") {
      updated[idx] = { ...updated[idx], power_interrupted: Boolean(val) };
    } else if (field === "timestamp") {
      updated[idx] = { ...updated[idx], timestamp: String(val) };
    } else {
      const num = parseFloat(val);
      updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    }
    setMeasurements(updated);
  };

  const handleAddMeasurement = () => {
    const nextIdx = measurements.length + 1;
    setMeasurements([
      ...measurements,
      {
        measurement_index: nextIdx,
        timestamp: `Day ${nextIdx} 09:00`,
        I: testLoad,
        dL: 0,
        temperature: 20,
        humidity: 50,
        pressure_hpa: 1013,
        power_interrupted: false,
      },
    ]);
  };

  const handleRemoveMeasurement = (idx: number) => {
    if (measurements.length <= 1) return;
    setMeasurements(
      measurements.filter((_, i) => i !== idx).map((m, i) => ({ ...m, measurement_index: i + 1 }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h4 className="text-xs font-semibold text-foreground font-mono">
          OIML R 76-1 §B.4 — Span Stability Test Observations (28 Days)
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Perform at least 8 measurements near Max over up to 28 days. Variation in error across all measurements shall not exceed 0.5 e or 0.5 |mpe|.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Test Load Near Max (L) [kg]:</Label>
          <Input
            type="number"
            step="0.001"
            value={testLoad}
            onChange={(e) => setTestLoad(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>

        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Test Duration [Days]:</Label>
          <Input
            type="number"
            step="1"
            min="1"
            value={testDurationDays}
            onChange={(e) => setTestDurationDays(parseInt(e.target.value) || 28)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground">28-Day Periodic Span Observations</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMeasurement}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Measurement
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Date / Timestamp</th>
                <th className="py-2.5 px-3">Indication (I) [kg]</th>
                <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
                <th className="py-2.5 px-3">Temp (°C)</th>
                <th className="py-2.5 px-3">RH (%)</th>
                <th className="py-2.5 px-3">Power Disconnected?</th>
                <th className="py-2.5 px-3 text-right">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {measurements.map((m, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-1.5 px-3 font-medium text-foreground">{m.measurement_index}</td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="text"
                      value={m.timestamp}
                      onChange={(e) => handleChange(idx, "timestamp", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-28 text-xs font-medium"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={m.I}
                      onChange={(e) => handleChange(idx, "I", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-20 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={m.dL}
                      onChange={(e) => handleChange(idx, "dL", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 font-mono text-xs border-amber-400/50"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.5"
                      value={m.temperature}
                      onChange={(e) => handleChange(idx, "temperature", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-14 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={m.humidity}
                      onChange={(e) => handleChange(idx, "humidity", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-14 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <select
                      value={m.power_interrupted ? "true" : "false"}
                      onChange={(e) => handleChange(idx, "power_interrupted", e.target.value === "true")}
                      disabled={disabled}
                      className="h-7 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMeasurement(idx)}
                      disabled={disabled || measurements.length <= 1}
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
