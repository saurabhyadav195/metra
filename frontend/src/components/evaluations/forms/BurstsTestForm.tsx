/**
 * METRA — components/evaluations/forms/BurstsTestForm.tsx
 * Bursts (Fast Transients) Test (OIML R 76-1 §B.3.2)
 *
 * Captures:
 *   - Test load (small test load)
 *   - Power line amplitude (1.0 kV) and I/O line amplitude (0.5 kV)
 *   - Burst test lines table (AC Power L/N/PE, DC Power, I/O lines) with polarity (+/-), indication before, indication during/after, significant fault
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface BurstsTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface BurstRow {
  line_type: string;
  amplitude_kV: number;
  polarity: string;
  I_before: number;
  I_during: number;
  significant_fault: boolean;
  notes: string;
}

const DEFAULT_ROWS: BurstRow[] = [
  { line_type: "AC Power Lines (L1+N+PE)", amplitude_kV: 1.0, polarity: "+", I_before: 10, I_during: 10, significant_fault: false, notes: "Direct coupling 1 min" },
  { line_type: "AC Power Lines (L1+N+PE)", amplitude_kV: 1.0, polarity: "-", I_before: 10, I_during: 10, significant_fault: false, notes: "Direct coupling 1 min" },
  { line_type: "I/O Signal Cables", amplitude_kV: 0.5, polarity: "+", I_before: 10, I_during: 10, significant_fault: false, notes: "Capacitive clamp 1 min" },
  { line_type: "I/O Signal Cables", amplitude_kV: 0.5, polarity: "-", I_before: 10, I_during: 10, significant_fault: false, notes: "Capacitive clamp 1 min" },
];

export function BurstsTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: BurstsTestFormProps) {
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : 10
  );

  const parseRows = (): BurstRow[] => {
    if (observations?.rows && Array.isArray(observations.rows) && observations.rows.length > 0) {
      return observations.rows.map((r: any) => ({
        line_type: String(r.line_type ?? r.line ?? ""),
        amplitude_kV: Number(r.amplitude_kV ?? r.voltage_kV ?? 1.0),
        polarity: String(r.polarity ?? "+"),
        I_before: Number(r.I_before ?? 0),
        I_during: Number(r.I_during ?? r.I_after ?? 0),
        significant_fault: Boolean(r.significant_fault ?? false),
        notes: String(r.notes ?? ""),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<BurstRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      test_load: testLoad,
      rows: rows.map((r) => ({
        line_type: r.line_type,
        amplitude_kV: r.amplitude_kV,
        polarity: r.polarity,
        L: testLoad,
        I_before: r.I_before,
        I_during: r.I_during,
        indication_difference: Math.abs(r.I_during - r.I_before),
        significant_fault_detected: r.significant_fault,
        notes: r.notes,
      })),
    });
  }, [testLoad, rows]);

  const handleChange = (idx: number, field: keyof BurstRow, val: any) => {
    const updated = [...rows];
    if (field === "significant_fault") {
      updated[idx] = { ...updated[idx], significant_fault: Boolean(val) };
    } else if (field === "line_type" || field === "polarity" || field === "notes") {
      updated[idx] = { ...updated[idx], [field]: String(val) };
    } else {
      const num = parseFloat(val);
      updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    }
    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        line_type: "Custom Line",
        amplitude_kV: 0.5,
        polarity: "+",
        I_before: testLoad,
        I_during: testLoad,
        significant_fault: false,
        notes: "",
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h4 className="text-xs font-semibold text-foreground font-mono">
          OIML R 76-1 §B.3.2 — Electrical Fast Transient / Burst Observations
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Apply fast transient bursts (Level 2: 1 kV power lines, 0.5 kV I/O lines) with positive and negative polarity for at least 1 minute each.
        </p>
      </div>

      <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20 max-w-xs">
        <Label className="text-xs font-semibold text-foreground">Test Load (L) [kg]:</Label>
        <Input
          type="number"
          step="0.001"
          value={testLoad}
          onChange={(e) => setTestLoad(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          className="h-8 font-mono text-xs bg-background"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground">Burst Test Line Observations</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Line
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <th className="py-2.5 px-3">Tested Line / Port</th>
                <th className="py-2.5 px-3">Voltage (kV)</th>
                <th className="py-2.5 px-3">Polarity</th>
                <th className="py-2.5 px-3">Indication Before [kg]</th>
                <th className="py-2.5 px-3">Indication During/After [kg]</th>
                <th className="py-2.5 px-3">Significant Fault?</th>
                <th className="py-2.5 px-3 text-right">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-1.5 px-3">
                    <Input
                      type="text"
                      value={row.line_type}
                      onChange={(e) => handleChange(idx, "line_type", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-44 text-xs font-medium"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.1"
                      value={row.amplitude_kV}
                      onChange={(e) => handleChange(idx, "amplitude_kV", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <select
                      value={row.polarity}
                      onChange={(e) => handleChange(idx, "polarity", e.target.value)}
                      disabled={disabled}
                      className="h-7 rounded border border-input bg-background px-2 text-xs font-mono"
                    >
                      <option value="+">Positive (+)</option>
                      <option value="-">Negative (-)</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={row.I_before}
                      onChange={(e) => handleChange(idx, "I_before", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-20 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={row.I_during}
                      onChange={(e) => handleChange(idx, "I_during", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-20 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <select
                      value={row.significant_fault ? "true" : "false"}
                      onChange={(e) => handleChange(idx, "significant_fault", e.target.value === "true")}
                      disabled={disabled}
                      className="h-7 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="false">No (&lt; 1e)</option>
                      <option value="true">Yes (&gt; 1e fault)</option>
                    </select>
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
    </div>
  );
}
