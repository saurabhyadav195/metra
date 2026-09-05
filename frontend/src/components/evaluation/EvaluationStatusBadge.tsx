/**
 * METRA — components/evaluation/EvaluationStatusBadge.tsx
 * Status badge for evaluation and test result states.
 */

import type { EvaluationStatus, TestStatus } from "@/types/evaluation";
import { cn } from "@/lib/utils";

type AnyStatus = EvaluationStatus | TestStatus | string;

interface EvaluationStatusBadgeProps {
  status: AnyStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  // Evaluation statuses
  DRAFT: {
    label: "Draft",
    className: "bg-secondary text-secondary-foreground border border-border",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  REQUIRES_REVIEW: {
    label: "Review Required",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  // Test / Overall statuses
  PASS: {
    label: "PASS",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  FAIL: {
    label: "FAIL",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
  NOT_STARTED: {
    label: "Not Started",
    className: "bg-secondary text-muted-foreground border border-border",
  },
  MANUAL_REVIEW: {
    label: "Manual Review",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  NOT_APPLICABLE: {
    label: "N/A",
    className: "bg-secondary text-muted-foreground border border-border",
  },
  INCOMPLETE: {
    label: "Incomplete",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
};

export function EvaluationStatusBadge({
  status,
  className,
}: EvaluationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-secondary text-muted-foreground border border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
