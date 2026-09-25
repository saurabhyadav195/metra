/**
 * METRA — pages/instruments/instrument-detail-page.tsx
 * Route: /app/instruments/:id
 *
 * Changes vs original:
 * - CP-6: Removed duplicate local DetailRow — now uses exported DetailRow from SectionCard.tsx
 * - CP-10: Back nav uses consistent PageHeader breadcrumb pattern via PageHeader component
 * - AX-9: Loading state now uses LoadingState component with aria-live
 * - Loading/error states use standardized EmptyState components
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { InstrumentStatusBadge } from "@/components/instruments/instrument-status-badge";
import { SectionCard, DetailRow } from "@/components/common/SectionCard";
import { LoadingState, ErrorState } from "@/components/common/EmptyState";
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
      document.title = `METRA — ${instrument.model} (${instrument.serial_number})`;
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
        {/* AX-9 fix: uses LoadingState with aria-live instead of raw <p> */}
        <LoadingState message="Loading instrument details…" />
      </AppLayout>
    );
  }

  if (isError || !instrument) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-xl">
          <ErrorState
            title="Instrument Not Found"
            description={
              error instanceof Error
                ? error.message
                : "The requested instrument could not be loaded."
            }
            onRetry={() => navigate("/app/instruments")}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* CP-10 fix: consistent PageHeader + breadcrumbs instead of inline back link */}
        <PageHeader
          title={instrument.model || "Unnamed Model"}
          badge={<InstrumentStatusBadge status={instrument.status} />}
          description={`${instrument.manufacturer} · Serial: ${instrument.serial_number}`}
          breadcrumbs={[
            { label: "Instruments", href: "/app/instruments" },
            { label: instrument.model || "Instrument" },
          ]}
          actions={
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
          }
        />

        {/* Detail Grid — CP-6 fix: uses shared DetailRow from SectionCard.tsx */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Section 1: Instrument Information */}
          <SectionCard title="Instrument Information">
            <dl className="divide-y divide-border/50">
              <DetailRow label="Manufacturer" value={instrument.manufacturer} />
              <DetailRow label="Manufacturer Address" value={instrument.manufacturer_address} />
              <DetailRow label="Model Designation" value={instrument.model} />
              <DetailRow label="Serial Number" value={instrument.serial_number} mono />
              <DetailRow
                label="Instrument Type"
                value={
                  INSTRUMENT_TYPE_LABELS[instrument.instrument_type as InstrumentType] ??
                  instrument.instrument_type
                }
              />
              <DetailRow label="Accuracy Class" value={instrument.accuracy_class} />
            </dl>
          </SectionCard>

          {/* Section 2: Metrological Parameters */}
          <SectionCard title="Metrological Parameters">
            <dl className="divide-y divide-border/50">
              <DetailRow
                label="Maximum Capacity (Max)"
                value={instrument.max_capacity !== null ? `${instrument.max_capacity} kg` : null}
              />
              <DetailRow
                label="Minimum Capacity (Min)"
                value={instrument.min_capacity !== null ? `${instrument.min_capacity} kg` : null}
              />
              {Array.isArray(instrument.weighing_intervals) &&
              instrument.weighing_intervals.length > 0 ? (
                <div className="py-2.5">
                  <dt className="text-xs font-medium text-muted-foreground mb-2">
                    Weighing Intervals (Multi-interval OIML T.3.2.6)
                  </dt>
                  <dd className="sm:col-span-2">
                    <div className="overflow-x-auto rounded border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 font-medium text-muted-foreground">
                          <tr>
                            <th className="px-3 py-1.5 border-b border-border">Interval #</th>
                            <th className="px-3 py-1.5 border-b border-border">Partial Range</th>
                            <th className="px-3 py-1.5 border-b border-border">Max Load</th>
                            <th className="px-3 py-1.5 border-b border-border">e (VSI)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 font-mono text-[11px]">
                          {instrument.weighing_intervals.map((iv, idx, arr) => {
                            const minBound =
                              idx === 0
                                ? instrument.min_capacity || 0
                                : arr[idx - 1].max_load;
                            return (
                              <tr key={idx}>
                                <td className="px-3 py-1.5 text-foreground font-semibold">
                                  W{idx + 1}
                                </td>
                                <td className="px-3 py-1.5">
                                  {minBound} – {iv.max_load} kg
                                </td>
                                <td className="px-3 py-1.5">{iv.max_load} kg</td>
                                <td className="px-3 py-1.5 font-bold text-primary">
                                  {iv.e} kg
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </dd>
                </div>
              ) : (
                <DetailRow
                  label="Verification Scale Interval (e)"
                  value={
                    instrument.verification_scale_interval !== null
                      ? `${instrument.verification_scale_interval} kg`
                      : null
                  }
                />
              )}
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
            </dl>
          </SectionCard>

          {/* Section 3: Technical Information */}
          <SectionCard title="Technical Information">
            <dl className="divide-y divide-border/50">
              <DetailRow label="Load Receptor Type" value={instrument.load_receptor_type} />
              <DetailRow label="Indicating Device Type" value={instrument.indicating_device_type} />
              <DetailRow label="Software / Firmware" value={instrument.software_version} />
              <DetailRow label="Intended Use" value={instrument.intended_use} />
            </dl>
          </SectionCard>

          {/* Section 4: Submission Information */}
          <SectionCard title="Submission Information">
            <dl className="divide-y divide-border/50">
              <DetailRow
                label="Submission Date"
                value={
                  instrument.submission_date
                    ? new Date(instrument.submission_date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : null
                }
              />
              <DetailRow label="Remarks" value={instrument.remarks} />
            </dl>
            <div className="pt-3">
              <Separator className="mb-3" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Supporting Documents
              </p>
              <div className="mt-2 rounded-md border border-dashed border-border p-3 text-[11px] text-muted-foreground">
                Document and photograph attachments will be managed during evaluation.
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent showCloseButton={!deleteMutation.isPending}>
            <DialogHeader>
              <DialogTitle>Delete Instrument?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  {instrument.model} (SN: {instrument.serial_number})
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {deleteError && (
              <div className="rounded border border-error-border bg-error-bg p-2 text-xs text-error-text">
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
