/**
 * METRA — components/evaluations/forms/StaticTemperatureTestForm.tsx
 * Static Temperature Test (OIML R 76-1 §A.5.3.1)
 *
 * Evaluates weighing performance under prescribed static temperature limits:
 *   - Reference (20 °C)
 *   - High temperature (T_max e.g. 40 °C)
 *   - Low temperature (T_min e.g. -10 °C or 5 °C)
 *   - 5 °C condition when T_min ≤ 0 °C
 *   - Reference (20 °C) recovery
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface StaticTemperatureTestFormProps {
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

interface TempStage {
  temperature: number;
  time: string;
  readings: LoadRow[];
}

const DEFAULT_READINGS: LoadRow[] = [{ L: 0, I: 0, dL: 0 }];

function parseStage(raw: any, defaultTemp: number): TempStage {
  if (raw && typeof raw === "object") {
    return {
      temperature: Number(raw.temperature ?? defaultTemp),
      time: String(raw.time ?? ""),
      readings:
        Array.isArray(raw.readings) && raw.readings.length > 0
          ? raw.readings.map((r: any) => ({
              L: Number(r.L ?? 0),
              I: Number(r.I ?? 0),
              dL: Number(r.dL ?? 0),
            }))
          : DEFAULT_READINGS.map((r) => ({ ...r })),
    };
  }
  return {
    temperature: defaultTemp,
    time: "",
    readings: DEFAULT_READINGS.map((r) => ({ ...r })),
  };
}

function TempStagePanel({
  label,
  colorClass,
  stage,
  onChange,
  disabled,
}: {
  label: string;
  colorClass: string;
  stage: TempStage;
  onChange: (s: TempStage) => void;
  disabled: boolean;
}) {
  const handleFieldChange = (field: "temperature" | "time", val: string) => {
    if (field === "time") {
      onChange({ ...stage, time: val });
    } else {
      const num = parseFloat(val);
      onChange({ ...stage, temperature: isNaN(num) ? 0 : num });
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
    onChange({
      ...stage,
      readings: [
        ...stage.readings,
        { L: (last?.L ?? 0) + 5, I: (last?.L ?? 0) + 5, dL: 0 },
      ],
    });
  };

  const handleRemoveRow = (idx: number) => {
    if (stage.readings.length <= 1) return;
    onChange({ ...stage, readings: stage.readings.filter((_, i) => i !== idx) });
  };

  return (
    <div className={`rounded-md border p-4 space-y-3 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">{label}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          disabled={disabled}
          className="h-7 text-xs gap-1"
        >
          <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
          Add Load
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Temperature (°C)
          </Label>
          <Input
            type="number"
            step="0.1"
            value={stage.temperature}
            onChange={(e) => handleFieldChange("temperature", e.target.value)}
            disabled={disabled}
            className="h-7 font-mono text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Time (HH:MM)
          </Label>
          <Input
            type="text"
            value={stage.time}
            onChange={(e) => handleFieldChange("time", e.target.value)}
            disabled={disabled}
            className="h-7 text-xs"
            placeholder="HH:MM"
          />
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
                  <Input
                    type="number"
                    step="0.001"
                    value={r.L}
                    onChange={(e) => handleRowChange(idx, "L", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-20 font-mono text-xs"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <Input
                    type="number"
                    step="0.001"
                    value={r.I}
                    onChange={(e) => handleRowChange(idx, "I", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-20 font-mono text-xs"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={r.dL}
                    onChange={(e) => handleRowChange(idx, "dL", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-16 font-mono text-xs border-amber-400/50"
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={disabled || stage.readings.length <= 1}
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
  );
}

export function StaticTemperatureTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: StaticTemperatureTestFormProps) {
  const [reference, setReference] = useState<TempStage>(() =>
    parseStage(observations?.reference, 20)
  );
  const [high, setHigh] = useState<TempStage>(() => parseStage(observations?.high, 40));
  const [low, setLow] = useState<TempStage>(() => parseStage(observations?.low, -10));

  useEffect(() => {
    onObservationsChange({ reference, high, low });
  }, [reference, high, low]);

  return (
    <div className="space-y-5">
      <div className="border-b border-border pb-3">
        <h4 className="text-xs font-semibold text-foreground font-mono">
          OIML R 76-1 §A.5.3.1 — Static Temperature Performance Test
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Perform weighing tests at reference (20 °C), specified high, and specified low temperatures after temperature stabilization.
        </p>
      </div>

      <TempStagePanel
        label="Stage 1 — Reference Temperature (20 °C)"
        colorClass="border-emerald-500/30 bg-emerald-500/5"
        stage={reference}
        onChange={setReference}
        disabled={disabled}
      />

      <TempStagePanel
        label="Stage 2 — High Temperature (T_high)"
        colorClass="border-red-500/30 bg-red-500/5"
        stage={high}
        onChange={setHigh}
        disabled={disabled}
      />

      <TempStagePanel
        label="Stage 3 — Low Temperature (T_low)"
        colorClass="border-blue-500/30 bg-blue-500/5"
        stage={low}
        onChange={setLow}
        disabled={disabled}
      />
    </div>
  );
}
