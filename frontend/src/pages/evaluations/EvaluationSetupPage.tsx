/**
 * METRA — pages/evaluations/EvaluationSetupPage.tsx
 * Route: /app/instruments/:id/evaluation/new  AND  /app/evaluations/:id/setup
 * Step 1 of the 6-step evaluation workflow.
 * Real DB backed evaluation creation via FastAPI.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Stepper, EVALUATION_STEPS } from "@/components/common/Stepper";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getInstrument } from "@/services/api/instruments";
import { createEvaluation, saveEnvironmentalConditions } from "@/services/api/evaluations";
import { INSTRUMENT_TYPE_LABELS } from "@/types/instrument";
import type { InstrumentType } from "@/types/instrument";

const setupSchema = z.object({
  evaluation_date: z.string().min(1, "Evaluation date is required"),
  oiml_edition: z.string().min(1, "OIML edition is required"),
  temperature_c: z.string().optional(),
  relative_humidity_pct: z.string().optional(),
  atmospheric_pressure_hpa: z.string().optional(),
  test_location: z.string().optional(),
  notes: z.string().optional(),
});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function EvaluationSetupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = "METRA — Evaluation Setup";
  }, []);

  const { data: instrument, isLoading } = useQuery({
    queryKey: ["instrument", id],
    queryFn: () => getInstrument(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      evaluation_date: new Date().toISOString().split("T")[0],
      oiml_edition: "2006 (E)",
    },
  });

  const processEvaluationCreation = async (values: SetupFormValues, targetStep: "draft" | "continue") => {
    if (!id || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // Create real database record in evaluations table in a single request with all setup parameters
      const createdEval = await createEvaluation({
        instrument_id: id,
        evaluation_date: values.evaluation_date,
        oiml_version: values.oiml_edition || "2006 (E)",
        environmental_conditions: {
          temperature_c: values.temperature_c ? parseFloat(values.temperature_c) : undefined,
          relative_humidity_percent: values.relative_humidity_pct ? parseFloat(values.relative_humidity_pct) : undefined,
          relative_humidity_pct: values.relative_humidity_pct ? parseFloat(values.relative_humidity_pct) : undefined,
          atmospheric_pressure_hpa: values.atmospheric_pressure_hpa ? parseFloat(values.atmospheric_pressure_hpa) : undefined,
          test_location: values.test_location || undefined,
          notes: values.notes || undefined,
        },
      });

      if (targetStep === "draft") {
        navigate(`/app/evaluations/${createdEval.id}`);
      } else {
        navigate(`/app/evaluations/${createdEval.id}/tests`);
      }
    } catch (err: any) {
      console.error("Evaluation creation error:", err);
      setErrorMessage("Unable to create evaluation. Please check the evaluation setup and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="New Evaluation Setup"
        description="Configure parameters & environmental conditions for OIML R-76 evaluation"
        breadcrumbs={[
          { label: "Instruments", href: "/app/instruments" },
          ...(instrument
            ? [
                {
                  label: `${instrument.manufacturer} ${instrument.model_designation || (instrument as any).model}`,
                  href: `/app/instruments/${id}`,
                },
              ]
            : []),
          { label: "Evaluation Setup" },
        ]}
      />

      <div className="mb-6">
        <Stepper steps={EVALUATION_STEPS} currentStep={1} />
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit((vals) => processEvaluationCreation(vals, "continue"))} noValidate>
          <div className="space-y-6">
            {instrument && (
              <SectionCard title="Selected Instrument Specifications">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Manufacturer
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {instrument.manufacturer}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Model
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {instrument.model_designation || (instrument as any).model || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Serial Number
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {instrument.serial_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Type
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {INSTRUMENT_TYPE_LABELS[instrument.instrument_type as InstrumentType] ?? instrument.instrument_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Accuracy Class
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      Class {instrument.accuracy_class}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Max Capacity
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {instrument.max_capacity} {(instrument as any).capacity_unit || "kg"}
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            <SectionCard title="Evaluation & Environmental Setup">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="eval-date">Evaluation Date</Label>
                  <Input
                    id="eval-date"
                    type="date"
                    className="h-9 text-sm"
                    {...register("evaluation_date")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="oiml-edition">OIML Recommendation</Label>
                  <Input
                    id="oiml-edition"
                    type="text"
                    disabled
                    className="h-9 text-sm bg-muted"
                    {...register("oiml_edition")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    placeholder="23.0"
                    className="h-9 text-sm"
                    {...register("temperature_c")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="humidity">Relative Humidity (%)</Label>
                  <Input
                    id="humidity"
                    type="number"
                    step="0.1"
                    placeholder="50.0"
                    className="h-9 text-sm"
                    {...register("relative_humidity_pct")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pressure">Atm. Pressure (hPa)</Label>
                  <Input
                    id="pressure"
                    type="number"
                    step="0.1"
                    placeholder="1013.25"
                    className="h-9 text-sm"
                    {...register("atmospheric_pressure_hpa")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">Test Location</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="Metrology Lab Room 1"
                    className="h-9 text-sm"
                    {...register("test_location")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="notes">Evaluation Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="General test conditions, setup observations..."
                    className="resize-none text-sm"
                    rows={3}
                    {...register("notes")}
                  />
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`/app/instruments/${id}`)}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleSubmit((vals) => processEvaluationCreation(vals, "draft"))}
                >
                  Save Draft
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Evaluation..." : "Continue to Test Selection →"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
