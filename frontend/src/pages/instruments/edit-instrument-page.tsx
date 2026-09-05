/**
 * METRA — pages/instruments/edit-instrument-page.tsx
 * Route: /app/instruments/:id/edit
 *
 * Page for editing an existing instrument using the shared InstrumentForm component.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import {
  InstrumentForm,
  type InstrumentFormValues,
} from "@/components/instruments/instrument-form";
import { getInstrument, updateInstrument } from "@/services/api/instruments";
import { ApiError } from "@/services/api/client";
import type { CreateInstrumentInput } from "@/types/instrument";

export default function EditInstrumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: instrument,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["instrument", id],
    queryFn: () => getInstrument(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (instrument) {
      document.title = `METRA — Edit ${instrument.model_designation}`;
    }
  }, [instrument]);

  const handleSubmit = async (data: CreateInstrumentInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await updateInstrument(id!, data);
      queryClient.invalidateQueries({ queryKey: ["instrument", id] });
      queryClient.invalidateQueries({ queryKey: ["instruments"] });
      navigate(`/app/instruments/${id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("An unexpected error occurred. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading instrument…</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !instrument) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-xl py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Instrument Not Found
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "The requested instrument could not be loaded for editing."}
          </p>
          <Link
            to="/app/instruments"
            className="mt-4 inline-block text-xs font-medium text-primary hover:underline"
          >
            &larr; Back to Instruments
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Format default values for form
  const defaultValues: Partial<InstrumentFormValues> = {
    manufacturer: instrument.manufacturer,
    manufacturer_address: instrument.manufacturer_address ?? "",
    model_designation: instrument.model_designation,
    serial_number: instrument.serial_number,
    instrument_type: instrument.instrument_type as InstrumentFormValues["instrument_type"],
    accuracy_class: instrument.accuracy_class ?? "",

    max_capacity: instrument.max_capacity?.toString() ?? "",
    min_capacity: instrument.min_capacity?.toString() ?? "",
    verification_scale_interval:
      instrument.verification_scale_interval?.toString() ?? "",
    actual_scale_interval: instrument.actual_scale_interval?.toString() ?? "",
    verification_intervals:
      instrument.verification_intervals?.toString() ?? "",

    load_receptor_type: instrument.load_receptor_type ?? "",
    indicating_device_type: instrument.indicating_device_type ?? "",
    software_version: instrument.software_version ?? "",
    intended_use: instrument.intended_use ?? "",

    submission_date: instrument.submission_date ?? "",
    remarks: instrument.remarks ?? "",
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            to={`/app/instruments/${id}`}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; Back to Instrument Details
          </Link>
        </div>

        {/* Page title & subtitle */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">
            Edit Instrument
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update technical parameters for {instrument.model_designation} (SN: {instrument.serial_number}).
          </p>
        </div>

        {/* Form container */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <InstrumentForm
            mode="edit"
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        </div>
      </div>
    </AppLayout>
  );
}
