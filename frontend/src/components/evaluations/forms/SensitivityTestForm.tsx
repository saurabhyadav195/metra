/**
 * METRA — components/evaluations/forms/SensitivityTestForm.tsx
 * Sensitivity of the Equilibrium Test (OIML R 76-1 §A.4.8.1)
 *
 * Captures:
 *   - Multiple load points
 *   - Indication before adding small extra weight
 *   - Indication after adding extra weight (~0.4d to 1.4d)
 *   - Extra weight applied (d_extra)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SensitivityTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface SensitivityRow {
  test_load: number;
  I_before: number;
  d_extra: number;
  I_after: number;
}

const DEFAULT_ROWS: SensitivityRow[] = [
  { test_load: 0, I_before: 0, d_extra: 0, I_after: 0 },
];

export function SensitivityTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: SensitivityTestFormProps) {
  const [d, setD] = useState<number>(observations?.d !== undefined ? Number(observations.d) : 0.01);

  const parseRows = (): SensitivityRow[] => {
    if (observations?.rows && Array.isArray(observations.rows) && observations.rows.length > 0) {
      return observations.rows.map((r: any) => ({
        test_load: Number(r.test_load ?? r.L ?? 0),
        I_before: Number(r.I_before ?? 0),
        d_extra: Number(r.d_extra ?? 0),
        I_after: Number(r.I_after ?? 0),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<SensitivityRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({ d, rows });
  }, [d, rows]);

  const handleChange = (idx: number, field: keyof SensitivityRow, val: string) => {
    const num = parseFloat(val);
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([...rows, { test_load: 0, I_before: 0, d_extra: 0.004, I_after: 0 }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleDemo = () => {
    setD(0.01);
    setRows(DEFAULT_ROWS);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Sensitivity of Equilibrium — Load Step Observations</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.4.8.1 — Add small extra weight; verify indication changes by ≥ d
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
            Add Load
          </Button>
        </div>
      </div>

      {/* Scale interval d */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1 max-w-xs">
        <Label className="text-xs font-semibold text-foreground">Scale Interval (d) [kg]:</Label>
        <div className="flex items-center gap-1.5">
          <Input type="number" step="0.001" min="0" value={d}
            onChange={(e) => setD(parseFloat(e.target.value) || 0)}
            disabled={disabled} className="h-8 font-mono text-xs bg-background" />
          <span className="text-xs text-muted-foreground font-medium shrink-0">kg</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Test Load (L) [kg]</th>
              <th className="py-2.5 px-3">Indication Before (I₁) [kg]</th>
              <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Extra Weight (d_extra) [kg]</th>
              <th className="py-2.5 px-3">Indication After (I₂) [kg]</th>
              <th className="py-2.5 px-3 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-3 font-medium text-foreground">{idx + 1}</td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.test_load}
                    onChange={(e) => handleChange(idx, "test_load", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.I_before}
                    onChange={(e) => handleChange(idx, "I_before", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.0001" min="0" value={row.d_extra}
                    onChange={(e) => handleChange(idx, "d_extra", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs border-amber-400/50" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.I_after}
                    onChange={(e) => handleChange(idx, "I_after", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs" />
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
