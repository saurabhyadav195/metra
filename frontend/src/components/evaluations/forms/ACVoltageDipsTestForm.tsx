/**
 * METRA — components/evaluations/forms/ACVoltageDipsTestForm.tsx
 * AC Mains Voltage Dips and Short Interruptions Test (OIML R 76-1 §B.3.1)
 *
 * Captures:
 *   - Nominal voltage U_nom (V)
 *   - Test load (small load applied during disturbance)
 *   - Standard disturbance sequence observations (0% 0.5 cycle, 0% 1 cycle, 40% 10 cycles, 70% 25 cycles, 80% 250 cycles, short interruption 0% 250 cycles):
 *       indication before, indication during/after, indication difference (e), functional response / significant fault status
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ACVoltageDipsTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface DipRow {
  test_a_e: string;
  reduction_percent: number;
  duration_cycles: number;
  I_before: number;
  I_during: number;
  significant_fault: boolean;
  notes: string;
}

const DEFAULT_ROWS: DipRow[] = [
  { test_a_e: "Test a (Dip 0%)", reduction_percent: 0, duration_cycles: 0.5, I_before: 10, I_during: 10, significant_fault: false, notes: "0.5 cycle dip" },
  { test_a_e: "Test b (Dip 0%)", reduction_percent: 0, duration_cycles: 1, I_before: 10, I_during: 10, significant_fault: false, notes: "1 cycle dip" },
  { test_a_e: "Test c (Dip 40%)", reduction_percent: 40, duration_cycles: 10, I_before: 10, I_during: 10, significant_fault: false, notes: "10 cycles dip" },
  { test_a_e: "Test d (Dip 70%)", reduction_percent: 70, duration_cycles: 25, I_before: 10, I_during: 10, significant_fault: false, notes: "25 cycles dip" },
  { test_a_e: "Test e (Dip 80%)", reduction_percent: 80, duration_cycles: 250, I_before: 10, I_during: 10, significant_fault: false, notes: "250 cycles dip" },
  { test_a_e: "Short Interruption (0%)", reduction_percent: 0, duration_cycles: 250, I_before: 10, I_during: 10, significant_fault: false, notes: "250 cycles interruption" },
];

export function ACVoltageDipsTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: ACVoltageDipsTestFormProps) {
  const [uNom, setUNom] = useState<number>(
    observations?.nominal_voltage !== undefined ? Number(observations.nominal_voltage) : 230
  );
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : 10
  );

  const parseRows = (): DipRow[] => {
    if (observations?.rows && Array.isArray(observations.rows) && observations.rows.length > 0) {
      return observations.rows.map((r: any) => ({
        test_a_e: String(r.test_a_e ?? r.label ?? ""),
        reduction_percent: Number(r.reduction_percent ?? r.voltage_percent ?? 0),
        duration_cycles: Number(r.duration_cycles ?? r.cycles ?? 0),
        I_before: Number(r.I_before ?? 0),
        I_during: Number(r.I_during ?? r.I_after ?? 0),
        significant_fault: Boolean(r.significant_fault ?? false),
        notes: String(r.notes ?? ""),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<DipRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      nominal_voltage: uNom,
      test_load: testLoad,
      rows: rows.map((r) => ({
        test_a_e: r.test_a_e,
        reduction_percent: r.reduction_percent,
        duration_cycles: r.duration_cycles,
        L: testLoad,
        I_before: r.I_before,
        I_during: r.I_during,
        indication_difference: Math.abs(r.I_during - r.I_before),
        significant_fault_detected: r.significant_fault,
        notes: r.notes,
      })),
    });
  }, [uNom, testLoad, rows]);

  const handleChange = (idx: number, field: keyof DipRow, val: any) => {
    const updated = [...rows];
    if (field === "significant_fault") {
      updated[idx] = { ...updated[idx], significant_fault: Boolean(val) };
    } else if (field === "test_a_e" || field === "notes") {
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
        test_a_e: "Custom Dip",
        reduction_percent: 50,
        duration_cycles: 10,
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
          OIML R 76-1 §B.3.1 — AC Mains Voltage Dips and Short Interruptions Observations
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Apply prescribed voltage reductions/interruptions 10 times each while observing indication under small test load.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Nominal Voltage (U_nom) [V]:</Label>
          <Input
            type="number"
            step="1"
            value={uNom}
            onChange={(e) => setUNom(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>

        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
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
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground">Disturbance Sequence Observations</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Event
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <th className="py-2.5 px-3">Disturbance Stage</th>
                <th className="py-2.5 px-3">Voltage (%)</th>
                <th className="py-2.5 px-3">Cycles</th>
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
                      value={row.test_a_e}
                      onChange={(e) => handleChange(idx, "test_a_e", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-36 text-xs font-medium"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="1"
                      value={row.reduction_percent}
                      onChange={(e) => handleChange(idx, "reduction_percent", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.5"
                      value={row.duration_cycles}
                      onChange={(e) => handleChange(idx, "duration_cycles", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 font-mono text-xs"
                    />
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
