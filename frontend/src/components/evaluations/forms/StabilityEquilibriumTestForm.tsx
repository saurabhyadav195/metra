/**
 * METRA — components/evaluations/forms/StabilityEquilibriumTestForm.tsx
 * Stability of Equilibrium / Span Stability Test (OIML R 76-1 §A.4.12)
 *
 * Uses the same weighing form layout as WeighingTestForm since the test
 * procedure records load steps (L, I, ΔL) at different points in time
 * to check span drift. Direction field captures temporal order.
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface StabilityEquilibriumTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface StabilityRow {
  time_label: string;
  load: number;
  indication: number;
  dL: number;
}

const DEFAULT_ROWS: StabilityRow[] = [
  { time_label: "t=0 min", load: 0, indication: 0, dL: 0 },
];

export function StabilityEquilibriumTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: StabilityEquilibriumTestFormProps) {
  const [E0, setE0] = useState<number>(
    observations?.E0 !== undefined ? Number(observations.E0) : 0
  );

  const parseRows = (): StabilityRow[] => {
    if (observations?.readings && Array.isArray(observations.readings) && observations.readings.length > 0) {
      return observations.readings.map((r: any) => ({
        time_label: String(r.time_label ?? r.label ?? ""),
        load: Number(r.L ?? r.load ?? 0),
        indication: Number(r.I ?? r.indication ?? 0),
        dL: Number(r.dL ?? 0),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<StabilityRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      E0,
      readings: rows.map((r) => ({
        time_label: r.time_label,
        L: r.load,
        I: r.indication,
        dL: r.dL,
      })),
    });
  }, [E0, rows]);

  const handleChange = (idx: number, field: keyof StabilityRow, val: string) => {
    const updated = [...rows];
    if (field === "time_label") {
      updated[idx] = { ...updated[idx], time_label: val };
    } else {
      const num = parseFloat(val);
      updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    }
    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([...rows, { time_label: "", load: 15.0, indication: 15.0, dL: 0 }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleDemo = () => {
    setE0(0);
    setRows(DEFAULT_ROWS);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Stability of Equilibrium — Time-Series Weighing</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.4.12 — Weigh a stable load at intervals; check indication drift over time
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

      {/* E0 */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1 max-w-xs">
        <Label className="text-xs font-semibold text-foreground">Initial Zero Error (E₀) [kg]:</Label>
        <div className="flex items-center gap-1.5">
          <Input type="number" step="0.0001" value={E0}
            onChange={(e) => setE0(parseFloat(e.target.value) || 0)}
            disabled={disabled} className="h-8 font-mono text-xs bg-background" />
          <span className="text-xs text-muted-foreground font-medium shrink-0">kg</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Time / Label</th>
              <th className="py-2.5 px-3">Applied Load (L) [kg]</th>
              <th className="py-2.5 px-3">Indication (I) [kg]</th>
              <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
              <th className="py-2.5 px-3 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-3 font-medium text-foreground">{idx + 1}</td>
                <td className="py-1.5 px-3">
                  <Input type="text" value={row.time_label}
                    onChange={(e) => handleChange(idx, "time_label", e.target.value)}
                    disabled={disabled} className="h-7 w-28 text-xs" placeholder="e.g. t=30 min" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.load}
                    onChange={(e) => handleChange(idx, "load", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.indication}
                    onChange={(e) => handleChange(idx, "indication", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.0001" min="0" value={row.dL}
                    onChange={(e) => handleChange(idx, "dL", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs border-amber-400/50" />
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

      <p className="text-[11px] text-muted-foreground italic">
        Representative demonstration data — not a certified laboratory measurement.
      </p>
    </div>
  );
}
