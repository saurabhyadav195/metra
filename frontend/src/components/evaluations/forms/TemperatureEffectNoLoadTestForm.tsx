/**
 * METRA — components/evaluations/forms/TemperatureEffectNoLoadTestForm.tsx
 * Temperature Effect on No-Load Indication (OIML R 76-1 §A.5.3.2)
 *
 * Captures zero drift observations at various temperatures:
 *   - Reference zero observation at ~20 °C
 *   - Zero indication at specified High Temperature
 *   - Zero indication at specified Low Temperature
 *   - Zero indication at 5 °C (if applicable)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TemperatureEffectNoLoadTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface ZeroTempRow {
  stage_name: string;
  temperature: number;
  zero_indication: number;
  dL: number;
  time: string;
}

const DEFAULT_ROWS: ZeroTempRow[] = [
  { stage_name: "Reference (20 °C)", temperature: 20, zero_indication: 0, dL: 0, time: "10:00" },
  { stage_name: "High Temp (40 °C)", temperature: 40, zero_indication: 0, dL: 0, time: "12:00" },
  { stage_name: "Low Temp (-10 °C)", temperature: -10, zero_indication: 0, dL: 0, time: "14:00" },
  { stage_name: "5 °C Condition", temperature: 5, zero_indication: 0, dL: 0, time: "16:00" },
];

export function TemperatureEffectNoLoadTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: TemperatureEffectNoLoadTestFormProps) {
  const parseRows = (): ZeroTempRow[] => {
    if (observations?.rows && Array.isArray(observations.rows) && observations.rows.length > 0) {
      return observations.rows.map((r: any) => ({
        stage_name: String(r.stage_name ?? r.stage ?? ""),
        temperature: Number(r.temperature ?? r.temp ?? 20),
        zero_indication: Number(r.zero_indication ?? r.I_zero ?? r.I ?? 0),
        dL: Number(r.dL ?? 0),
        time: String(r.time ?? ""),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<ZeroTempRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      rows: rows.map((r) => ({
        stage_name: r.stage_name,
        temperature: r.temperature,
        zero_indication: r.zero_indication,
        I: r.zero_indication,
        dL: r.dL,
        time: r.time,
      })),
    });
  }, [rows]);

  const handleChange = (idx: number, field: keyof ZeroTempRow, val: string) => {
    const updated = [...rows];
    if (field === "stage_name" || field === "time") {
      updated[idx] = { ...updated[idx], [field]: val };
    } else {
      const num = parseFloat(val);
      updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    }
    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      { stage_name: "Custom Stage", temperature: 20, zero_indication: 0, dL: 0, time: "" },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground font-mono">
            OIML R 76-1 §A.5.3.2 — Temperature Effect on No-Load Indication Observations
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Record zero indication at reference temperature and at high, low, and 5 °C temperature limits. Zero drift shall not exceed 1 e per 1 K (Class I) or 5 K (other classes).
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
            Add Stage
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="py-2.5 px-3">Stage / Condition</th>
              <th className="py-2.5 px-3">Temperature (°C)</th>
              <th className="py-2.5 px-3">Zero Indication (I₀) [kg]</th>
              <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-3">
                  <Input
                    type="text"
                    value={row.stage_name}
                    onChange={(e) => handleChange(idx, "stage_name", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-36 text-xs"
                    placeholder="Stage name"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <Input
                    type="number"
                    step="0.5"
                    value={row.temperature}
                    onChange={(e) => handleChange(idx, "temperature", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-20 font-mono text-xs"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <Input
                    type="number"
                    step="0.001"
                    value={row.zero_indication}
                    onChange={(e) => handleChange(idx, "zero_indication", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-24 font-mono text-xs"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={row.dL}
                    onChange={(e) => handleChange(idx, "dL", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-20 font-mono text-xs border-amber-400/50"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <Input
                    type="text"
                    value={row.time}
                    onChange={(e) => handleChange(idx, "time", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-20 text-xs"
                    placeholder="HH:MM"
                  />
                </td>
                <td className="py-1.5 px-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={disabled || rows.length <= 1}
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
