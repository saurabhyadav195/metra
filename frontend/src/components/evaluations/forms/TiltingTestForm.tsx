/**
 * METRA — components/evaluations/forms/TiltingTestForm.tsx
 * Tilting / Out-of-Level Test (OIML R 76-1 §A.4.11.1)
 *
 * Captures observations at different tilt angles/levels:
 *   - Level (reference): indication at 0°
 *   - Tilted: indication at specified tilt angle/offset
 *   - Changeover weights at each point
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TiltingTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface TiltRow {
  position_label: string;
  tilt_angle: number;
  load: number;
  indication: number;
  dL: number;
}

const DEFAULT_ROWS: TiltRow[] = [
  { position_label: "Level", tilt_angle: 0, load: 0, indication: 0, dL: 0 },
];

export function TiltingTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: TiltingTestFormProps) {
  const [E0, setE0] = useState<number>(
    observations?.E0 !== undefined ? Number(observations.E0) : 0
  );

  const parseRows = (): TiltRow[] => {
    if (observations?.positions && Array.isArray(observations.positions) && observations.positions.length > 0) {
      return observations.positions.map((r: any) => ({
        position_label: String(r.position_label ?? r.label ?? ""),
        tilt_angle: Number(r.tilt_angle ?? 0),
        load: Number(r.L ?? r.load ?? 0),
        indication: Number(r.I ?? r.indication ?? 0),
        dL: Number(r.dL ?? 0),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<TiltRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      E0,
      positions: rows.map((r) => ({
        position_label: r.position_label,
        tilt_angle: r.tilt_angle,
        L: r.load,
        I: r.indication,
        dL: r.dL,
      })),
    });
  }, [E0, rows]);

  const handleChange = (idx: number, field: keyof TiltRow, val: string) => {
    const updated = [...rows];
    if (field === "position_label") {
      updated[idx] = { ...updated[idx], position_label: val };
    } else {
      const num = parseFloat(val);
      updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    }
    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([...rows, { position_label: "", tilt_angle: 0, load: 0, indication: 0, dL: 0 }]);
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
          <h4 className="text-xs font-semibold text-foreground">Tilting Test — Out-of-Level Position Observations</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.4.11.1 — Record indication at level and at maximum permitted out-of-level positions
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
            Add Position
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
              <th className="py-2.5 px-3">Position</th>
              <th className="py-2.5 px-3">Tilt Angle (°)</th>
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
                  <Input type="text" value={row.position_label}
                    onChange={(e) => handleChange(idx, "position_label", e.target.value)}
                    disabled={disabled} className="h-7 w-28 text-xs" placeholder="e.g. Level" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.1" value={row.tilt_angle}
                    onChange={(e) => handleChange(idx, "tilt_angle", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs" />
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
