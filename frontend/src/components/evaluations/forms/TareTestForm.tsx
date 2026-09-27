/**
 * METRA — components/evaluations/forms/TareTestForm.tsx
 * Tare Device Test (OIML R 76-1 §A.4.6.1)
 *
 * Captures:
 *   - Tare range limit used
 *   - Multiple load steps with indication before and after tare
 *   - Changeover weights at each step
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TareTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface TareRow {
  tare_load: number;
  net_load: number;
  I_gross: number;
  I_net: number;
  dL: number;
}

const DEFAULT_ROWS: TareRow[] = [
  { tare_load: 0, net_load: 0, I_gross: 0, I_net: 0, dL: 0 },
];

export function TareTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: TareTestFormProps) {
  const [E0, setE0] = useState<number>(
    observations?.E0 !== undefined ? Number(observations.E0) : 0
  );

  const parseRows = (): TareRow[] => {
    if (observations?.readings && Array.isArray(observations.readings) && observations.readings.length > 0) {
      return observations.readings.map((r: any) => ({
        tare_load: Number(r.tare_load ?? r.T ?? 0),
        net_load: Number(r.net_load ?? r.L ?? 0),
        I_gross: Number(r.I_gross ?? r.I ?? 0),
        I_net: Number(r.I_net ?? 0),
        dL: Number(r.dL ?? 0),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<TareRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      E0,
      readings: rows.map((r) => ({
        T: r.tare_load,
        L: r.net_load,
        I_gross: r.I_gross,
        I_net: r.I_net,
        dL: r.dL,
      })),
    });
  }, [E0, rows]);

  const handleChange = (idx: number, field: keyof TareRow, val: string) => {
    const num = parseFloat(val);
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    setRows(updated);
  };

  const handleAddRow = () => {
    const last = rows[rows.length - 1];
    setRows([...rows, { tare_load: (last?.tare_load ?? 0) + 5, net_load: 1, I_gross: 0, I_net: 0, dL: 0 }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground font-mono">OIML R 76-1 §A.4.6.1 — Tare Device Test Observations</h4>
          <p className="text-[11px] text-muted-foreground">
            Tare at multiple loads; record gross and net indications with changeover weights
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleAddRow} disabled={disabled}
            className="h-7 text-xs gap-1">
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Row
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
              <th className="py-2.5 px-3">Tare Load (T) [kg]</th>
              <th className="py-2.5 px-3">Net Load (L) [kg]</th>
              <th className="py-2.5 px-3">Gross Indication (I_gross) [kg]</th>
              <th className="py-2.5 px-3">Net Indication (I_net) [kg]</th>
              <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
              <th className="py-2.5 px-3 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-3 font-medium text-foreground">{idx + 1}</td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.tare_load}
                    onChange={(e) => handleChange(idx, "tare_load", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.net_load}
                    onChange={(e) => handleChange(idx, "net_load", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.I_gross}
                    onChange={(e) => handleChange(idx, "I_gross", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={row.I_net}
                    onChange={(e) => handleChange(idx, "I_net", e.target.value)}
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
    </div>
  );
}
