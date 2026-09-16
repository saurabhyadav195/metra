/**
 * METRA — components/evaluations/forms/EnduranceTestForm.tsx
 * Endurance / Long-term Stability Test (OIML R 76-1 §A.4.9 / Annex B)
 *
 * Captures repeated cycles of weighing over extended period:
 *   - Number of cycles performed
 *   - Initial and final reference weighing grids
 *   - Intermediate spot-check readings (optional)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EnduranceTestFormProps {
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

interface EnduranceStage {
  cycle_count: number;
  readings: LoadRow[];
}

const DEMO_READINGS: LoadRow[] = [
  { L: 0, I: 0, dL: 0 },
];

function parseStage(raw: any, defaultCycles: number): EnduranceStage {
  if (raw && typeof raw === "object") {
    return {
      cycle_count: Number(raw.cycle_count ?? defaultCycles),
      readings: Array.isArray(raw.readings) && raw.readings.length > 0
        ? raw.readings.map((r: any) => ({ L: Number(r.L ?? 0), I: Number(r.I ?? 0), dL: Number(r.dL ?? 0) }))
        : DEMO_READINGS.map((r) => ({ ...r })),
    };
  }
  return { cycle_count: defaultCycles, readings: DEMO_READINGS.map((r) => ({ ...r })) };
}

function EnduranceStagePanel({
  label,
  colorClass,
  stage,
  onChange,
  disabled,
}: {
  label: string;
  colorClass: string;
  stage: EnduranceStage;
  onChange: (s: EnduranceStage) => void;
  disabled: boolean;
}) {
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

      <div className="flex items-center gap-3">
        <Label className="text-[11px] font-medium text-muted-foreground shrink-0">Cycle Count:</Label>
        <Input type="number" step="1" min="0" value={stage.cycle_count}
          onChange={(e) => onChange({ ...stage, cycle_count: parseInt(e.target.value) || 0 })}
          disabled={disabled} className="h-7 w-24 font-mono text-xs" />
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

export function EnduranceTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: EnduranceTestFormProps) {
  const [initial, setInitial] = useState<EnduranceStage>(() =>
    parseStage(observations?.initial, 0)
  );
  const [final, setFinal] = useState<EnduranceStage>(() =>
    parseStage(observations?.final, 10000)
  );

  useEffect(() => {
    onObservationsChange({ initial, final });
  }, [initial, final]);

  const handleDemo = () => {
    setInitial({ cycle_count: 0, readings: DEMO_READINGS.map((r) => ({ ...r })) });
    setFinal({ cycle_count: 10000, readings: DEMO_READINGS.map((r) => ({ ...r, I: r.I + 0.002 })) });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Endurance Test — Initial vs Final Reference</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.4.9 — Record reference weighing before and after endurance cycling
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleDemo} disabled={disabled}
          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
          Load Sample
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground italic">Representative demonstration data — not a certified laboratory measurement.</p>

      <EnduranceStagePanel label="Initial Reference (Before Endurance Cycles)"
        colorClass="border-blue-500/30 bg-blue-500/5"
        stage={initial} onChange={setInitial} disabled={disabled} />

      <EnduranceStagePanel label="Final Reference (After Endurance Cycles)"
        colorClass="border-amber-500/30 bg-amber-500/5"
        stage={final} onChange={setFinal} disabled={disabled} />
    </div>
  );
}
