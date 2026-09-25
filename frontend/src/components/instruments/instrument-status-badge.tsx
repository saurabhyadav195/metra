/**
 * METRA — components/instruments/instrument-status-badge.tsx
 *
 * Re-export shim — all instrument status rendering is now handled by the
 * consolidated StatusBadge system in components/common/StatusBadge.tsx.
 *
 * This file is kept to avoid breaking existing imports across the codebase.
 * Callers may migrate to `StatusBadge type="instrument"` directly.
 */

import { StatusBadge } from "@/components/common/StatusBadge";
import type { InstrumentStatus } from "@/types/instrument";
import { cn } from "@/lib/utils";

interface InstrumentStatusBadgeProps {
  status: InstrumentStatus;
  className?: string;
}

export function InstrumentStatusBadge({
  status,
  className,
}: InstrumentStatusBadgeProps) {
  return (
    <StatusBadge
      type="instrument"
      status={status}
      className={cn(className)}
    />
  );
}
