/**
 * METRA — pages/instruments/instrument-detail-page.tsx
 * Route: /app/instruments/:id
 *
 * Detailed view of a single instrument with Edit, Start Evaluation, and Delete actions.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { InstrumentStatusBadge } from "@/components/instruments/instrument-status-badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAuth } from "@/hooks/use-auth";
import { getInstrument, deleteInstrument } from "@/services/api/instruments";
import { INSTRUMENT_TYPE_LABELS } from "@/types/instrument";
import type { InstrumentType } from "@/types/instrument";

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={`mt-1 text-xs text-foreground sm:col-span-2 sm:mt-0 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value !== undefined && value !== null && value !== "" ? (
          value
        ) : (
          <span className="text-muted-foreground font-normal">—</span>
        )}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <Separator className="my-3" />
      <dl className="divide-y divide-border/50">{children}</dl>
    </div>
  );
}

export default function InstrumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canDelete = profile?.role === "owner" || profile?.role === "admin";

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
      document.title = `METRA — ${instrument.model_designation} (${instrument.serial_number})`;
    }
  }, [instrument]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteInstrument(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instruments"] });
      navigate("/app/instruments", { replace: true });
    },
    onError: (err: Error) => {
      setDeleteError(err.message || "Failed to delete instrument.");
    },
  });

  const handleDeleteConfirm = () => {
    setDeleteError(null);
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading instrument details…</p>
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
            {error instanceof Error ? error.message : "The requested instrument could not be loaded."}
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => navigate("/app/instruments")}
          >
            Back to Instruments
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb & Top Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/app/instruments"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; Back to Instruments
          </Link>

          <div className="flex items-center gap-2">
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/instruments/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/app/instruments/${id}/evaluation/new`)}
            >
              Start Evaluation
            </Button>
          </div>
        </div>

        {/* Instrument Overview Banner */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {instrument.model_designation || (instrument as any).model || "Unnamed Model"}
                </h1>
                <InstrumentStatusBadge status={instrument.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {instrument.manufacturer} &middot; Serial:{" "}
                <span className="font-mono text-foreground">
                  {instrument.serial_number}
                </span>
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Type
              </span>
              <p className="text-xs font-semibold text-foreground">
                {INSTRUMENT_TYPE_LABELS[
                  instrument.instrument_type as InstrumentType
                ] ?? instrument.instrument_type}
              </p>
            </div>
          </div>
        </div>

        {/* Detail Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Section 1: Instrument Information */}
          <DetailSection title="Instrument Information">
            <DetailRow label="Manufacturer" value={instrument.manufacturer} />
            <DetailRow
              label="Manufacturer Address"
              value={instrument.manufacturer_address}
            />
            <DetailRow label="Model Designation" value={instrument.model_designation} />
            <DetailRow
              label="Serial Number"
              value={instrument.serial_number}
              mono
            />
            <DetailRow
              label="Instrument Type"
              value={
                INSTRUMENT_TYPE_LABELS[
                  instrument.instrument_type as InstrumentType
                ] ?? instrument.instrument_type
              }
            />
            <DetailRow label="Accuracy Class" value={instrument.accuracy_class} />
          </DetailSection>

          {/* Section 2: Metrological Parameters */}
          <DetailSection title="Metrological Parameters">
            <DetailRow
              label="Maximum Capacity (Max)"
              value={
                instrument.max_capacity !== null
                  ? `${instrument.max_capacity} kg`
                  : null
              }
            />
            <DetailRow
              label="Minimum Capacity (Min)"
              value={
                instrument.min_capacity !== null
                  ? `${instrument.min_capacity} kg`
                  : null
              }
            />
            <DetailRow
              label="Verification Scale Interval (e)"
              value={
                instrument.verification_scale_interval !== null
                  ? `${instrument.verification_scale_interval} kg`
                  : null
              }
            />
            <DetailRow
              label="Actual Scale Interval (d)"
              value={
                instrument.actual_scale_interval !== null
                  ? `${instrument.actual_scale_interval} kg`
                  : null
              }
            />
            <DetailRow
              label="Verification Intervals (n)"
              value={instrument.verification_intervals}
            />
          </DetailSection>

          {/* Section 3: Technical Information */}
          <DetailSection title="Technical Information">
            <DetailRow
              label="Load Receptor Type"
              value={instrument.load_receptor_type}
            />
            <DetailRow
              label="Indicating Device Type"
              value={instrument.indicating_device_type}
            />
            <DetailRow
              label="Software / Firmware"
              value={instrument.software_version}
            />
            <DetailRow label="Intended Use" value={instrument.intended_use} />
          </DetailSection>

          {/* Section 4: Submission & Documents */}
          <DetailSection title="Submission Information">
            <DetailRow
              label="Submission Date"
              value={
                instrument.submission_date
                  ? new Date(instrument.submission_date).toLocaleDateString(
                      "en-IN",
                      { day: "2-digit", month: "short", year: "numeric" }
                    )
                  : null
              }
            />
            <DetailRow label="Remarks" value={instrument.remarks} />
            <div className="pt-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Supporting Documents
              </p>
              <div className="mt-2 rounded-md border border-dashed border-border p-3 text-[11px] text-muted-foreground">
                Document and photograph attachments will be managed during evaluation.
              </div>
            </div>
          </DetailSection>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent showCloseButton={!deleteMutation.isPending}>
            <DialogHeader>
              <DialogTitle>Delete Instrument?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  {instrument.model_designation} (SN: {instrument.serial_number})
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {deleteError && (
              <div className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {deleteError}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Instrument"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
