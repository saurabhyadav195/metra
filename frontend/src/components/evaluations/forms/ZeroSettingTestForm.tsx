/**
 * METRA — components/evaluations/forms/ZeroSettingTestForm.tsx
 * Specialized observation form for Zero Setting & Accuracy Tests (OIML R 76-1 §A.4.2 & §A.4.11.2)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ZeroSettingTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export function ZeroSettingTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: ZeroSettingTestFormProps) {
  const [initialIndication, setInitialIndication] = useState<number>(
    observations?.initial_indication !== undefined ? Number(observations.initial_indication) : 0.0
  );
  const [positiveRange, setPositiveRange] = useState<number>(
    observations?.positive_range !== undefined ? Number(observations.positive_range) : 4.0
  );
  const [negativeRange, setNegativeRange] = useState<number>(
    observations?.negative_range !== undefined ? Number(observations.negative_range) : 1.0
  );
  const [dLChangeover, setDLChangeover] = useState<number>(
    observations?.dL !== undefined ? Number(observations.dL) : 0.02
  );
  const [finalIndication, setFinalIndication] = useState<number>(
    observations?.final_indication !== undefined ? Number(observations.final_indication) : 0.0
  );

  useEffect(() => {
    onObservationsChange({
      initial_indication: initialIndication,
      positive_range: positiveRange,
      negative_range: negativeRange,
      dL: dLChangeover,
      final_indication: finalIndication,
      total_range_percent: positiveRange + negativeRange,
    });
  }, [initialIndication, positiveRange, negativeRange, dLChangeover, finalIndication]);

  const handleLoadDemoData = () => {
    setInitialIndication(0.0);
    setPositiveRange(4.0);
    setNegativeRange(1.0);
    setDLChangeover(0.02);
    setFinalIndication(0.0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Zero-Setting & Accuracy Parameters</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.4.2.1 (Range ≤ 4% Max or 20% initial) & §A.4.2.3 (Accuracy ±0.25 e)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Initial No-Load Indication:</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.001"
              value={initialIndication}
              onChange={(e) => setInitialIndication(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Positive Zero-Setting Limit (+% Max):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.1"
              value={positiveRange}
              onChange={(e) => setPositiveRange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">%</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Negative Zero-Setting Limit (-% Max):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.1"
              value={negativeRange}
              onChange={(e) => setNegativeRange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">%</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Additional Weight to Changeover (ΔL):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.001"
              value={dLChangeover}
              onChange={(e) => setDLChangeover(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Final Zero Indication After Return:</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.001"
              value={finalIndication}
              onChange={(e) => setFinalIndication(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>
      </div>
    </div>
  );
}
