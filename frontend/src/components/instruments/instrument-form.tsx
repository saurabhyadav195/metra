/**
 * METRA — components/instruments/instrument-form.tsx
 *
 * Shared form for instrument creation and editing.
 * Used by new-instrument-page and edit-instrument-page.
 */

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CreateInstrumentInput, InstrumentType } from "@/types/instrument";
import { INSTRUMENT_TYPES, INSTRUMENT_TYPE_LABELS } from "@/types/instrument";

/* ── Schema ──────────────────────────────────────────────────────────────── */

const instrumentSchema = z
  .object({
    manufacturer: z.string().min(1, "Manufacturer is required."),
    manufacturer_address: z.string().optional(),
    model_designation: z.string().min(1, "Model designation is required."),
    serial_number: z.string().min(1, "Serial number is required."),
    instrument_type: z.enum(
      ["platform_scale", "bench_scale", "weighbridge", "counter_scale", "floor_scale", "hopper_scale", "other"],
      { message: "Select an instrument type." }
    ),
    accuracy_class: z.string().optional(),

    max_capacity: z
      .string()
      .min(1, "Maximum capacity is required.")
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
        message: "Maximum capacity must be a number greater than 0.",
      }),
    min_capacity: z
      .string()
      .optional()
      .refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0), {
        message: "Minimum capacity must be a number ≥ 0.",
      }),
    verification_scale_interval: z
      .string()
      .min(1, "Verification scale interval (e) is required.")
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
        message: "Verification scale interval must be a number greater than 0.",
      }),
    actual_scale_interval: z
      .string()
      .optional()
      .refine((v) => !v || (!isNaN(Number(v)) && Number(v) > 0), {
        message: "Actual scale interval must be a number greater than 0.",
      }),
    verification_intervals: z
      .string()
      .optional()
      .refine((v) => !v || (!isNaN(Number(v)) && Number(parseInt(v)) > 0), {
        message: "Number of verification intervals must be a positive integer.",
      }),

    load_receptor_type: z.string().optional(),
    indicating_device_type: z.string().optional(),
    software_version: z.string().optional(),
    intended_use: z.string().optional(),

    submission_date: z.string().optional(),
    remarks: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.min_capacity || !data.max_capacity) return true;
      return Number(data.min_capacity) <= Number(data.max_capacity);
    },
    {
      message: "Minimum capacity must be ≤ Maximum capacity.",
      path: ["min_capacity"],
    }
  );

export type InstrumentFormValues = z.infer<typeof instrumentSchema>;

/* ── Props ───────────────────────────────────────────────────────────────── */

export interface InstrumentFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<InstrumentFormValues>;
  onSubmit: (data: CreateInstrumentInput) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </p>
      <Separator className="mt-2" />
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactElement;
}

function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Form ────────────────────────────────────────────────────────────────── */

