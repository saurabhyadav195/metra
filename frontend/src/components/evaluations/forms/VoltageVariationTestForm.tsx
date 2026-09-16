/**
 * METRA — components/evaluations/forms/VoltageVariationTestForm.tsx
 * Voltage Variation / Power Supply Influence Test (OIML R 76-1 §A.5.4, §A.5.2)
 *
 * Two stages: Reference voltage and varied voltage(s)
 * Each stage: header fields (voltage, frequency) + weighing table (L, I, ΔL)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface VoltageVariationTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface LoadRow {
  L: number;
  I: number;
  dL: number;
}

interface VoltageStage {
  voltage: number;
  frequency: number;
  time: string;
  readings: LoadRow[];
}

const DEMO_READINGS: LoadRow[] = [
  { L: 0, I: 0, dL: 0 },
];

function parseVoltageStage(raw: any, defaultVoltage: number): VoltageStage {
  if (raw && typeof raw === "object") {
    return {
      voltage: Number(raw.voltage ?? defaultVoltage),
      frequency: Number(raw.frequency ?? 50),
      time: String(raw.time ?? ""),
      readings: Array.isArray(raw.readings) && raw.readings.length > 0
        ? raw.readings.map((r: any) => ({ L: Number(r.L ?? 0), I: Number(r.I ?? 0), dL: Number(r.dL ?? 0) }))
        : DEMO_READINGS.map((r) => ({ ...r })),
    };
  }
  return { voltage: defaultVoltage, frequency: 50, time: "", readings: DEMO_READINGS.map((r) => ({ ...r })) };
}

function VoltageStagePanel({
  label,
  colorClass,
  stage,
  onChange,
  disabled,
}: {
  label: string;
  colorClass: string;
  stage: VoltageStage;
  onChange: (s: VoltageStage) => void;
  disabled: boolean;
}) {
  const handleFieldChange = (field: "voltage" | "frequency" | "time", val: string) => {
    if (field === "time") {
      onChange({ ...stage, time: val });
    } else {
      const num = parseFloat(val);
      onChange({ ...stage, [field]: isNaN(num) ? 0 : num });
    }
  };

  const handleRowChange = (idx: number, field: keyof LoadRow, val: string) => {
    const num = parseFloat(val);
    const updated = [...stage.readings];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    onChange({ ...stage, readings: updated });
  };

  const handleAddRow = () => {
    const last = stage.readings[stage.readings.length - 1];
    onChange({ ...stage, readings: [...stage.readings, { L: (last?.L ?? 0) + 5, I: (last?.L ?? 0) + 5, dL: 0 }] });
  };

  const handleRemoveRow = (idx: number) => {
    if (stage.readings.length <= 1) return;
    onChange({ ...stage, readings: stage.readings.filter((_, i) => i !== idx) });
  };

  return (
    <div className={`rounded-md border p-4 space-y-3 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">{label}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRow} disabled={disabled}
          className="h-7 text-xs gap-1">
          <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
          Add Load
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Supply Voltage (V)</Label>
          <Input type="number" step="1" value={stage.voltage}
            onChange={(e) => handleFieldChange("voltage", e.target.value)}
            disabled={disabled} className="h-7 font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Frequency (Hz)</Label>
          <Input type="number" step="0.1" value={stage.frequency}
            onChange={(e) => handleFieldChange("frequency", e.target.value)}
            disabled={disabled} className="h-7 font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Time (HH:MM)</Label>
          <Input type="text" value={stage.time}
            onChange={(e) => handleFieldChange("time", e.target.value)}
            disabled={disabled} className="h-7 text-xs" placeholder="HH:MM" />
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30 font-medium text-muted-foreground">
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">L [kg]</th>
              <th className="py-2 px-2">I [kg]</th>
              <th className="py-2 px-2 text-amber-600 dark:text-amber-400">ΔL [kg]</th>
              <th className="py-2 px-2 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stage.readings.map((r, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-2 font-medium text-foreground">{idx + 1}</td>
                <td className="py-1.5 px-2">
                  <Input type="number" step="0.001" value={r.L}
                    onChange={(e) => handleRowChange(idx, "L", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="number" step="0.001" value={r.I}
                    onChange={(e) => handleRowChange(idx, "I", e.target.value)}
                    disabled={disabled} className="h-7 w-20 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="number" step="0.0001" min="0" value={r.dL}
                    onChange={(e) => handleRowChange(idx, "dL", e.target.value)}
                    disabled={disabled} className="h-7 w-16 font-mono text-xs border-amber-400/50" />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={disabled || stage.readings.length <= 1}
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

export function VoltageVariationTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: VoltageVariationTestFormProps) {
  const [reference, setReference] = useState<VoltageStage>(() =>
    parseVoltageStage(observations?.reference, 230)
  );
  const [low, setLow] = useState<VoltageStage>(() =>
    parseVoltageStage(observations?.low, 195)
  );
  const [high, setHigh] = useState<VoltageStage>(() =>
    parseVoltageStage(observations?.high, 265)
  );

  useEffect(() => {
    onObservationsChange({ reference, low, high });
  }, [reference, low, high]);

  const handleDemo = () => {
    setReference({ voltage: 230, frequency: 50, time: "08:00", readings: DEMO_READINGS.map((r) => ({ ...r })) });
    setLow({ voltage: 195, frequency: 50, time: "09:00", readings: DEMO_READINGS.map((r) => ({ ...r, I: r.I + 0.001 })) });
    setHigh({ voltage: 265, frequency: 50, time: "10:00", readings: DEMO_READINGS.map((r) => ({ ...r, I: r.I - 0.001 })) });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Voltage Variation — 3-Stage Power Supply Protocol</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.5.4 — Reference voltage → Low voltage → High voltage weighing comparison
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleDemo} disabled={disabled}
          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
          Load Sample
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground italic">Representative demonstration data — not a certified laboratory measurement.</p>

      <VoltageStagePanel label="Stage 1 — Reference Voltage (230 V / 50 Hz)"
        colorClass="border-emerald-500/30 bg-emerald-500/5"
        stage={reference} onChange={setReference} disabled={disabled} />

      <VoltageStagePanel label="Stage 2 — Low Voltage (−15%)"
        colorClass="border-blue-500/30 bg-blue-500/5"
        stage={low} onChange={setLow} disabled={disabled} />

      <VoltageStagePanel label="Stage 3 — High Voltage (+15%)"
        colorClass="border-amber-500/30 bg-amber-500/5"
        stage={high} onChange={setHigh} disabled={disabled} />
    </div>
  );
}
