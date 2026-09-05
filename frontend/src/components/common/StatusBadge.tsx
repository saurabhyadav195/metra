/**
 * METRA — components/common/StatusBadge.tsx
 * Unified status badge for evaluations, tests, and reports.
 * Always uses both color and text/icon so it's accessible without color alone.
 */

import { cn } from "@/lib/utils";
import type { EvaluationStatus, TestStatus } from "@/types/evaluation";
import type { InstrumentStatus } from "@/types/instrument";
import {
  INSTRUMENT_STATUS_LABELS,
} from "@/types/instrument";

/* ── Evaluation status ───────────────────────────── */

const EVAL_STATUS_CONFIG: Record<
  EvaluationStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 border",
  },
  PASS: {
    label: "Pass",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 border font-semibold",
  },
  FAIL: {
    label: "Fail",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 border font-semibold",
  },
  REQUIRES_REVIEW: {
    label: "Review",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 border",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 border",
  },
  PASSED: {
    label: "Passed",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 border font-semibold",
  },
  FAILED: {
    label: "Failed",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 border font-semibold",
  },
};

/* ── Test status ─────────────────────────────────── */

const TEST_STATUS_CONFIG: Record<
  TestStatus,
  { label: string; className: string }
> = {
  NOT_STARTED: {
    label: "Not Started",
    className: "bg-muted/80 text-muted-foreground border-border",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 border",
  },
  PASS: {
    label: "Pass",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 border font-semibold",
  },
  FAIL: {
    label: "Fail",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 border font-semibold",
  },
  MANUAL_REVIEW: {
    label: "Manual Review",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 border",
  },
  NOT_APPLICABLE: {
    label: "N/A",
    className: "bg-muted text-muted-foreground border-border",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 border",
  },
};

/* ── Instrument status ───────────────────────────── */

const INSTRUMENT_STATUS_CONFIG: Record<
  InstrumentStatus,
  { className: string }
> = {
  registered: { className: "bg-muted text-muted-foreground border-border" },
  under_evaluation: { className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 border" },
  evaluation_completed: { className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 border" },
  report_generated: {
    className:
      "bg-primary/10 text-primary border-primary/20 border font-medium",
  },
};

interface StatusBadgeProps {
  type?: "evaluation" | "test" | "instrument";
  status: EvaluationStatus | TestStatus | InstrumentStatus | string;
  className?: string;
  size?: "sm" | "default";
}

export function StatusBadge({ type = "evaluation", status, className, size = "default" }: StatusBadgeProps) {
  let label = String(status || "");
  let badgeClassName = "bg-muted text-muted-foreground border-border";

  if (type === "evaluation") {
    const normKey = String(status || "").toUpperCase() as EvaluationStatus;
    const config = EVAL_STATUS_CONFIG[normKey] || EVAL_STATUS_CONFIG[status as EvaluationStatus];
    if (config) {
      label = config.label;
      badgeClassName = config.className;
    }
  } else if (type === "test") {
    const config = TEST_STATUS_CONFIG[status as TestStatus];
    if (config) {
      label = config.label;
      badgeClassName = config.className;
    }
  } else {
    const config = INSTRUMENT_STATUS_CONFIG[status as InstrumentStatus];
    if (config) {
      label = INSTRUMENT_STATUS_LABELS[status as InstrumentStatus] ?? status;
      badgeClassName = config.className;
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-medium",
        size === "sm"
          ? "px-1.5 py-0 text-[10px] tracking-wide uppercase"
          : "px-2 py-0.5 text-[11px]",
        badgeClassName,
        className
      )}
    >
      {label}
    </span>
  );
}

/* ── Result badge (PASS / FAIL / REVIEW) ─────────── */

interface ResultBadgeProps {
  result: "PASS" | "FAIL" | "REVIEW" | "REQUIRES_REVIEW";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function ResultBadge({ result, size = "default", className }: ResultBadgeProps) {
  const config = {
    PASS: { label: "Pass", className: "status-pass border" },
    FAIL: { label: "Fail", className: "status-fail border" },
    REVIEW: { label: "Requires Review", className: "status-review border" },
    REQUIRES_REVIEW: { label: "Requires Review", className: "status-review border" },
  }[result];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-semibold uppercase tracking-wide",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "default" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-4 py-2 text-sm",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