export function InstrumentForm({
  mode,
  defaultValues,
  onSubmit,
  isSubmitting,
  submitError,
}: InstrumentFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InstrumentFormValues>({
    resolver: zodResolver(instrumentSchema),
    defaultValues: {
      submission_date: new Date().toISOString().split("T")[0],
      ...defaultValues,
    },
  });

  // Re-populate when defaultValues change (edit mode)
  useEffect(() => {
    if (defaultValues) {
      reset({
        submission_date: new Date().toISOString().split("T")[0],
        ...defaultValues,
      });
    }
  }, [defaultValues, reset]);

  const handleFormSubmit = (data: InstrumentFormValues) => {
    const input: CreateInstrumentInput = {
      manufacturer: data.manufacturer,
      manufacturer_address: data.manufacturer_address || undefined,
      model_designation: data.model_designation,
      serial_number: data.serial_number,
      instrument_type: data.instrument_type as InstrumentType,
      accuracy_class: data.accuracy_class || undefined,

      max_capacity: Number(data.max_capacity),
      min_capacity: data.min_capacity ? Number(data.min_capacity) : undefined,
      verification_scale_interval: Number(data.verification_scale_interval),
      actual_scale_interval: data.actual_scale_interval
        ? Number(data.actual_scale_interval)
        : undefined,
      verification_intervals: data.verification_intervals
        ? parseInt(data.verification_intervals)
        : undefined,

      load_receptor_type: data.load_receptor_type || undefined,
      indicating_device_type: data.indicating_device_type || undefined,
      software_version: data.software_version || undefined,
      intended_use: data.intended_use || undefined,

      submission_date: data.submission_date || undefined,
      remarks: data.remarks || undefined,
    };

    return onSubmit(input);
  };

  const submitLabel =
    mode === "create" ? "Register Instrument" : "Save Changes";
  const submittingLabel =
    mode === "create" ? "Registering…" : "Saving…";

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      aria-label={mode === "create" ? "Register instrument form" : "Edit instrument form"}
      className="space-y-10"
    >
      {/* ── Instrument Information ────────────────────── */}
      <section aria-labelledby="section-instrument">
        <SectionHeading>Instrument Information</SectionHeading>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="manufacturer"
            label="Manufacturer"
            required
            error={errors.manufacturer?.message}
          >
            <Input
              id="manufacturer"
              type="text"
              placeholder="e.g. Sartorius AG"
              aria-invalid={!!errors.manufacturer}
              className="h-9 text-sm"
              {...register("manufacturer")}
            />
          </Field>

          <Field
            id="manufacturer_address"
            label="Manufacturer Address"
            error={errors.manufacturer_address?.message}
          >
            <Input
              id="manufacturer_address"
              type="text"
              placeholder="City, Country"
              className="h-9 text-sm"
              {...register("manufacturer_address")}
            />
          </Field>

          <Field
            id="model_designation"
            label="Model Designation"
            required
            error={errors.model_designation?.message}
          >
            <Input
              id="model_designation"
              type="text"
              placeholder="e.g. CPA224S"
              aria-invalid={!!errors.model_designation}
              className="h-9 text-sm"
              {...register("model_designation")}
            />
          </Field>

          <Field
            id="serial_number"
            label="Serial Number"
            required
            error={errors.serial_number?.message}
          >
            <Input
              id="serial_number"
              type="text"
              placeholder="e.g. SN-20240001"
              aria-invalid={!!errors.serial_number}
              className="h-9 text-sm"
              {...register("serial_number")}
            />
          </Field>

          <Field
            id="instrument_type"
            label="Instrument Type"
            required
            error={errors.instrument_type?.message}
          >
            <Controller
              name="instrument_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="instrument_type"
                    className="h-9 w-full text-sm"
                    aria-invalid={!!errors.instrument_type}
                  >
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {INSTRUMENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            id="accuracy_class"
            label="Accuracy Class"
            hint="e.g. I, II, III, IIII per OIML R 76"
            error={errors.accuracy_class?.message}
          >
            <Input
              id="accuracy_class"
              type="text"
              placeholder="e.g. III"
              className="h-9 text-sm"
              {...register("accuracy_class")}
            />
          </Field>
        </div>
      </section>

      {/* ── Metrological Parameters ───────────────────── */}
      <section aria-labelledby="section-metrological">
        <SectionHeading>Metrological Parameters</SectionHeading>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="max_capacity"
            label="Maximum Capacity (Max)"
            required
            hint="In kg — must be greater than 0"
            error={errors.max_capacity?.message}
          >
            <Input
              id="max_capacity"
              type="number"
              step="any"
              placeholder="e.g. 150"
              aria-invalid={!!errors.max_capacity}
              className="h-9 text-sm"
              {...register("max_capacity")}
            />
          </Field>

          <Field
            id="min_capacity"
            label="Minimum Capacity (Min)"
            hint="In kg — must be ≤ Max"
            error={errors.min_capacity?.message}
          >
            <Input
              id="min_capacity"
              type="number"
              step="any"
              placeholder="e.g. 0.5"
              aria-invalid={!!errors.min_capacity}
              className="h-9 text-sm"
              {...register("min_capacity")}
            />
          </Field>

          <Field
            id="verification_scale_interval"
            label="Verification Scale Interval (e)"
            required
            hint="In kg — must be greater than 0"
            error={errors.verification_scale_interval?.message}
          >
            <Input
              id="verification_scale_interval"
              type="number"
              step="any"
              placeholder="e.g. 0.05"
              aria-invalid={!!errors.verification_scale_interval}
              className="h-9 text-sm"
              {...register("verification_scale_interval")}
            />
          </Field>

          <Field
            id="actual_scale_interval"
            label="Actual Scale Interval (d)"
            hint="In kg — if different from e"
            error={errors.actual_scale_interval?.message}
          >
            <Input
              id="actual_scale_interval"
              type="number"
              step="any"
              placeholder="e.g. 0.02"
              className="h-9 text-sm"
              {...register("actual_scale_interval")}
            />
          </Field>

          <Field
            id="verification_intervals"
            label="Number of Verification Intervals (n)"
            hint="n = Max / e — calculated or specified"
            error={errors.verification_intervals?.message}
          >
            <Input
              id="verification_intervals"
              type="number"
              step="1"
              placeholder="e.g. 3000"
              className="h-9 text-sm"
              {...register("verification_intervals")}
            />
          </Field>
        </div>
      </section>

      {/* ── Technical Information ─────────────────────── */}
      <section aria-labelledby="section-technical">
        <SectionHeading>Technical Information</SectionHeading>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="load_receptor_type"
            label="Load Receptor Type"
            error={errors.load_receptor_type?.message}
          >
            <Input
              id="load_receptor_type"
              type="text"
              placeholder="e.g. Single-ended beam load cell"
              className="h-9 text-sm"
              {...register("load_receptor_type")}
            />
          </Field>

          <Field
            id="indicating_device_type"
            label="Indicating Device Type"
            error={errors.indicating_device_type?.message}
          >
            <Input
              id="indicating_device_type"
              type="text"
              placeholder="e.g. Digital LCD display"
              className="h-9 text-sm"
              {...register("indicating_device_type")}
            />
          </Field>

          <Field
            id="software_version"
            label="Software / Firmware Version"
            error={errors.software_version?.message}
          >
            <Input
              id="software_version"
              type="text"
              placeholder="e.g. v2.1.4"
              className="h-9 text-sm"
              {...register("software_version")}
            />
          </Field>

          <Field
            id="intended_use"
            label="Intended Use"
            error={errors.intended_use?.message}
          >
            <Input
              id="intended_use"
              type="text"
              placeholder="e.g. Trade, Industrial process"
              className="h-9 text-sm"
              {...register("intended_use")}
            />
          </Field>
        </div>
      </section>

      {/* ── Submission Information ────────────────────── */}
      <section aria-labelledby="section-submission">
        <SectionHeading>Submission Information</SectionHeading>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="submission_date"
            label="Submission Date"
            error={errors.submission_date?.message}
          >
            <Input
              id="submission_date"
              type="date"
              className="h-9 text-sm"
              {...register("submission_date")}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              id="remarks"
              label="Remarks"
              error={errors.remarks?.message}
            >
              <Textarea
                id="remarks"
                placeholder="Any additional remarks about the instrument or submission…"
                className="min-h-20 text-sm"
                {...register("remarks")}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ── Supporting Documents (placeholder) ───────── */}
      <section aria-labelledby="section-documents">
        <SectionHeading>Supporting Documents</SectionHeading>
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-5 py-6">
          <p className="text-xs font-medium text-foreground">
            Document Upload
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Document and photograph upload will be available in the evaluation
            workflow.
          </p>
        </div>
      </section>

      {/* ── Submit ───────────────────────────────────── */}
      {submitError && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-destructive">{submitError}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground">
          <span className="text-destructive">*</span> Required fields
        </p>
        <Button
          type="submit"
          id="instrument-form-submit"
          disabled={isSubmitting}
          className="h-9 w-full sm:w-auto sm:min-w-[200px] text-sm"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
