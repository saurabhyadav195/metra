/**
 * METRA — components/evaluations/forms/SenseFunctionSixWireTestForm.tsx
 * Testing the Sense Function — 6-Wire Connection (OIML R 76-1 §C.3.3)
 *
 * Captures observations for 6-wire load cell sense compensation:
 *   - 6-wire connection availability
 *   - Load-cell excitation voltage (V)
 *   - Max excitation voltage (V)
 *   - Number of load cells
 *   - Simulated max cable length (m)
 *   - Line resistances R_exc, R_sense (ohms)
 *   - Span shifts & reference observations table
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SenseFunctionSixWireTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface SenseRow {
  condition: string;
  temperature_c: number;
  r_exc_ohm: number;
  r_sense_ohm: number;
  reference_indication: number;
  indication_after_sim: number;
  dL: number;
}

const DEFAULT_ROWS: SenseRow[] = [
  { condition: "Reference (Short cable / nominal temp)", temperature_c: 20, r_exc_ohm: 0.1, r_sense_ohm: 0.1, reference_indication: 100, indication_after_sim: 100, dL: 0 },
  { condition: "Simulated Max Cable Temp Shift (+50 °C)", temperature_c: 50, r_exc_ohm: 10.0, r_sense_ohm: 10.0, reference_indication: 100, indication_after_sim: 100, dL: 0 },
  { condition: "Simulated Max Cable Temp Shift (-10 °C)", temperature_c: -10, r_exc_ohm: 8.0, r_sense_ohm: 8.0, reference_indication: 100, indication_after_sim: 100, dL: 0 },
];

export function SenseFunctionSixWireTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: SenseFunctionSixWireTestFormProps) {
  const [sixWireEnabled, setSixWireEnabled] = useState<boolean>(
    observations?.six_wire_enabled !== undefined ? Boolean(observations.six_wire_enabled) : true
  );
  const [excitationVoltage, setExcitationVoltage] = useState<number>(
    observations?.excitation_voltage !== undefined ? Number(observations.excitation_voltage) : 5.0
  );
  const [numLoadCells, setNumLoadCells] = useState<number>(
    observations?.number_of_load_cells !== undefined ? Number(observations.number_of_load_cells) : 4
  );
  const [cableLengthM, setCableLengthM] = useState<number>(
    observations?.cable_length_m !== undefined ? Number(observations.cable_length_m) : 100
  );

  const parseRows = (): SenseRow[] => {
    if (observations?.rows && Array.isArray(observations.rows) && observations.rows.length > 0) {
      return observations.rows.map((r: any) => ({
        condition: String(r.condition ?? r.label ?? ""),
        temperature_c: Number(r.temperature_c ?? r.temp ?? 20),
        r_exc_ohm: Number(r.r_exc_ohm ?? r.R_cable ?? 0),
        r_sense_ohm: Number(r.r_sense_ohm ?? r.R_sense ?? 0),
        reference_indication: Number(r.reference_indication ?? r.I_ref ?? 0),
        indication_after_sim: Number(r.indication_after_sim ?? r.I_sim ?? r.I ?? 0),
        dL: Number(r.dL ?? 0),
      }));
    }
    return DEFAULT_ROWS;
  };

  const [rows, setRows] = useState<SenseRow[]>(parseRows);

  useEffect(() => {
    onObservationsChange({
      six_wire_enabled: sixWireEnabled,
      excitation_voltage: excitationVoltage,
      number_of_load_cells: numLoadCells,
      cable_length_m: cableLengthM,
      R_cable: rows[0]?.r_exc_ohm ?? 10.0,
      rows: rows.map((r) => ({
        condition: r.condition,
        temperature_c: r.temperature_c,
        r_exc_ohm: r.r_exc_ohm,
        r_sense_ohm: r.r_sense_ohm,
        reference_indication: r.reference_indication,
        indication_after_sim: r.indication_after_sim,
        I: r.indication_after_sim,
        span_variation: Math.abs(r.indication_after_sim - r.reference_indication),
        dL: r.dL,
      })),
    });
  }, [sixWireEnabled, excitationVoltage, numLoadCells, cableLengthM, rows]);

  const handleChange = (idx: number, field: keyof SenseRow, val: any) => {
    const updated = [...rows];
    if (field === "condition") {
      updated[idx] = { ...updated[idx], condition: String(val) };
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
        condition: "Custom Cable Temp Point",
        temperature_c: 20,
        r_exc_ohm: 5.0,
        r_sense_ohm: 5.0,
        reference_indication: 100,
        indication_after_sim: 100,
        dL: 0,
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
          OIML R 76-1 §C.3.3 — Sense Function (6-Wire Connection) Observations
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Simulate max cable length and load cell excitation/sense temperature variations. Verify that the indicator compensates for cable resistance changes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">6-Wire Connection</Label>
          <select
            value={sixWireEnabled ? "true" : "false"}
            onChange={(e) => setSixWireEnabled(e.target.value === "true")}
            disabled={disabled}
            className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
          >
            <option value="true">Enabled / Present</option>
            <option value="false">Not Available</option>
          </select>
        </div>

        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Excitation Voltage [V]:</Label>
          <Input
            type="number"
            step="0.1"
            value={excitationVoltage}
            onChange={(e) => setExcitationVoltage(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>

        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">No. of Load Cells:</Label>
          <Input
            type="number"
            step="1"
            min="1"
            value={numLoadCells}
            onChange={(e) => setNumLoadCells(parseInt(e.target.value) || 1)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>

        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Max Cable Length [m]:</Label>
          <Input
            type="number"
            step="1"
            value={cableLengthM}
            onChange={(e) => setCableLengthM(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground">6-Wire Resistance Simulation Observations</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Simulation Step
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <th className="py-2.5 px-3">Simulation Condition</th>
                <th className="py-2.5 px-3">Temp (°C)</th>
                <th className="py-2.5 px-3">R_exc (Ω)</th>
                <th className="py-2.5 px-3">R_sense (Ω)</th>
                <th className="py-2.5 px-3">Ref Indication [kg]</th>
                <th className="py-2.5 px-3">Indication After Sim [kg]</th>
                <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">ΔL [kg]</th>
                <th className="py-2.5 px-3 text-right">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-1.5 px-3">
                    <Input
                      type="text"
                      value={row.condition}
                      onChange={(e) => handleChange(idx, "condition", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-48 text-xs font-medium"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="1"
                      value={row.temperature_c}
                      onChange={(e) => handleChange(idx, "temperature_c", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-14 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.1"
                      value={row.r_exc_ohm}
                      onChange={(e) => handleChange(idx, "r_exc_ohm", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.1"
                      value={row.r_sense_ohm}
                      onChange={(e) => handleChange(idx, "r_sense_ohm", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={row.reference_indication}
                      onChange={(e) => handleChange(idx, "reference_indication", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-20 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={row.indication_after_sim}
                      onChange={(e) => handleChange(idx, "indication_after_sim", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-20 font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={row.dL}
                      onChange={(e) => handleChange(idx, "dL", e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 font-mono text-xs border-amber-400/50"
                    />
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
