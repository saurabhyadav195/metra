/**
 * METRA — components/evaluations/forms/ESDTestForm.tsx
 * Electrostatic Discharge (ESD) Test (OIML R 76-1 §B.3.4)
 *
 * Captures:
 *   - Test load (small test load)
 *   - Discharge configuration table:
 *       discharge type (contact, air, indirect HCP, indirect VCP), voltage (kV), count, location, polarity, indication before, indication during/after, significant fault status
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ESDTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface ESDRow {
  discharge_type: string;
  voltage_kV: number;
  location: string;
  count: number;
  I_before: number;
  I_during: number;
  significant_fault: boolean;
}

const DEFAULT_ROWS: ESDRow[] = [
  { discharge_type: "Contact", voltage_kV: 6.0, location: "Metal enclosure / screws", count: 10, I_before: 10, I_during: 10, significant_fault: false },
  { discharge_type: "Air", voltage_kV: 8.0, location: "Display / Keypad slots", count: 10, I_before: 10, I_during: 10, significant_fault: false },
  { discharge_type: "Indirect (HCP)", voltage_kV: 6.0, location: "Horizontal Coupling Plane", count: 10, I_before: 10, I_during: 10, significant_fault: false },
  { discharge_type: "Indirect (VCP)", voltage_kV: 6.0, location: "Vertical Coupling Plane", count: 10, I_before: 10, I_during: 10, significant_fault: false },
];

export function ESDTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: ESDTestFormProps) {
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : 10
  );

  const parseRows = (): ESDRow[] => {
    if (observations?.rows && Array.isArray(observations.rows) && observations.rows.length > 0) {
      return observations.rows.map((r: any) => ({
        discharge_type: String(r.discharge_type ?? r.type ?? "Contact"),
        voltage_kV: Number(r.voltage_kV ?? r.kV ?? 6.0),
        location: String(r.location ?? ""),
        count: Number(r.count ?? 10),
        I_before: Number(r.I_before ?? 0),
        I_during: Number(r.I_during ?? r.I_after ?? 0),
        significant_fault: Boolean(r.significant_fault ?? false),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<ESDRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      test_load: testLoad,
      rows: rows.map((r) => ({
        discharge_type: r.discharge_type,
        voltage_kV: r.voltage_kV,
        location: r.location,
        count: r.count,
        L: testLoad,
        I_before: r.I_before,
        I_during: r.I_during,
        indication_difference: Math.abs(r.I_during - r.I_before),
        significant_fault_detected: r.significant_fault,
      })),
    });
  }, [testLoad, rows]);

  const handleChange = (idx: number, field: keyof ESDRow, val: any) => {
    const updated = [...rows];
    if (field === "significant_fault") {
      updated[idx] = { ...updated[idx], significant_fault: Boolean(val) };
    } else if (field === "discharge_type" || field === "location") {
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
        discharge_type: "Contact",
        voltage_kV: 4.0,
        location: "Enclosure point",
        count: 10,
        I_before: testLoad,
        I_during: testLoad,
        significant_fault: false,
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
          OIML R 76-1 §B.3.4 — Electrostatic Discharge (ESD) Observations
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Apply at least 10 discharges (Level 3: up to 6 kV contact, 8 kV air) with at least 10s intervals using one small test load.
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
          <Label className="text-xs font-semibold text-foreground">ESD Discharge Point Observations</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Point
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <th className="py-2.5 px-3">Discharge Type</th>
                <th className="py-2.5 px-3">Voltage (kV)</th>
                <th className="py-2.5 px-3">Discharge Location</th>
                <th className="py-2.5 px-3">Count</th>
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
                    <select
                      value={row.discharge_type}
                      onChange={(e) => handleChange(idx, "discharge_type", e.target.value)}
                      disabled={disabled}
                      className="h-7 rounded border border-input bg-background px-2 text-xs font-medium"
                    >
                      <option value="Contact">Contact</option>
                      <option value="Air">Air</option>
                      <option value="Indirect (HCP)">Indirect (HCP)</option>
                      <option value="Indirect (VCP)">Indirect (VCP)</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.5"
                      value={row.voltage_kV}
                      onChange={(e) => handleChange(idx, "voltage_kV", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="text"
                      value={row.location}
                      onChange={(e) => handleChange(idx, "location", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-36 text-xs"
                      placeholder="e.g. Frame screw"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={row.count}
                      onChange={(e) => handleChange(idx, "count", e.target.value)}
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
