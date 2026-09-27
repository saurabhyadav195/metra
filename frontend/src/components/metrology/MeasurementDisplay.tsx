/**
 * METRA — components/metrology/MeasurementDisplay.tsx
 * Reusable measurement/result presentation card showing:
 * - Measured Value (I)
 * - Applied Load (L)
 * - Corrected Error (Ec)
 * - Maximum Permissible Error (MPE)
 * - Visual Compliance Outcome & Traceability
 */

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CancelCircleIcon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { ToleranceBar } from "./ToleranceBar";

interface MeasurementDisplayProps {
  /** Applied Load L */
  load: number;
  /** Indication I */
  indication: number;
  /** Corrected Error Ec */
  error: number;
  /** MPE limit ±MPE */
  mpe: number;
  /** Measurement unit (default 'g') */
  unit?: string;
  /** Result decision ("PASS" | "FAIL" | "REVIEW") */
  result?: "PASS" | "FAIL" | "REVIEW" | string;
  /** Optional OIML test clause reference */
  clause?: string;
  className?: string;
}

export function MeasurementDisplay({
  load,
  indication,
  error,
  mpe,
  unit = "g",
  result = "PASS",
  clause,
  className = "",
}: MeasurementDisplayProps) {
  const isPass = result === "PASS";
  const isFail = result === "FAIL";

  return (
    <div className={`rounded-lg border border-border bg-card p-4 shadow-sm space-y-4 ${className}`}>
      {/* Header with optional Clause & Result Tag */}
      <div className="flex justify-between items-center pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          {clause && (
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary">
              OIML R 76-1 § {clause}
            </span>
          )}
          <span className="text-xs text-muted-foreground font-medium">Measurement Step</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isPass && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2.5} className="size-3.5 text-emerald-600" />
              PASS
            </span>
          )}
          {isFail && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold font-mono bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300">
              <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2.5} className="size-3.5 text-rose-600" />
              FAIL
            </span>
          )}
          {!isPass && !isFail && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold font-mono bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300">
              <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2.5} className="size-3.5 text-amber-600" />
              {result}
            </span>
          )}
        </div>
      </div>

      {/* Grid of Key Numerical Parameters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-muted/40 rounded p-2.5 border border-border/40">
          <p className="text-[11px] font-sans text-muted-foreground">Applied Load (L)</p>
          <p className="text-base font-bold text-foreground mt-0.5">{load} {unit}</p>
        </div>

        <div className="bg-muted/40 rounded p-2.5 border border-border/40">
          <p className="text-[11px] font-sans text-muted-foreground">Indication (I)</p>
          <p className="text-base font-bold text-foreground mt-0.5">{indication} {unit}</p>
        </div>

        <div className="bg-muted/40 rounded p-2.5 border border-border/40">
          <p className="text-[11px] font-sans text-muted-foreground">Corrected Error (Ec)</p>
          <p className={`text-base font-bold mt-0.5 ${isPass ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
            {error > 0 ? `+${error}` : error} {unit}
          </p>
        </div>

        <div className="bg-muted/40 rounded p-2.5 border border-border/40">
          <p className="text-[11px] font-sans text-muted-foreground">Max Permissible Error (MPE)</p>
          <p className="text-base font-bold text-foreground mt-0.5">±{mpe} {unit}</p>
        </div>
      </div>

      {/* Visual Gauge */}
      <ToleranceBar error={error} mpe={mpe} unit={unit} size="md" />
    </div>
  );
}
