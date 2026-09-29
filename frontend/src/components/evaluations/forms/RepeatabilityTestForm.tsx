/**
 * METRA — components/evaluations/forms/RepeatabilityTestForm.tsx
 * Repeatability Test (OIML R 76-1 §A.4.10)
 *
 * Structure:
 *   - Two separate grids: Set 1 (~50% Max load) and Set 2 (~Max load)
 *   - Each grid: header load field + dynamic trial rows
 *   - Per trial: Indication (I) + Changeover Weight (ΔL)
 *   - Default 10 trials per set; dynamic add/remove rows
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RepeatabilityTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

interface TrialRow {
  indication: number;
  dL: number;
}

interface RepeatabilitySet {
  load: number;
  trials: TrialRow[];
}

const DEFAULT_TRIAL = (): TrialRow => ({ indication: 0, dL: 0 });

function buildDefaultSet(load: number, count = 10): RepeatabilitySet {
  return { load, trials: Array.from({ length: count }, DEFAULT_TRIAL) };
}

function parseSet(raw: any, defaultLoad: number): RepeatabilitySet {
  if (raw && typeof raw === "object" && Array.isArray(raw.trials)) {
    return {
      load: Number(raw.load ?? defaultLoad),
      trials: raw.trials.map((t: any) => ({
        indication: Number(t.I ?? t.indication ?? 0),
        dL: Number(t.dL ?? 0),
      })),
    };
  }
  return buildDefaultSet(defaultLoad);
}

// ── Single repeatable-set component ──────────────────────────────────────────
function RepeatabilitySetGrid({
  label,
  description,
  set,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  set: RepeatabilitySet;
  onChange: (s: RepeatabilitySet) => void;
  disabled: boolean;
}) {
  const handleLoadChange = (val: string) => {
    onChange({ ...set, load: parseFloat(val) || 0 });
  };

  const handleTrialChange = (idx: number, field: keyof TrialRow, val: string) => {
    const num = parseFloat(val);
    const trials = [...set.trials];
    trials[idx] = { ...trials[idx], [field]: isNaN(num) ? 0 : num };
    onChange({ ...set, trials });
  };

  const handleAddRow = () => {
    onChange({ ...set, trials: [...set.trials, DEFAULT_TRIAL()] });
  };

  const handleRemoveRow = (idx: number) => {
    if (set.trials.length <= 1) return;
    onChange({ ...set, trials: set.trials.filter((_, i) => i !== idx) });
  };

  const validReadings = set.trials.map((t) => t.indication).filter((v) => !isNaN(v) && v !== 0);
  const minVal = validReadings.length > 0 ? Math.min(...validReadings) : 0;
  const maxVal = validReadings.length > 0 ? Math.max(...validReadings) : 0;
  const rangeVal = maxVal - minVal;

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRow} disabled={disabled}
          className="h-7 text-xs gap-1">
          <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
          Add Trial
        </Button>
      </div>

      {/* Test Load header */}
      <div className="flex items-center gap-3">
        <Label className="text-xs font-semibold text-foreground shrink-0">Test Load (kg):</Label>
        <div className="flex items-center gap-1.5">
          <Input type="number" step="0.1" value={set.load}
            onChange={(e) => handleLoadChange(e.target.value)}
            disabled={disabled}
            className="h-8 w-28 font-mono text-xs" />
          <span className="text-xs text-muted-foreground font-medium">kg</span>
        </div>
      </div>

      {/* Trial table */}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="py-2 px-3">Trial #</th>
              <th className="py-2 px-3">Indication (I) [kg]</th>
              <th className="py-2 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
              <th className="py-2 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {set.trials.map((t, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-3 font-medium text-foreground">{idx + 1}</td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.001" value={t.indication}
                    onChange={(e) => handleTrialChange(idx, "indication", e.target.value)}
                    disabled={disabled} className="h-7 w-28 font-mono text-xs" />
                </td>
                <td className="py-1.5 px-3">
                  <Input type="number" step="0.0001" min="0" value={t.dL}
                    onChange={(e) => handleTrialChange(idx, "dL", e.target.value)}
                    disabled={disabled} className="h-7 w-24 font-mono text-xs border-amber-400/50" />
                </td>
                <td className="py-1.5 px-3 text-right">
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={disabled || set.trials.length <= 1}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Range preview */}
      <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 flex flex-wrap items-center gap-4 text-[11px] font-mono">
        <span className="text-muted-foreground">Min I: <span className="font-bold text-foreground">{minVal.toFixed(3)} kg</span></span>
        <span className="text-muted-foreground">Max I: <span className="font-bold text-foreground">{maxVal.toFixed(3)} kg</span></span>
        <span className="text-muted-foreground">Range (I<sub>max</sub> − I<sub>min</sub>): <span className="font-bold text-primary">{rangeVal.toFixed(3)} kg</span></span>
        <span className="text-muted-foreground text-[10px] italic">Backend computes pass/fail vs MPE</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RepeatabilityTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: RepeatabilityTestFormProps) {
  const [set1, setSet1] = useState<RepeatabilitySet>(() =>
    parseSet(observations?.set1, 7.5)
  );
  const [set2, setSet2] = useState<RepeatabilitySet>(() =>
    parseSet(observations?.set2, 15.0)
  );
  const [zeroTracking, setZeroTracking] = useState<string>(
    observations?.zero_tracking || "in_operation"
  );

  useEffect(() => {
    onObservationsChange({
      zero_tracking: zeroTracking,
      set1: {
        load: set1.load,
        trials: set1.trials.map((t) => ({ I: t.indication, dL: t.dL })),
      },
      set2: {
        load: set2.load,
        trials: set2.trials.map((t) => ({ I: t.indication, dL: t.dL })),
      },
      // Backward-compat key for legacy backends that look for `readings`
      readings: [
        ...set1.trials.map((t) => ({ load: set1.load, I: t.indication, dL: t.dL })),
        ...set2.trials.map((t) => ({ load: set2.load, I: t.indication, dL: t.dL })),
      ],
    });
  }, [set1, set2, zeroTracking]);

  const loadNmiWorkedExample = () => {
    setSet1({
      load: 7.5,
      trials: [
        { indication: 7.500, dL: 0.0025 },
        { indication: 7.500, dL: 0.0025 },
        { indication: 7.500, dL: 0.0025 },
        { indication: 7.500, dL: 0.0030 },
        { indication: 7.500, dL: 0.0025 },
        { indication: 7.500, dL: 0.0025 },
        { indication: 7.500, dL: 0.0025 },
        { indication: 7.500, dL: 0.0030 },
        { indication: 7.500, dL: 0.0025 },
        { indication: 7.500, dL: 0.0025 },
      ],
    });
    setSet2({
      load: 15.0,
      trials: [
        { indication: 15.000, dL: 0.0030 },
        { indication: 15.000, dL: 0.0030 },
        { indication: 15.000, dL: 0.0030 },
        { indication: 15.000, dL: 0.0030 },
        { indication: 15.000, dL: 0.0030 },
        { indication: 15.000, dL: 0.0035 },
        { indication: 15.000, dL: 0.0030 },
        { indication: 15.000, dL: 0.0030 },
        { indication: 15.000, dL: 0.0035 },
        { indication: 15.000, dL: 0.0030 },
      ],
    });
    setZeroTracking("in_operation");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground font-mono">OIML R 76-1 §A.4.10 — Repeatability Test Observations</h4>
          <p className="text-[11px] text-muted-foreground">
            Min 10 repeated weighings at ~50% Max and ~Max load
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadNmiWorkedExample}
          disabled={disabled}
          className="h-7 text-xs gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
        >
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
          Fill NMI P108 RP-15Y Example Data
        </Button>
      </div>

      {/* Operational parameters */}
      <div className="rounded-md border border-border bg-muted/20 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Label className="font-semibold text-foreground shrink-0">Zero Tracking Device Status:</Label>
          <select
            value={zeroTracking}
            onChange={(e) => setZeroTracking(e.target.value)}
            disabled={disabled}
            className="h-8 rounded border border-border bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="in_operation">In Operation (Standard)</option>
            <option value="disabled">Disabled / Out of Operation</option>
          </select>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Requirement: Range (P<sub>max</sub> − P<sub>min</sub>) ≤ |MPE(L)| (§3.6.1)
        </div>
      </div>

      <RepeatabilitySetGrid
        label="Set 1 — Approximately 50% of Max Load"
        description="Minimum 10 repeated weighings; place and remove load between each trial"
        set={set1}
        onChange={setSet1}
        disabled={disabled}
      />

      <RepeatabilitySetGrid
        label="Set 2 — Approximately Max Load"
        description="Minimum 10 repeated weighings; place and remove load between each trial"
        set={set2}
        onChange={setSet2}
        disabled={disabled}
      />
    </div>
  );
}
