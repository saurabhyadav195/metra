/**
 * METRA — components/evaluations/forms/WeighingTestForm.tsx
 * Specialized observation form for Weighing Performance Test (OIML R 76-1 §A.4.4)
 *
 * Raw observation fields only:
 *   - Applied Load (L)
 *   - Indication (I)          ← digital display reading
 *   - Changeover Weight (ΔL)  ← extra mass added above I to trigger +1d change
 *   - Direction toggle (↑ Increasing / ↓ Decreasing per row)
 *
 * The frontend does NOT pre-calculate E = I − L (that is the backend engine's job).
 * P = I + 0.5e − ΔL is computed server-side by the OIML rule evaluator.
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface WeighingTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export interface WeighingRow {
  load: number;
  indication: number;
  dL: number;
  direction: "increasing" | "decreasing";
}

const DEMO_READINGS: WeighingRow[] = [
  { load: 0, indication: 0, dL: 0, direction: "increasing" },
];

export function WeighingTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: WeighingTestFormProps) {
  const initialReadings: WeighingRow[] =
    observations?.readings && Array.isArray(observations.readings) && observations.readings.length > 0
      ? observations.readings.map((r: any) => ({
          load: Number(r.load ?? r.L ?? 0),
          indication: Number(r.indication ?? r.I ?? 0),
          dL: Number(r.dL ?? 0),
          direction: (r.direction === "decreasing" ? "decreasing" : "increasing") as "increasing" | "decreasing",
        }))
      : DEMO_READINGS;

  const [rows, setRows] = useState<WeighingRow[]>(initialReadings);

  useEffect(() => {
    const formatted = rows.map((r) => ({
      L: Number(r.load),
      I: Number(r.indication),
      dL: Number(r.dL),
      direction: r.direction,
    }));
    onObservationsChange({ readings: formatted, load_steps: formatted });
  }, [rows]);

  const handleChange = (idx: number, field: keyof WeighingRow, val: string) => {
    const updated = [...rows];
    if (field === "direction") {
      updated[idx] = { ...updated[idx], direction: val as "increasing" | "decreasing" };
    } else {
      const num = parseFloat(val);
      updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    }
    setRows(updated);
  };

  const handleAddRow = () => {
    const last = rows[rows.length - 1];
    setRows([...rows, { load: (last?.load ?? 0) + 1, indication: (last?.load ?? 0) + 1, dL: 0, direction: last?.direction ?? "increasing" }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleLoadDemoData = () => setRows(DEMO_READINGS);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Weighing Test — Load Step Observations</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.4.4 — Record Indication (I) and Changeover Weight (ΔL) for each applied load (L)
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleLoadDemoData} disabled={disabled}
            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
            Load Sample
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleAddRow} disabled={disabled}
            className="h-7 text-xs gap-1">
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Row
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
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Direction</th>
              <th className="py-2.5 px-3">Applied Load (L) [kg]</th>
              <th className="py-2.5 px-3">Indication (I) [kg]</th>
              <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
              <th className="py-2.5 px-3 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={idx} className={`hover:bg-muted/20 transition-colors ${row.direction === "decreasing" ? "bg-blue-500/5" : ""}`}>
                <td className="py-1.5 px-3 font-medium text-foreground">{idx + 1}</td>
                <td className="py-1.5 px-3">
                  <select
                    value={row.direction}
                    onChange={(e) => handleChange(idx, "direction", e.target.value)}
                    disabled={disabled}
                    className="h-7 rounded border border-border bg-background px-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="increasing">↑ Increasing</option>
                    <option value="decreasing">↓ Decreasing</option>
                  </select>
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.load}
                    onChange={(e) => handleChange(idx, "load", e.target.value)}
                    disabled={disabled} className="h-7 w-28 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.indication}
                    onChange={(e) => handleChange(idx, "indication", e.target.value)}
                    disabled={disabled} className="h-7 w-28 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.0001" min="0" value={row.dL}
                    onChange={(e) => handleChange(idx, "dL", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs border-amber-400/50" />
                </td>
                <td className="py-1.5 px-3 text-right">
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={disabled || rows.length <= 1}
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
