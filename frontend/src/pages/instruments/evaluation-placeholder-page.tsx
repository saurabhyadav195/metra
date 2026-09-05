/**
 * METRA — pages/instruments/evaluation-placeholder-page.tsx
 * Route: /app/instruments/:id/evaluation/new
 *
 * Placeholder page for the upcoming evaluation workflow module.
 */

import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { getInstrument } from "@/services/api/instruments";

export default function EvaluationPlaceholderPage() {
  const { id } = useParams<{ id: string }>();

  const { data: instrument } = useQuery({
    queryKey: ["instrument", id],
    queryFn: () => getInstrument(id!),
    enabled: !!id,
  });

  useEffect(() => {
    document.title = "METRA — Evaluation Setup";
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl py-8">
        <div className="mb-4">
          <Link
            to={`/app/instruments/${id}`}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; Back to Instrument Details
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="mb-6">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Module 2 — Upcoming
            </span>
            <h1 className="mt-1 text-xl font-bold text-foreground">
              Evaluation Setup
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              OIML R-76 evaluation procedures and test management.
            </p>
          </div>

          <Separator className="my-6" />

          {instrument && (
            <div className="mb-6 rounded-md bg-secondary/50 p-4 text-xs">
              <p className="font-semibold text-foreground">
                Selected Instrument:
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {instrument.model_designation} &middot; {instrument.manufacturer}{" "}
                &middot; SN: {instrument.serial_number}
              </p>
            </div>
          )}

          <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center">
            <p className="text-xs font-medium text-foreground">
              Evaluation Workflow Engine
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
              Evaluation setup, MPE determination, weighing tests, eccentricity,
              repeatability, and automated report generation will be implemented
              in the next module.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <Link to={`/app/instruments/${id}`}>
              <Button variant="outline" size="sm">
                Return to Instrument Details
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
