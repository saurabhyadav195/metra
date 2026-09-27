/**
 * METRA — components/evaluations/forms/RadiatedEMFieldTestForm.tsx
 * Immunity to Radiated Electromagnetic Fields Test (OIML R 76-1 §B.3.5)
 *
 * Captures:
 *   - Field strength (default 10 V/m)
 *   - Frequency range (80 MHz to 2000 MHz)
 *   - Modulation (80% AM, 1 kHz sine)
 *   - Small test load L
 *   - Antenna & EUT orientation observations table:
 *       frequency band, antenna polarization, EUT face, indication before, indication during exposure, indication after, significant fault status
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RadiatedEMFieldTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface RadiatedRow {
  frequency_band: string;
  field_strength_V_m: number;
  polarization: string;
  eut_face: string;
  I_before: number;
  I_during: number;
  significant_fault: boolean;
}

const DEFAULT_ROWS: RadiatedRow[] = [
  { frequency_band: "80 MHz - 1000 MHz", field_strength_V_m: 10.0, polarization: "Vertical", eut_face: "Front", I_before: 10, I_during: 10, significant_fault: false },
  { frequency_band: "80 MHz - 1000 MHz", field_strength_V_m: 10.0, polarization: "Horizontal", eut_face: "Front", I_before: 10, I_during: 10, significant_fault: false },
  { frequency_band: "1.4 GHz - 2.0 GHz", field_strength_V_m: 10.0, polarization: "Vertical", eut_face: "Front", I_before: 10, I_during: 10, significant_fault: false },
  { frequency_band: "1.4 GHz - 2.0 GHz", field_strength_V_m: 10.0, polarization: "Horizontal", eut_face: "Front", I_before: 10, I_during: 10, significant_fault: false },
];

export function RadiatedEMFieldTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: RadiatedEMFieldTestFormProps) {
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : 10
  );
  const [fieldStrength, setFieldStrength] = useState<number>(
    observations?.field_strength_V_m !== undefined ? Number(observations.field_strength_V_m) : 10.0
  );

  const parseRows = (): RadiatedRow[] => {
    if (observations?.rows && Array.isArray(observations.rows) && observations.rows.length > 0) {
      return observations.rows.map((r: any) => ({
        frequency_band: String(r.frequency_band ?? r.frequency ?? ""),
        field_strength_V_m: Number(r.field_strength_V_m ?? fieldStrength),
        polarization: String(r.polarization ?? "Vertical"),
        eut_face: String(r.eut_face ?? "Front"),
        I_before: Number(r.I_before ?? 0),
        I_during: Number(r.I_during ?? r.I_after ?? 0),
        significant_fault: Boolean(r.significant_fault ?? false),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<RadiatedRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      test_load: testLoad,
      field_strength_V_m: fieldStrength,
      frequency_range: "80 MHz to 2000 MHz",
      modulation: "80% AM, 1 kHz sine wave",
      rows: rows.map((r) => ({
        frequency_band: r.frequency_band,
        field_strength_V_m: r.field_strength_V_m,
        polarization: r.polarization,
        eut_face: r.eut_face,
        L: testLoad,
        I_before: r.I_before,
        I_during: r.I_during,
        indication_difference: Math.abs(r.I_during - r.I_before),
        significant_fault_detected: r.significant_fault,
      })),
    });
  }, [testLoad, fieldStrength, rows]);

  const handleChange = (idx: number, field: keyof RadiatedRow, val: any) => {
    const updated = [...rows];
    if (field === "significant_fault") {
      updated[idx] = { ...updated[idx], significant_fault: Boolean(val) };
    } else if (field === "frequency_band" || field === "polarization" || field === "eut_face") {
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
        frequency_band: "80 MHz - 2000 MHz",
        field_strength_V_m: fieldStrength,
        polarization: "Vertical",
        eut_face: "Rear",
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
          OIML R 76-1 §B.3.5 — Radiated Electromagnetic Fields Immunity Observations
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Expose EUT with one small test load to 10 V/m field in anechoic chamber across 80 MHz to 2000 MHz.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Field Strength [V/m]:</Label>
          <Input
            type="number"
            step="1"
            value={fieldStrength}
            onChange={(e) => setFieldStrength(parseFloat(e.target.value) || 0)}
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
          <Label className="text-xs font-semibold text-foreground">Frequency Band & Orientation Observations</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Frequency Band
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <th className="py-2.5 px-3">Frequency Band</th>
                <th className="py-2.5 px-3">Polarization</th>
                <th className="py-2.5 px-3">EUT Face</th>
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
                      value={row.frequency_band}
                      onChange={(e) => handleChange(idx, "frequency_band", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-36 text-xs font-medium"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <select
                      value={row.polarization}
                      onChange={(e) => handleChange(idx, "polarization", e.target.value)}
                      disabled={disabled}
                      className="h-7 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="Vertical">Vertical</option>
                      <option value="Horizontal">Horizontal</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="text"
                      value={row.eut_face}
                      onChange={(e) => handleChange(idx, "eut_face", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-20 text-xs"
                      placeholder="Front/Rear"
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
