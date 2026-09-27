/**
 * METRA — components/evaluations/forms/ZeroReturnTestForm.tsx
 * Zero Return Test (OIML R 76-1 §A.4.11.2)
 *
 * Captures observations for zero return deviation:
 *   - Applied load L (close to Max)
 *   - Initial zero indication before loading (P_start)
 *   - Indication after 30 minutes under load
 *   - Zero indication as soon as stabilized after load removal (P_end)
 *   - Changeover dL observations
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ZeroReturnTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface ZeroReturnStep {
  step_index: number;
  L: number;
  I: number;
  dL: number;
  note: string;
}

const DEFAULT_STEPS: ZeroReturnStep[] = [
  { step_index: 1, L: 0, I: 0, dL: 0, note: "Initial zero before loading" },
  { step_index: 2, L: 100, I: 100, dL: 0, note: "Loaded at ~Max (30 min)" },
  { step_index: 3, L: 0, I: 0, dL: 0, note: "Zero return after unloading" },
];

export function ZeroReturnTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: ZeroReturnTestFormProps) {
  const parseSteps = (): ZeroReturnStep[] => {
    if (observations?.steps && Array.isArray(observations.steps) && observations.steps.length > 0) {
      return observations.steps.map((r: any, i: number) => ({
        step_index: i + 1,
        L: Number(r.L ?? r.load ?? 0),
        I: Number(r.I ?? r.indication ?? 0),
        dL: Number(r.dL ?? 0),
        note: String(r.note ?? ""),
      }));
    }
    return DEFAULT_STEPS;
  };

  const [steps, setSteps] = useState<ZeroReturnStep[]>(parseSteps);

  useEffect(() => {
    onObservationsChange({
      steps: steps.map((s) => ({
        step_index: s.step_index,
        L: s.L,
        I: s.I,
        dL: s.dL,
        note: s.note,
      })),
    });
  }, [steps]);

  const handleChange = (idx: number, field: keyof ZeroReturnStep, val: string) => {
    const updated = [...steps];
    if (field === "note") {
      updated[idx] = { ...updated[idx], note: val };
    } else {
      const num = parseFloat(val);
      updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    }
    setSteps(updated);
  };

  const handleAddStep = () => {
    setSteps([
      ...steps,
      { step_index: steps.length + 1, L: 0, I: 0, dL: 0, note: "Observation step" },
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 1) return;
    setSteps(
      steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_index: i + 1 }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground font-mono">
            OIML R 76-1 §A.4.11.2 — Zero Return Test Observations
          </h4>
          <p className="text-[11px] text-muted-foreground">
            After removing a load close to Max that remained on the instrument for 30 minutes, observe zero indication as soon as stabilized.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Step
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="py-2.5 px-3">Step</th>
              <th className="py-2.5 px-3">Stage / Note</th>
              <th className="py-2.5 px-3">Applied Load (L) [kg]</th>
              <th className="py-2.5 px-3">Indication (I) [kg]</th>
              <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
              <th className="py-2.5 px-3 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {steps.map((s, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-3 font-medium text-foreground">{s.step_index}</td>
                <td className="py-1.5 px-3">
                  <Input
                    type="text"
                    value={s.note}
                    onChange={(e) => handleChange(idx, "note", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-36 text-xs"
                    placeholder="Stage description"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <Input
                    type="number"
                    step="0.001"
                    value={s.L}
                    onChange={(e) => handleChange(idx, "L", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-24 font-mono text-xs"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <Input
                    type="number"
                    step="0.001"
                    value={s.I}
                    onChange={(e) => handleChange(idx, "I", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-24 font-mono text-xs"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={s.dL}
                    onChange={(e) => handleChange(idx, "dL", e.target.value)}
                    disabled={disabled}
                    className="h-7 w-20 font-mono text-xs border-amber-400/50"
                  />
                </td>
                <td className="py-1.5 px-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStep(idx)}
                    disabled={disabled || steps.length <= 1}
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
