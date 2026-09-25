/**
 * METRA — pages/instruments/instruments-page.tsx
 * Route: /app/instruments
 *
 * Changes vs original:
 * - L-2: Now uses <PageHeader> (was the only page with inline header)
 * - Loading state uses <LoadingState> (was inline <p> text)
 * - Error state uses <ErrorState> (was inline div)
 * - EmptyState uses variant="no-data" / "no-results" to differentiate
 * - Existing React Query usage retained
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddSquareIcon } from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { InstrumentStatusBadge } from "@/components/instruments/instrument-status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { listInstruments } from "@/services/api/instruments";
import {
  INSTRUMENT_STATUS_LABELS,
  INSTRUMENT_TYPE_LABELS,
  INSTRUMENT_TYPES,
} from "@/types/instrument";
import type { InstrumentStatus, InstrumentType } from "@/types/instrument";
import { ScaleIcon } from "@hugeicons/core-free-icons";

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function InstrumentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    document.title = "METRA — Instruments";
  }, []);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["instruments", search, statusFilter, typeFilter],
    queryFn: () =>
      listInstruments({
        search: search || undefined,
        status: statusFilter || undefined,
        instrument_type: typeFilter || undefined,
      }),
    staleTime: 30_000,
  });

  const instruments = data?.instruments ?? [];
  const hasFilters = !!(search || statusFilter || typeFilter);

  return (
    <AppLayout>
      {/* L-2 fix: Now using PageHeader consistently (was inline div) */}
      <PageHeader
        title="Instruments"
        description="Manage instruments submitted for type evaluation."
        actions={
          <Button
            id="add-instrument-btn"
            size="sm"
            onClick={() => navigate("/app/instruments/new")}
          >
            <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} className="size-3.5" />
            Add Instrument
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          id="instrument-search"
          type="search"
          placeholder="Search by model, manufacturer, or serial number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-sm text-sm"
          aria-label="Search instruments"
        />

        <Select
          value={statusFilter || "all"}
          onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger id="status-filter" className="h-9 w-40 text-sm bg-card">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border shadow-md z-50">
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(INSTRUMENT_STATUS_LABELS) as InstrumentStatus[]).map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {INSTRUMENT_STATUS_LABELS[s]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter || "all"}
          onValueChange={(val) => setTypeFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger id="type-filter" className="h-9 w-44 text-sm bg-card">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border shadow-md z-50">
            <SelectItem value="all">All types</SelectItem>
            {INSTRUMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {INSTRUMENT_TYPE_LABELS[t as InstrumentType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <LoadingState message="Loading instruments…" />
        ) : isError ? (
          <ErrorState
            title="Failed to load instruments"
            description={error instanceof Error ? error.message : "An error occurred."}
            onRetry={() => refetch()}
          />
        ) : instruments.length === 0 ? (
          <EmptyState
            icon={ScaleIcon}
            variant={hasFilters ? "no-results" : "no-data"}
            title={
              hasFilters
                ? "No instruments match your filters"
                : "No instruments registered yet"
            }
            description={
              hasFilters
                ? "Try clearing the search or adjusting the filters."
                : "Register the first instrument to begin the evaluation workflow."
            }
            action={
              !hasFilters ? (
                <Button
                  size="sm"
                  onClick={() => navigate("/app/instruments/new")}
                >
                  Add Instrument
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instruments.map((instrument) => (
                <TableRow key={instrument.id}>
                  <TableCell>
                    <Link
                      to={`/app/instruments/${instrument.id}`}
                      className="font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {instrument.model || "Unnamed Model"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {instrument.manufacturer}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {INSTRUMENT_TYPE_LABELS[
                      instrument.instrument_type as InstrumentType
                    ] ?? instrument.instrument_type}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {instrument.serial_number}
                  </TableCell>
                  <TableCell>
                    <InstrumentStatusBadge status={instrument.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {instrument.submission_date
                      ? new Date(instrument.submission_date).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {!isLoading && !isError && instruments.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {instruments.length} instrument{instruments.length !== 1 ? "s" : ""}
        </p>
      )}
    </AppLayout>
  );
}
