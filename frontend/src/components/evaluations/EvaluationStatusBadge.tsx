/**
 * METRA — components/evaluations/EvaluationStatusBadge.tsx
 *
 * Re-export shim — all evaluation/test status rendering is now handled by the
 * consolidated StatusBadge system in components/common/StatusBadge.tsx.
 *
 * This file is kept to avoid breaking existing imports.
 * Callers may migrate to `StatusBadge type="evaluation"` directly.
 */

import { StatusBadge } from "@/components/common/StatusBadge";
import type { EvaluationStatus, TestStatus } from "@/types/evaluation";
import { cn } from "@/lib/utils";

type AnyStatus = EvaluationStatus | TestStatus | string;

interface EvaluationStatusBadgeProps {
  status: AnyStatus;
  className?: string;
}

export function EvaluationStatusBadge({
  status,
  className,
}: EvaluationStatusBadgeProps) {
  return (
    <StatusBadge
      type="evaluation"
      status={status}
      className={cn(className)}
    />
  );
}
