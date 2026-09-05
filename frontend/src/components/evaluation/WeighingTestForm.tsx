/**
 * METRA — components/evaluation/WeighingTestForm.tsx
 * Observation entry form for the Weighing Test (TEST-A.4.4.1 — OIML R 76-1 §A.4.4).
 * Supports multiple load steps with L (test load), I (indication), dL (additional weights).
 */

import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WeighingObservations } from "@/types/evaluation";

interface Props {
  defaultValues?: Partial<WeighingObservations>;
  instrumentUnit?: string;
  onSubmit: (data: WeighingObservations) => void;
  isLoading?: boolean;
}

export function WeighingTestForm({
  defaultValues,
  instrumentUnit = "kg",
  onSubmit,
  isLoading,
}: Props) {
  const { register, control, handleSubmit, setValue, watch } =
    useForm<WeighingObservations>({
      defaultValues: {
        verification_type: defaultValues?.verification_type ?? "initial",
        load_steps: defaultValues?.load_steps?.length
          ? defaultValues.load_steps
          : [{ L: 0, I: 0, dL: 0 }],
      },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "load_steps",
  });

  const verificationType = watch("verification_type");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Verification type */}
      <div className="flex items-center gap-4">
        <div>
          <Label className="text-xs mb-1 block text-muted-foreground">
            Verification Type
          </Label>
          <Select
            value={verificationType}
            onValueChange={(v) =>
              setValue("verification_type", v as "initial" | "service")
            }
          >
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="initial">Initial Verification</SelectItem>
              <SelectItem value="service">Service (In-use)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-[11px] text-muted-foreground mt-4 max-w-sm">
          <span className="font-medium">Changeover point method</span> (§A.4.4.3):{" "}
          P = I + 0.5e − dL · E = P − L · Ec = E − E₀
        </div>
      </div>

      {/* Load steps table */}
      <div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left py-1.5 px-2 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">
                  Load L ({instrumentUnit})
                </th>
                <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">
                  Indication I ({instrumentUnit})
                </th>
                <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">
                  dL ({instrumentUnit})
                </th>
                <th className="py-1.5 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => (
                <tr key={field.id} className="border-b border-border/40">
                  <td className="py-1.5 px-2 text-muted-foreground">{idx + 1}</td>
                  <td className="py-1.5 px-2">
                    <Input
                      {...register(`load_steps.${idx}.L`, { valueAsNumber: true })}
                      type="number"
                      step="any"
                      className="h-7 text-xs font-mono w-28"
                      placeholder="0.000"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <Input
                      {...register(`load_steps.${idx}.I`, { valueAsNumber: true })}
                      type="number"
                      step="any"
                      className="h-7 text-xs font-mono w-28"
                      placeholder="0.000"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <Input
                      {...register(`load_steps.${idx}.dL`, { valueAsNumber: true })}
                      type="number"
                      step="any"
                      className="h-7 text-xs font-mono w-28"
                      placeholder="0.0000"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="text-muted-foreground hover:text-destructive text-[11px]"
                        aria-label="Remove row"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 text-xs h-7"
          onClick={() => append({ L: 0, I: 0, dL: 0 })}
        >
          + Add Row
        </Button>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? "Saving…" : "Save Observations"}
        </Button>
      </div>
    </form>
  );
}
