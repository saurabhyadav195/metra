/**
 * METRA — components/evaluations/forms/RangeOfZeroSettingTestForm.tsx
 * Range of Zero-Setting Test (OIML R 76-1 §A.4.2.1 & §4.5.1)
 *
 * Captures:
 *   - Zero-setting method (initial, non_automatic, semi_automatic, automatic)
 *   - Negative portion applicability (boolean toggle based on whether load receptor can be removed)
 *   - Positive zero-setting range observation [kg]
 *   - Negative zero-setting range observation [kg]
 *
 * No fabricated defaults. No generic changeover steps table.
 */

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface RangeOfZeroSettingTestFormProps {
  testId: string;
  testName: string;
  observations: Record<string, any>;
  onObservationsChange: (obs: Record<string, any>) => void;
  disabled?: boolean;
}

export function RangeOfZeroSettingTestForm({
  observations,
  onObservationsChange,
  disabled = false,
}: RangeOfZeroSettingTestFormProps) {
  const [zeroType, setZeroType] = useState<string>(() => {
    return String(
      observations?.zero_setting_type ??
      observations?.zero_type ??
      observations?.zero_setting_method ??
      "initial"
    );
  });

  const [negativeApplicable, setNegativeApplicable] = useState<boolean>(() => {
    if (observations?.negative_applicable !== undefined) return Boolean(observations.negative_applicable);
    if (observations?.negative_portion_applicable !== undefined) return Boolean(observations.negative_portion_applicable);
    return true;
  });

  const [positiveRange, setPositiveRange] = useState<string>(() => {
    const raw = observations?.positive_range_kg ?? observations?.positive_range;
    return raw !== undefined && raw !== null ? String(raw) : "";
  });

  const [negativeRange, setNegativeRange] = useState<string>(() => {
    const raw = observations?.negative_range_kg ?? observations?.negative_range;
    return raw !== undefined && raw !== null ? String(raw) : "";
  });

  useEffect(() => {
    const posNum = positiveRange !== "" && !isNaN(Number(positiveRange)) ? Number(positiveRange) : null;
    const negNum = negativeApplicable && negativeRange !== "" && !isNaN(Number(negativeRange)) ? Number(negativeRange) : null;

    onObservationsChange({
      zero_setting_type: zeroType,
      zero_setting_method: zeroType,
      negative_applicable: negativeApplicable,
      positive_range_kg: posNum,
      negative_range_kg: negNum,
      // Compatibility aliases
      positive_range: posNum,
      negative_range: negNum,
    });
  }, [zeroType, negativeApplicable, positiveRange, negativeRange]);

  const posVal = positiveRange !== "" && !isNaN(Number(positiveRange)) ? Number(positiveRange) : null;
  const negVal = negativeApplicable && negativeRange !== "" && !isNaN(Number(negativeRange)) ? Number(negativeRange) : 0;
  const totalVal = posVal !== null ? posVal + negVal : null;

  return (
    <div className="space-y-5">
      <div className="border-b border-border pb-3">
        <h4 className="text-xs font-semibold text-foreground font-mono">
          OIML R 76-1 §A.4.2.1 — Range of Zero-Setting Observations
        </h4>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Record positive and negative zero-setting ranges measured for the selected zero-setting method.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Zero-setting method */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Zero-setting method</Label>
          <select
            value={zeroType}
            onChange={(e) => setZeroType(e.target.value)}
            disabled={disabled}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="initial">Initial</option>
            <option value="non_automatic">Non-automatic</option>
            <option value="semi_automatic">Semi-automatic</option>
            <option value="automatic">Automatic</option>
          </select>
        </div>

        {/* Negative portion applicability */}
        <div className="space-y-1.5 flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground h-9 px-3 rounded-md border border-input bg-muted/20">
            <input
              type="checkbox"
              checked={negativeApplicable}
              onChange={(e) => {
                setNegativeApplicable(e.target.checked);
                if (!e.target.checked) {
                  setNegativeRange("");
                }
              }}
              disabled={disabled}
              className="size-4 rounded border-input text-primary focus:ring-primary"
            />
            <span>Negative portion applicable (load receptor removable)</span>
          </label>
        </div>

        {/* Positive Range Input */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            Positive zero-setting range [kg]
          </Label>
          <Input
            type="number"
            step="any"
            placeholder="Enter measured positive range..."
            value={positiveRange}
            onChange={(e) => setPositiveRange(e.target.value)}
            disabled={disabled}
            className="h-9 font-mono text-xs"
          />
        </div>

        {/* Negative Range Input */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            Negative zero-setting range [kg]
          </Label>
          <Input
            type="number"
            step="any"
            placeholder={negativeApplicable ? "Enter measured negative range..." : "N/A — load receptor non-removable"}
            value={negativeRange}
            onChange={(e) => setNegativeRange(e.target.value)}
            disabled={disabled || !negativeApplicable}
            className="h-9 font-mono text-xs"
          />
        </div>
      </div>

      {/* Live Total Range Preview */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between text-xs">
        <div>
          <span className="font-semibold text-foreground">Total Zero-Setting Range Preview: </span>
          <span className="font-mono font-bold text-primary">
            {totalVal !== null ? `${totalVal.toFixed(4)} kg` : "— (Pending inputs)"}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {zeroType === "initial" ? "Limit: ≤ 20% Max" : "Limit: ≤ 4% Max"}
        </span>
      </div>
    </div>
  );
}
