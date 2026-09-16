/**
 * METRA — components/evaluations/forms/EMCElectricalTestForm.tsx
 * EMC / Electrical Influence Tests (OIML R 76-1 Annex B / Annex C)
 *
 * Captures:
 *   - Pre-disturbance reference weighing (L, I, ΔL)
 *   - During-disturbance weighing observations
 *   - Post-disturbance recovery weighing
 *   - Disturbance type and severity fields
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon, Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EMCElectricalTestFormProps {
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

interface EMCStage {
  label: string;
  readings: LoadRow[];
}

const DEMO_READINGS: LoadRow[] = [
  { L: 0, I: 0, dL: 0 },
];

function parseEMCStage(raw: any, label: string): EMCStage {
  if (raw && typeof raw === "object") {
    return {
      label: String(raw.label ?? label),
      readings: Array.isArray(raw.readings) && raw.readings.length > 0
        ? raw.readings.map((r: any) => ({ L: Number(r.L ?? 0), I: Number(r.I ?? 0), dL: Number(r.dL ?? 0) }))
        : DEMO_READINGS.map((r) => ({ ...r })),
    };
  }
  return { label, readings: DEMO_READINGS.map((r) => ({ ...r })) };
}

function EMCStagePanel({
  colorClass,
  stage,
  onChange,
  disabled,
}: {
  colorClass: string;
  stage: EMCStage;
  onChange: (s: EMCStage) => void;
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
        <p className="text-xs font-bold text-foreground">{stage.label}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRow} disabled={disabled}
          className="h-7 text-xs gap-1">
          <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
          Add Load
        </Button>
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

export function EMCElectricalTestForm({
  testName,
  observations,
  onObservationsChange,
  disabled = false,
}: EMCElectricalTestFormProps) {
  const [disturbanceType, setDisturbanceType] = useState<string>(
    String(observations?.disturbance_type ?? "")
  );
  const [disturbanceLevel, setDisturbanceLevel] = useState<string>(
    String(observations?.disturbance_level ?? "")
  );

  const [preRef, setPreRef] = useState<EMCStage>(() =>
    parseEMCStage(observations?.pre_reference, "Pre-Disturbance Reference")
  );
  const [during, setDuring] = useState<EMCStage>(() =>
    parseEMCStage(observations?.during, "During Disturbance")
  );
  const [postRef, setPostRef] = useState<EMCStage>(() =>
    parseEMCStage(observations?.post_reference, "Post-Disturbance Recovery")
  );

  useEffect(() => {
    onObservationsChange({
      disturbance_type: disturbanceType,
      disturbance_level: disturbanceLevel,
      pre_reference: preRef,
      during,
      post_reference: postRef,
    });
  }, [disturbanceType, disturbanceLevel, preRef, during, postRef]);

  const handleDemo = () => {
    setDisturbanceType("Electrostatic Discharge");
    setDisturbanceLevel("4 kV contact / 8 kV air");
    setPreRef(parseEMCStage(null, "Pre-Disturbance Reference"));
    setDuring(parseEMCStage(null, "During Disturbance"));
    setPostRef(parseEMCStage(null, "Post-Disturbance Recovery"));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">EMC / Electrical Influence — {testName}</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 Annex B/C — Pre-disturbance reference → Apply disturbance → Post-disturbance recovery
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleDemo} disabled={disabled}
          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
          Load Sample
        </Button>
      </div>

      {/* Disturbance metadata */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Disturbance Type</Label>
          <Input type="text" value={disturbanceType}
            onChange={(e) => setDisturbanceType(e.target.value)}
            disabled={disabled} className="h-8 text-xs" placeholder="e.g. ESD, Conducted RF, Burst" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Disturbance Level / Severity</Label>
          <Input type="text" value={disturbanceLevel}
            onChange={(e) => setDisturbanceLevel(e.target.value)}
            disabled={disabled} className="h-8 text-xs" placeholder="e.g. 4 kV contact, Level 3" />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground italic">Representative demonstration data — not a certified laboratory measurement.</p>

      <EMCStagePanel colorClass="border-emerald-500/30 bg-emerald-500/5"
        stage={preRef} onChange={setPreRef} disabled={disabled} />

      <EMCStagePanel colorClass="border-red-500/30 bg-red-500/5"
        stage={during} onChange={setDuring} disabled={disabled} />

      <EMCStagePanel colorClass="border-blue-500/30 bg-blue-500/5"
        stage={postRef} onChange={setPostRef} disabled={disabled} />
    </div>
  );
}
