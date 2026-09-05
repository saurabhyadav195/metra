/**
 * METRA — components/evaluations/forms/VoltageVariationTestForm.tsx
 * Specialized observation form for Voltage Variations (OIML R 76-1 §A.5.4) & Warm-up (OIML R 76-1 §A.5.2)
 */

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface VoltageVariationTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export function VoltageVariationTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: VoltageVariationTestFormProps) {
  const [powerSource, setPowerSource] = useState<string>(
    observations?.power_source || "ac_mains"
  );
  const [nominalVoltage, setNominalVoltage] = useState<number>(
    observations?.nominal_voltage !== undefined ? Number(observations.nominal_voltage) : 230.0
  );
  const [upperLimitVoltage, setUpperLimitVoltage] = useState<number>(
    observations?.upper_limit_voltage !== undefined ? Number(observations.upper_limit_voltage) : 253.0
  );
  const [lowerLimitVoltage, setLowerLimitVoltage] = useState<number>(
    observations?.lower_limit_voltage !== undefined ? Number(observations.lower_limit_voltage) : 195.5
  );
  const [testLoad, setTestLoad] = useState<number>(
    observations?.test_load !== undefined ? Number(observations.test_load) : 100.0
  );
  const [indicationAtUpper, setIndicationAtUpper] = useState<number>(
    observations?.indication_upper !== undefined ? Number(observations.indication_upper) : 100.0
  );
  const [indicationAtLower, setIndicationAtLower] = useState<number>(
    observations?.indication_lower !== undefined ? Number(observations.indication_lower) : 100.0
  );

  useEffect(() => {
    onObservationsChange({
      power_source: powerSource,
      nominal_voltage: nominalVoltage,
      upper_limit_voltage: upperLimitVoltage,
      lower_limit_voltage: lowerLimitVoltage,
      test_load: testLoad,
      indication_upper: indicationAtUpper,
      indication_lower: indicationAtLower,
      load_steps: [
        { L: testLoad, I: indicationAtUpper, dL: 0, label: "Upper Limit" },
        { L: testLoad, I: indicationAtLower, dL: 0, label: "Lower Limit" },
      ],
    });
  }, [powerSource, nominalVoltage, upperLimitVoltage, lowerLimitVoltage, testLoad, indicationAtUpper, indicationAtLower]);

  const handleLoadDemoData = () => {
    setPowerSource("ac_mains");
    setNominalVoltage(230.0);
    setUpperLimitVoltage(253.0);
    setLowerLimitVoltage(195.5);
    setTestLoad(100.0);
    setIndicationAtUpper(100.0);
    setIndicationAtLower(100.0);
  };

  const errUpper = indicationAtUpper - testLoad;
  const errLower = indicationAtLower - testLoad;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Power Supply & Voltage Limits Setup</h4>
          <p className="text-[11px] text-muted-foreground">
            OIML R 76-1 §A.5.4 (AC Mains: U<sub>nom</sub> -15% to +10%; DC Battery: Minimum Operating Voltage)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Power Source Type:</Label>
          <select
            value={powerSource}
            onChange={(e) => setPowerSource(e.target.value)}
            disabled={disabled}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ac_mains">AC Mains Supply</option>
            <option value="external_dc">External DC Power Supply</option>
            <option value="battery">Non-Rechargeable Battery</option>
            <option value="vehicle_battery">Vehicle Power Supply</option>
          </select>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Nominal Voltage (U<sub>nom</sub>):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="1"
              value={nominalVoltage}
              onChange={(e) => setNominalVoltage(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">V</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Upper Limit (U<sub>max</sub> = +10%):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.5"
              value={upperLimitVoltage}
              onChange={(e) => setUpperLimitVoltage(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">V</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Lower Limit (U<sub>min</sub> = -15%):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.5"
              value={lowerLimitVoltage}
              onChange={(e) => setLowerLimitVoltage(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">V</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Test Load Applied (m):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={testLoad}
              onChange={(e) => setTestLoad(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Indication at U<sub>max</sub> ({upperLimitVoltage} V):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={indicationAtUpper}
              onChange={(e) => setIndicationAtUpper(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Indication at U<sub>min</sub> ({lowerLimitVoltage} V):</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              value={indicationAtLower}
              onChange={(e) => setIndicationAtLower(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 font-mono text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground font-medium">kg</span>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div>
          <span className="text-muted-foreground">Error at U<sub>max</sub>: </span>
          <span className="font-bold text-foreground">{errUpper >= 0 ? `+${errUpper.toFixed(2)}` : errUpper.toFixed(2)} kg</span>
        </div>
        <div>
          <span className="text-muted-foreground">Error at U<sub>min</sub>: </span>
          <span className="font-bold text-foreground">{errLower >= 0 ? `+${errLower.toFixed(2)}` : errLower.toFixed(2)} kg</span>
        </div>
      </div>
    </div>
  );
}
