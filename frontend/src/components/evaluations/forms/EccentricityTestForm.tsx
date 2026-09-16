/**
 * METRA — components/evaluations/forms/EccentricityTestForm.tsx
 * Position-based observation form for Eccentricity Loading Test (OIML R 76-1 §A.4.7)
 *
 * Structure:
 *   - Header field: Initial Zero Error (E0) — used for Ec = E − E0
 *   - 5-position table: Center, Front, Rear, Left, Right
 *   - Columns: Position | Applied Load (L) | Indication (I) | Changeover (ΔL)
 *
 * No pre-calculated error column — backend computes E and Ec.
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EccentricityTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export interface PositionRow {
  position: string;
  load: number;
  indication: number;
  dL: number;
}

const DEFAULT_POSITIONS: PositionRow[] = [
  { position: "Center", load: 0, indication: 0, dL: 0 },
  { position: "Front",  load: 0, indication: 0, dL: 0 },
  { position: "Rear",   load: 0, indication: 0, dL: 0 },
  { position: "Left",   load: 0, indication: 0, dL: 0 },
  { position: "Right",  load: 0, indication: 0, dL: 0 },
];

export function EccentricityTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: EccentricityTestFormProps) {
  const [E0, setE0] = useState<number>(
    observations?.E0 !== undefined ? Number(observations.E0) : 0.0
  );

  const initialPositions: PositionRow[] =
    observations?.positions && Array.isArray(observations.positions) && observations.positions.length > 0
      ? observations.positions.map((p: any) => ({
          position: p.position || "Unknown",
          load: Number(p.L ?? p.load ?? p.applied_load ?? 5.0),
          indication: Number(p.I ?? p.indication ?? p.indicated_value ?? 5.0),
          dL: Number(p.dL ?? 0),
        }))
      : DEFAULT_POSITIONS;

  const [positions, setPositions] = useState<PositionRow[]>(initialPositions);

  useEffect(() => {
    const formatted = positions.map((p) => ({
      position: p.position,
      L: Number(p.load),
      I: Number(p.indication),
      dL: Number(p.dL),
    }));
    onObservationsChange({
      E0,
      positions: formatted,
      load_steps: formatted,
    });
  }, [E0, positions]);

  const handleChange = (idx: number, field: "load" | "indication" | "dL", val: string) => {
    const num = parseFloat(val);
    const updated = [...positions];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    setPositions(updated);
  };

  const handleLoadDemoData = () => {
    setE0(0.0);
    setPositions(DEFAULT_POSITIONS);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Eccentricity Test — Load Position Observations</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.4.7 — Apply ~1/3 (Max + T⁺) at center & 4 quarter segments
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleLoadDemoData} disabled={disabled}
          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
          Load Sample
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Representative demonstration data — not a certified laboratory measurement.
      </p>

      {/* E0 Header field */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1.5 max-w-xs">
        <Label className="text-xs font-semibold text-foreground">
          Initial Zero Error (E₀):
        </Label>
        <p className="text-[10px] text-muted-foreground">Used by backend: Ec = E − E₀ for each position</p>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            step="0.0001"
            value={E0}
            onChange={(e) => setE0(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 font-mono text-xs bg-background"
          />
          <span className="text-xs text-muted-foreground font-medium shrink-0">kg</span>
        </div>
      </div>

      {/* Position table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="py-2.5 px-3">Position</th>
              <th className="py-2.5 px-3">Applied Load (L) [kg]</th>
              <th className="py-2.5 px-3">Indication (I) [kg]</th>
              <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Changeover (ΔL) [kg]</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {positions.map((p, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-foreground">{p.position}</td>
                <td className="py-2 px-3">
                  <Input type="number" step="0.001" value={p.load}
                    onChange={(e) => handleChange(idx, "load", e.target.value)}
                    disabled={disabled} className="h-8 w-28 font-mono text-xs" />
                </td>
                <td className="py-2 px-3">
                  <Input type="number" step="0.001" value={p.indication}
                    onChange={(e) => handleChange(idx, "indication", e.target.value)}
                    disabled={disabled} className="h-8 w-28 font-mono text-xs" />
                </td>
                <td className="py-2 px-3">
                  <Input type="number" step="0.0001" min="0" value={p.dL}
                    onChange={(e) => handleChange(idx, "dL", e.target.value)}
                    disabled={disabled} className="h-8 w-24 font-mono text-xs border-amber-400/50" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
