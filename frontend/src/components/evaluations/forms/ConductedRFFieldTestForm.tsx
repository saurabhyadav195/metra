/**
 * METRA — components/evaluations/forms/ConductedRFFieldTestForm.tsx
 * Immunity to Conducted Radio-Frequency Fields Test (OIML R 76-1 §B.3.6)
 *
 * Captures:
 *   - Test load (small test load)
 *   - RF amplitude (10 V emf)
 *   - Frequency range (0.15 MHz to 80 MHz)
 *   - Modulation (80% AM, 1 kHz sine)
 *   - Tested cables/lines table:
 *       line description, coupling method (CDN, EM clamp, current probe), indication before, indication during, significant fault status
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ConductedRFFieldTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface ConductedRow {
  line_name: string;
  coupling_method: string;
  rf_amplitude_V: number;
  I_before: number;
  I_during: number;
  significant_fault: boolean;
}

const DEFAULT_ROWS: ConductedRow[] = [
  { line_name: "AC Mains Power Line", coupling_method: "CDN-M3", rf_amplitude_V: 10.0, I_before: 10, I_during: 10, significant_fault: false },
  { line_name: "DC Power Line", coupling_method: "CDN-M2", rf_amplitude_V: 10.0, I_before: 10, I_during: 10, significant_fault: false },
  { line_name: "Load Cell Cable", coupling_method: "EM Clamp", rf_amplitude_V: 10.0, I_before: 10, I_during: 10, significant_fault: false },
  { line_name: "I/O Data Port Cable", coupling_method: "EM Clamp", rf_amplitude_V: 10.0, I_before: 10, I_during: 10, significant_fault: false },
];

export function ConductedRFFieldTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: ConductedRFFieldTestFormProps) {
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : 10
  );
  const [rfAmplitude, setRfAmplitude] = useState<number>(
    observations?.rf_amplitude_V !== undefined ? Number(observations.rf_amplitude_V) : 10.0
  );

  const parseRows = (): ConductedRow[] => {
    if (observations?.rows && Array.isArray(observations.rows) && observations.rows.length > 0) {
      return observations.rows.map((r: any) => ({
        line_name: String(r.line_name ?? r.line ?? ""),
        coupling_method: String(r.coupling_method ?? r.method ?? "CDN"),
        rf_amplitude_V: Number(r.rf_amplitude_V ?? rfAmplitude),
        I_before: Number(r.I_before ?? 0),
        I_during: Number(r.I_during ?? r.I_after ?? 0),
        significant_fault: Boolean(r.significant_fault ?? false),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<ConductedRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      test_load: testLoad,
      rf_amplitude_V: rfAmplitude,
      frequency_range: "0.15 MHz to 80 MHz",
      modulation: "80% AM, 1 kHz sine wave",
      rows: rows.map((r) => ({
        line_name: r.line_name,
        coupling_method: r.coupling_method,
        rf_amplitude_V: r.rf_amplitude_V,
        L: testLoad,
        I_before: r.I_before,
        I_during: r.I_during,
        indication_difference: Math.abs(r.I_during - r.I_before),
        significant_fault_detected: r.significant_fault,
      })),
    });
  }, [testLoad, rfAmplitude, rows]);

  const handleChange = (idx: number, field: keyof ConductedRow, val: any) => {
    const updated = [...rows];
    if (field === "significant_fault") {
      updated[idx] = { ...updated[idx], significant_fault: Boolean(val) };
    } else if (field === "line_name" || field === "coupling_method") {
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
        line_name: "Custom Cable",
        coupling_method: "EM Clamp",
        rf_amplitude_V: rfAmplitude,
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
          OIML R 76-1 §B.3.6 — Conducted RF Disturbances Immunity Observations
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Inject conducted RF (10 V emf, 80% AM 1 kHz) into power and I/O cables from 0.15 MHz to 80 MHz with one small test load.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">RF Amplitude (emf) [V]:</Label>
          <Input
            type="number"
            step="1"
            value={rfAmplitude}
            onChange={(e) => setRfAmplitude(parseFloat(e.target.value) || 0)}
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
          <Label className="text-xs font-semibold text-foreground">Tested Cable / Line Observations</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Cable
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <th className="py-2.5 px-3">Cable / Line Description</th>
                <th className="py-2.5 px-3">Coupling Device</th>
                <th className="py-2.5 px-3">RF Volts (V)</th>
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
                      value={row.line_name}
                      onChange={(e) => handleChange(idx, "line_name", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-36 text-xs font-medium"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="text"
                      value={row.coupling_method}
                      onChange={(e) => handleChange(idx, "coupling_method", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-24 text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="1"
                      value={row.rf_amplitude_V}
                      onChange={(e) => handleChange(idx, "rf_amplitude_V", e.target.value)}
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
