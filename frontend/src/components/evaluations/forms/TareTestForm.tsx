/**
 * METRA — components/evaluations/forms/TareTestForm.tsx
 * Specialized observation form for Tare Operation Test (OIML R 76-1 §A.4.6)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TareTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export function TareTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: TareTestFormProps) {
  const [tareType, setTareType] = useState<"subtractive" | "additive">(
    observations?.tare_type || "subtractive"
  );
  const [grossLoad, setGrossLoad] = useState<number>(
    observations?.gross_load !== undefined ? Number(observations.gross_load) : 50.0
  );
  const [tareLoad, setTareLoad] = useState<number>(
    observations?.tare_load !== undefined ? Number(observations.tare_load) : 10.0
  );
  const [netIndication, setNetIndication] = useState<number>(
    observations?.net_indication !== undefined ? Number(observations.net_indication) : 40.0
  );

  const expectedNet = grossLoad - tareLoad;
  const netError = netIndication - expectedNet;

  useEffect(() => {
    onObservationsChange({
      tare_type: tareType,
      gross_load: grossLoad,
      tare_load: tareLoad,
      net_indication: netIndication,
      load_steps: [
        { L: expectedNet, I: netIndication, dL: 0 }
      ],
      readings: [
        { load: expectedNet, indication: netIndication }
      ]
    });
  }, [tareType, grossLoad, tareLoad, netIndication]);

  const handleLoadDemoData = () => {
    setTareType("subtractive");
    setGrossLoad(50.0);
    setTareLoad(10.0);
    setNetIndication(40.0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Label className="text-xs font-semibold text-foreground">Tare Device Type:</Label>
          <select
            value={tareType}
            onChange={(e) => setTareType(e.target.value as "subtractive" | "additive")}
            disabled={disabled}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="subtractive">Subtractive Tare (Max Net = Max - Tare)</option>
            <option value="additive">Additive Tare (Max Net = Max)</option>
          </select>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Applied Tare Load (T):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={tareLoad}
              onChange={(e) => setTareLoad(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Applied Gross Reference Load:</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={grossLoad}
              onChange={(e) => setGrossLoad(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Observed Net Indication (I<sub>net</sub>):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={netIndication}
              onChange={(e) => setNetIndication(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>
      </div>

      {/* Derived calculation card */}
      <div className="rounded-md border border-border bg-muted/30 p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div>
          <span className="text-muted-foreground">Expected Net Reference Load (m<sub>gross</sub> - m<sub>tare</sub>): </span>
          <span className="font-bold text-foreground">{expectedNet.toFixed(2)} kg</span>
        </div>
        <div>
          <span className="text-muted-foreground">Observed Net Indication Error (E<sub>net</sub>): </span>
          <span className={`font-bold ${netError === 0 ? "text-emerald-600" : "text-primary"}`}>
            {netError >= 0 ? `+${netError.toFixed(2)}` : netError.toFixed(2)} kg
          </span>
        </div>
      </div>
    </div>
  );
}
