/**
 * METRA — components/instruments/instrument-status-badge.tsx
 * Reusable status badge for instrument workflow states.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InstrumentStatus } from "@/types/instrument";
import { INSTRUMENT_STATUS_LABELS } from "@/types/instrument";

interface InstrumentStatusBadgeProps {
  status: InstrumentStatus;
  className?: string;
}

const STATUS_STYLES: Record<InstrumentStatus, string> = {
  registered:
    "border-border bg-secondary text-secondary-foreground",
  under_evaluation:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  evaluation_completed:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  report_generated:
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

export function InstrumentStatusBadge({
  status,
  className,
}: InstrumentStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-sm px-1.5 py-0 text-[10px] font-medium tracking-wide",
        STATUS_STYLES[status] ?? STATUS_STYLES.registered,
        className
      )}
    >
      {INSTRUMENT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
