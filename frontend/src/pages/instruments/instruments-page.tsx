/**
 * METRA — pages/instruments/instruments-page.tsx
 * Route: /app/instruments
 *
 * Lists all instruments for the authenticated laboratory.
 * Engineers see only their own instruments (enforced by backend).
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { InstrumentStatusBadge } from "@/components/instruments/instrument-status-badge";
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

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function InstrumentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    document.title = "METRA — Instruments";
  }, []);

  const { data, isLoading, isError, error } = useQuery({
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

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Instruments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage instruments submitted for type evaluation.
          </p>
        </div>
        <Button
          id="add-instrument-btn"
          size="lg"
          onClick={() => navigate("/app/instruments/new")}
          className="shrink-0"
        >
          + Add Instrument
        </Button>
      </div>

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

        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
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

        <Select value={typeFilter || "all"} onValueChange={(val) => setTypeFilter(val === "all" ? "" : val)}>
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
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">
              Loading instruments…
            </p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Failed to load instruments
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "An error occurred."}
              </p>
            </div>
          </div>
        ) : instruments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              {search || statusFilter || typeFilter
                ? "No instruments match your filters."
                : "No instruments registered yet."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || statusFilter || typeFilter
                ? "Try clearing the search or filters."
                : "Register the first instrument to begin the evaluation workflow."}
            </p>
            {!(search || statusFilter || typeFilter) && (
              <Button
                size="sm"
                className="mt-4"
                onClick={() => navigate("/app/instruments/new")}
              >
                + Add Instrument
              </Button>
            )}
          </div>
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
                      {instrument.model_designation || (instrument as any).model || "Unnamed Model"}
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
                    <InstrumentStatusBadge
                      status={instrument.status}
                    />
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
