/**
 * METRA — pages/instruments/new-instrument-page.tsx
 * Route: /app/instruments/new
 *
 * Registration page for adding a new instrument to the laboratory.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { InstrumentForm } from "@/components/instruments/instrument-form";
import { createInstrument } from "@/services/api/instruments";
import { uploadInstrumentDocument } from "@/services/storage";
import { ApiError } from "@/services/api/client";
import type { CreateInstrumentInput } from "@/types/instrument";

export default function NewInstrumentPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queuedFilesRef = useRef<File[]>([]);

  const handleQueuedFiles = (files: File[]) => {
    queuedFilesRef.current = files;
  };

  useEffect(() => {
    document.title = "METRA — Register Instrument";
  }, []);

  const handleSubmit = async (data: CreateInstrumentInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newInstrument = await createInstrument(data);

      // Upload any queued documents using the newly created instrument ID
      const queued = queuedFilesRef.current;
      if (queued.length > 0) {
        for (const file of queued) {
          try {
            await uploadInstrumentDocument(newInstrument.id, file);
          } catch {
            // Non-blocking: instrument was created; surface warning but don't block navigation
            console.warn(`[METRA] Failed to upload document: ${file.name}`);
          }
        }
      }

      navigate(`/app/instruments/${newInstrument.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("An unexpected error occurred. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb / Back link */}
        <div className="mb-4">
          <Link
            to="/app/instruments"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; Back to Instruments
          </Link>
        </div>

        {/* Page title & subtitle */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">
            Register Instrument
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the technical details of the instrument submitted for type evaluation.
          </p>
        </div>

        {/* Form container */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <InstrumentForm
            mode="create"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onQueuedFilesReady={handleQueuedFiles}
          />
        </div>
      </div>
    </AppLayout>
  );
}