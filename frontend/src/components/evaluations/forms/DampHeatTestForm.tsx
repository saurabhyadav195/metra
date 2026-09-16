/**
 * METRA — components/evaluations/forms/DampHeatTestForm.tsx
 * Damp Heat, Steady State Test (OIML R 76-1 Annex B §B.2.2)
 *
 * Three dynamic weighing grids:
 *   1. Initial Reference (before conditioning)
 *   2. Damp Heat Stage (during/immediately after conditioning)
 *   3. Final Reference (after recovery)
 *
 * Each grid has header fields: Time, Temperature (°C), Relative Humidity (%)
 * Columns per grid: Applied Load (L) | Indication (I) | Changeover Weight (ΔL)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DampHeatTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface LoadRow {
  L: number;
  I: number;
  dL: number;
}

interface GridData {
  time: string;
  temperature: number;
  humidity: number;
  readings: LoadRow[];
}

const DEMO_READINGS: LoadRow[] = [
  { L: 0, I: 0, dL: 0 },
];

function parseGrid(raw: any, defaultTemp: number, defaultHumidity: number): GridData {
  if (raw && typeof raw === "object") {
    return {
      time: String(raw.time ?? ""),
      temperature: Number(raw.temperature ?? defaultTemp),
      humidity: Number(raw.humidity ?? defaultHumidity),
      readings: Array.isArray(raw.readings) && raw.readings.length > 0
        ? raw.readings.map((r: any) => ({ L: Number(r.L ?? 0), I: Number(r.I ?? 0), dL: Number(r.dL ?? 0) }))
        : DEMO_READINGS.map((r) => ({ ...r })),
    };
  }
  return { time: "", temperature: defaultTemp, humidity: defaultHumidity, readings: DEMO_READINGS.map((r) => ({ ...r })) };
}

function WeighingGridPanel({
  label,
  colorClass,
  data,
  onChange,
  disabled,
}: {
  label: string;
  colorClass: string;
  data: GridData;
  onChange: (d: GridData) => void;
  disabled: boolean;
}) {
  const handleHeaderChange = (field: "time" | "temperature" | "humidity", val: string) => {
    if (field === "time") {
      onChange({ ...data, time: val });
    } else {
      const num = parseFloat(val);
      onChange({ ...data, [field]: isNaN(num) ? 0 : num });
    }
  };

  const handleRowChange = (idx: number, field: keyof LoadRow, val: string) => {
    const num = parseFloat(val);
    const updated = [...data.readings];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    onChange({ ...data, readings: updated });
  };

  const handleAddRow = () => {
    const last = data.readings[data.readings.length - 1];
    onChange({ ...data, readings: [...data.readings, { L: (last?.L ?? 0) + 10, I: (last?.L ?? 0) + 10, dL: 0 }] });
  };

  const handleRemoveRow = (idx: number) => {
    if (data.readings.length <= 1) return;
    onChange({ ...data, readings: data.readings.filter((_, i) => i !== idx) });
  };

  return (
    <div className={`rounded-md border p-4 space-y-3 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">{label}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRow} disabled={disabled}
          className="h-7 text-xs gap-1">
          <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
          Add Load
        </Button>
      </div>

      {/* Grid header fields */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Time</Label>
          <Input type="text" value={data.time}
            onChange={(e) => handleHeaderChange("time", e.target.value)}
            disabled={disabled} className="h-7 text-xs"
            placeholder="HH:MM" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Temperature (°C)</Label>
          <Input type="number" step="1" value={data.temperature}
            onChange={(e) => handleHeaderChange("temperature", e.target.value)}
            disabled={disabled} className="h-7 font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Rel. Humidity (%)</Label>
          <Input type="number" step="1" min="0" max="100" value={data.humidity}
            onChange={(e) => handleHeaderChange("humidity", e.target.value)}
            disabled={disabled} className="h-7 font-mono text-xs" />
        </div>
      </div>

      {/* Readings table */}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30 font-medium text-muted-foreground">
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">L [kg]</th>
              <th className="py-2 px-2">I [kg]</th>
              <th className="py-2 px-2 text-amber-600 dark:text-amber-400">ΔL [kg]</th>
              <th className="py-2 px-2 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.readings.map((r, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-2 font-medium text-foreground">{idx + 1}</td>
                <td className="py-1.5 px-2">
                  <Input type="number" step="0.001" value={r.L}
                    onChange={(e) => handleRowChange(idx, "L", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="number" step="0.001" value={r.I}
                    onChange={(e) => handleRowChange(idx, "I", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="number" step="0.0001" min="0" value={r.dL}
                    onChange={(e) => handleRowChange(idx, "dL", e.target.value)}
                    disabled={disabled} className="h-7 w-16 font-mono text-xs border-amber-400/50" />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={disabled || data.readings.length <= 1}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
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

export function DampHeatTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: DampHeatTestFormProps) {
  const [initial, setInitial] = useState<GridData>(() =>
    parseGrid(observations?.initial, 23, 50)
  );
  const [dampHeat, setDampHeat] = useState<GridData>(() =>
    parseGrid(observations?.damp_heat, 40, 93)
  );
  const [final, setFinal] = useState<GridData>(() =>
    parseGrid(observations?.final, 23, 50)
  );

  useEffect(() => {
    onObservationsChange({ initial, damp_heat: dampHeat, final });
  }, [initial, dampHeat, final]);

  const handleDemo = () => {
    setInitial({ time: "08:00", temperature: 23, humidity: 50, readings: DEMO_READINGS.map((r) => ({ ...r })) });
    setDampHeat({ time: "16:00", temperature: 40, humidity: 93, readings: DEMO_READINGS.map((r) => ({ ...r, I: r.I + 0.001 })) });
    setFinal({ time: "24:00", temperature: 23, humidity: 50, readings: DEMO_READINGS.map((r) => ({ ...r })) });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Damp Heat, Steady State — 3-Stage Weighing Protocol</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §B.2.2 — Initial reference → Damp heat conditioning → Final reference comparison
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleDemo} disabled={disabled}
          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
          Load Sample
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground italic">Representative demonstration data — not a certified laboratory measurement.</p>

      <WeighingGridPanel label="Stage 1 — Initial Reference (Normal Conditions)"
        colorClass="border-blue-500/30 bg-blue-500/5"
        data={initial} onChange={setInitial} disabled={disabled} />

      <WeighingGridPanel label="Stage 2 — Damp Heat Conditioning (40 °C / 93% RH)"
        colorClass="border-amber-500/30 bg-amber-500/5"
        data={dampHeat} onChange={setDampHeat} disabled={disabled} />

      <WeighingGridPanel label="Stage 3 — Final Reference (After Recovery)"
        colorClass="border-emerald-500/30 bg-emerald-500/5"
        data={final} onChange={setFinal} disabled={disabled} />
    </div>
  );
}
