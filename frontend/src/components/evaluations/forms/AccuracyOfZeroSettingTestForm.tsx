/**
 * METRA — components/evaluations/forms/AccuracyOfZeroSettingTestForm.tsx
 * Accuracy of Zero-Setting Test (OIML R 76-1 §A.4.2.3)
 *
 * Captures observations for zero-setting accuracy:
 *   - Applied load L (typically 0)
 *   - Initial indication at zero (I)
 *   - Changeover weight (ΔL) added to shift indication from 0 to 1e
 */

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AccuracyOfZeroSettingTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export function AccuracyOfZeroSettingTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: AccuracyOfZeroSettingTestFormProps) {
  const [L, setL] = useState<number>(
    observations?.L !== undefined ? Number(observations.L) : 0
  );
  const [I, setI] = useState<number>(
    observations?.I !== undefined ? Number(observations.I) : 0
  );
  const [dL, setDL] = useState<number>(
    observations?.dL !== undefined
      ? Number(observations.dL)
      : Number(observations?.additional_weight ?? 0.005)
  );

  useEffect(() => {
    onObservationsChange({
      L,
      I,
      dL,
      steps: [{ L, I, dL }],
    });
  }, [L, I, dL]);

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h4 className="text-xs font-semibold text-foreground font-mono">
          OIML R 76-1 §A.4.2.3 — Accuracy of Zero-Setting Observations
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Set instrument to zero, then add small weights (e.g. 0.1 e increments) until indication changes to 1 scale interval above zero.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Applied Reference Load (L) [kg]:</Label>
          <p className="text-[10px] text-muted-foreground">Typically zero load (0 kg)</p>
          <Input
            type="number"
            step="0.001"
            value={L}
            onChange={(e) => setL(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>

        <div className="rounded-md border border-border p-3 space-y-1 bg-muted/20">
          <Label className="text-xs font-semibold text-foreground">Indicated Value at Zero (I) [kg]:</Label>
          <p className="text-[10px] text-muted-foreground">Reading after zero-setting action</p>
          <Input
            type="number"
            step="0.001"
            value={I}
            onChange={(e) => setI(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
        </div>

        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
          <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Changeover Weight (ΔL) [kg]:
          </Label>
          <p className="text-[10px] text-muted-foreground">Additional load causing 0 → 1e change</p>
          <Input
            type="number"
            step="0.0001"
            min="0"
            value={dL}
            onChange={(e) => setDL(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background border-amber-400/50"
          />
        </div>
      </div>
    </div>
  );
}
