/**
 * METRA — components/evaluations/forms/EccentricityTestForm.tsx
 * Position-based observation form for Eccentricity Loading Test (OIML R 76-1 §A.4.7)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
}

const DEFAULT_POSITIONS: PositionRow[] = [
  { position: "Center", load: 5.00, indication: 5.00 },
  { position: "Front", load: 5.00, indication: 5.00 },
  { position: "Rear", load: 5.00, indication: 5.00 },
  { position: "Left", load: 5.00, indication: 5.00 },
  { position: "Right", load: 5.00, indication: 5.00 },
];

export function EccentricityTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: EccentricityTestFormProps) {
  const initialPositions: PositionRow[] =
    observations?.positions && Array.isArray(observations.positions) && observations.positions.length > 0
      ? observations.positions.map((p: any) => ({
          position: p.position || "Unknown",
          load: p.L !== undefined ? Number(p.L) : (p.load !== undefined ? Number(p.load) : (p.applied_load !== undefined ? Number(p.applied_load) : 5.00)),
          indication: p.I !== undefined ? Number(p.I) : (p.indication !== undefined ? Number(p.indication) : (p.indicated_value !== undefined ? Number(p.indicated_value) : 5.00)),
        }))
      : DEFAULT_POSITIONS;

  const [positions, setPositions] = useState<PositionRow[]>(initialPositions);

  useEffect(() => {
    const formatted = positions.map((p) => ({
      position: p.position,
      L: Number(p.load),
      I: Number(p.indication),
      load: Number(p.load),
      indication: Number(p.indication),
      applied_load: Number(p.load),
      indicated_value: Number(p.indication),
      dL: 0,
    }));

    onObservationsChange({
      positions: formatted,
      load_steps: formatted,
    });
  }, [positions]);

  const handleChange = (idx: number, field: "load" | "indication", val: string) => {
    const num = parseFloat(val);
    const updated = [...positions];
    updated[idx] = {
      ...updated[idx],
      [field]: isNaN(num) ? 0 : num,
    };
    setPositions(updated);
  };

  const handleLoadDemoData = () => {
    setPositions(DEFAULT_POSITIONS);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">OIML Load Position Table</h4>
          <p className="text-[11px] text-muted-foreground">
            Apply ~1/3 (Max + T+) on 4 quarter segments & center position
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLoadDemoData}
          disabled={disabled}
          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
        >
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
          Load Sample Observations
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Representative demonstration data — not a certified laboratory measurement.
      </p>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="py-2.5 px-3">Position</th>
              <th className="py-2.5 px-3">Applied Load (m) [kg]</th>
              <th className="py-2.5 px-3">Indicated Value (I) [kg]</th>
              <th className="py-2.5 px-3">Error (E = I - m) [kg]</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {positions.map((p, idx) => {
              const err = p.indication - p.load;
              return (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-foreground">{p.position}</td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={p.load}
                      onChange={(e) => handleChange(idx, "load", e.target.value)}
                      disabled={disabled}
                      className="h-8 w-32 font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={p.indication}
                      onChange={(e) => handleChange(idx, "indication", e.target.value)}
                      disabled={disabled}
                      className="h-8 w-32 font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 font-mono font-semibold text-foreground">
                    {err >= 0 ? `+${err.toFixed(2)}` : err.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
