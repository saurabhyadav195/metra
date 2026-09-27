/**
 * METRA — components/evaluations/forms/ZeroSettingTestForm.tsx
 * Zero-Setting / Tare Range Test (OIML R 76-1 §A.4.2.1, §A.4.2.3, §A.4.11.2)
 *
 * Captures observations for:
 *   - Initial indication at zero (E₀)
 *   - Multiple tare/zero operations with indication readings
 *   - Changeover weights for each zero-setting step
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ZeroSettingTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface ZeroRow {
  step: number;
  load: number;
  indication: number;
  dL: number;
  note: string;
}

const DEFAULT_ROWS: ZeroRow[] = [
  { step: 1, load: 0, indication: 0, dL: 0, note: "Initial zero" },
];

export function ZeroSettingTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: ZeroSettingTestFormProps) {
  const parseRows = (): ZeroRow[] => {
    if (observations?.steps && Array.isArray(observations.steps) && observations.steps.length > 0) {
      return observations.steps.map((r: any, i: number) => ({
        step: i + 1,
        load: Number(r.L ?? r.load ?? 0),
        indication: Number(r.I ?? r.indication ?? 0),
        dL: Number(r.dL ?? 0),
        note: String(r.note ?? ""),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<ZeroRow[]>(parseRows);
  const [E0, setE0] = useState<number>(
    observations?.E0 !== undefined ? Number(observations.E0) : 0
  );

  useEffect(() => {
    onObservationsChange({
      E0,
      steps: rows.map((r) => ({
        L: r.load,
        I: r.indication,
        dL: r.dL,
        note: r.note,
      })),
    });
  }, [E0, rows]);

  const handleChange = (idx: number, field: keyof ZeroRow, val: string) => {
    const updated = [...rows];
    if (field === "note") {
      updated[idx] = { ...updated[idx], note: val };
    } else {
      const num = parseFloat(val);
      updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    }
    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([...rows, { step: rows.length + 1, load: 0, indication: 0, dL: 0, note: "" }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, step: i + 1 })));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground font-mono">OIML R 76-1 §A.4.2 — Zero Setting / Tare Range Observations</h4>
          <p className="text-[11px] text-muted-foreground">
            Record indication at zero and after each tare/zero operation
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleAddRow} disabled={disabled}
            className="h-7 text-xs gap-1">
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Step
          </Button>
        </div>
      </div>

      {/* E0 field */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1 max-w-xs">
        <Label className="text-xs font-semibold text-foreground">Initial Zero Error (E₀) [kg]:</Label>
        <p className="text-[10px] text-muted-foreground">Reference zero error before operations</p>
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
              <th className="py-2.5 px-3">Step</th>
              <th className="py-2.5 px-3">Applied Load (L) [kg]</th>
              <th className="py-2.5 px-3">Indication (I) [kg]</th>
              <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
              <th className="py-2.5 px-3">Note</th>
              <th className="py-2.5 px-3 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-3 font-medium text-foreground">{row.step}</td>
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
                <td className="py-1.5 px-3">
                  <Input type="text" value={row.note}
                    onChange={(e) => handleChange(idx, "note", e.target.value)}
                    disabled={disabled} className="h-7 w-32 text-xs" placeholder="Optional note" />
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
