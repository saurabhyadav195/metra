/**
 * METRA — components/metrology/OimlClauseBadge.tsx
 * Authoritative OIML R 76-1 clause reference tag component.
 *
 * Example:
 * OIML R 76-1 § A.4.4.1
 */

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShieldCheckIcon } from "@hugeicons/core-free-icons";

interface OimlClauseBadgeProps {
  /** Clause ID or section (e.g. "A.4.4.1" or "3.5.1") */
  clause: string;
  /** Standard designation (defaults to "OIML R 76-1") */
  standard?: string;
  /** Size variant */
  size?: "sm" | "md";
  className?: string;
}

export function OimlClauseBadge({
  clause,
  standard = "OIML R 76-1",
  size = "md",
  className = "",
}: OimlClauseBadgeProps) {
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-medium border border-primary/20 bg-primary/5 text-primary select-none ${
        isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
      title={`Traceable Regulatory Requirement: ${standard} Clause ${clause}`}
    >
      <HugeiconsIcon icon={ShieldCheckIcon} strokeWidth={2} className={isSm ? "size-3 text-primary/80" : "size-3.5 text-primary/80"} />
      <span>{standard}</span>
      <span className="opacity-60">§</span>
      <span className="font-bold">{clause}</span>
    </span>
  );
}
