/**
 * METRA — components/common/StatusBadge.tsx
 *
 * Single authoritative badge system for all METRA status values.
 * All colors come from design tokens (index.css) — NO hardcoded Tailwind
 * color classes.
 *
 * Exports:
 *   StatusBadge  – evaluation/test/instrument status (text label)
 *   ResultBadge  – PASS / FAIL / REVIEW decision (icon + label — AX-1 fix)
 *
 * Replaces:
 *   - StatusBadge (old)
 *   - ResultBadge (old)
 *   - InstrumentStatusBadge
 *   - EvaluationStatusBadge
 *   - Inline <span> status chips in TestSelectionPage
 */

import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  AlertCircleIcon,
  Clock01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { EvaluationStatus, TestStatus } from "@/types/evaluation";
import type { InstrumentStatus } from "@/types/instrument";
import { INSTRUMENT_STATUS_LABELS } from "@/types/instrument";

// ─── Token-based style map ────────────────────────────────────────────────────
// All classes reference CSS custom properties from index.css — no raw colors.

type BadgeStyle = { label: string; className: string };

const EVAL_STATUS: Record<string, BadgeStyle> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-warning-bg text-warning-text border-warning-border",
  },
  PASS: {
    label: "Pass",
    className: "bg-success-bg text-success-text border-success-border font-semibold",
  },
  FAIL: {
    label: "Fail",
    className: "bg-error-bg text-error-text border-error-border font-semibold",
  },
  PASSED: {
    label: "Passed",
    className: "bg-success-bg text-success-text border-success-border font-semibold",
  },
  FAILED: {
    label: "Failed",
    className: "bg-error-bg text-error-text border-error-border font-semibold",
  },
  REQUIRES_REVIEW: {
    label: "Review",
    className: "bg-warning-bg text-warning-text border-warning-border",
  },
  REQUIRES_REWORK: {
    label: "Requires Rework",
    className: "bg-error-bg text-error-text border-error-border font-semibold",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-success-bg text-success-text border-success-border",
  },
  PENDING_VERIFICATION: {
    label: "Pending Verification",
    className: "bg-info-bg text-info-text border-info-border font-medium",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-success-bg text-success-text border-success-border font-semibold",
  },
};

const TEST_STATUS: Record<string, BadgeStyle> = {
  NOT_STARTED: {
    label: "Not Started",
    className: "bg-muted text-muted-foreground border-border",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-warning-bg text-warning-text border-warning-border",
  },
  PASS: {
    label: "Pass",
    className: "bg-success-bg text-success-text border-success-border font-semibold",
  },
  FAIL: {
    label: "Fail",
    className: "bg-error-bg text-error-text border-error-border font-semibold",
  },
  MANUAL_REVIEW: {
    label: "Manual Review",
    className: "bg-warning-bg text-warning-text border-warning-border",
  },
  NOT_APPLICABLE: {
    label: "N/A",
    className: "bg-muted text-muted-foreground border-border",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-success-bg text-success-text border-success-border",
  },
};

const INSTRUMENT_STATUS: Record<string, BadgeStyle> = {
  registered: {
    label: "Registered",
    className: "bg-muted text-muted-foreground border-border",
  },
  under_evaluation: {
    label: "Under Evaluation",
    className: "bg-warning-bg text-warning-text border-warning-border",
  },
  evaluation_completed: {
    label: "Evaluation Completed",
    className: "bg-success-bg text-success-text border-success-border",
  },
  report_generated: {
    label: "Report Generated",
    className: "bg-info-bg text-info-text border-info-border font-medium",
  },
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  /**
   * Context determines which lookup table is used.
   * Defaults to "evaluation".
   */
  type?: "evaluation" | "test" | "instrument";
  status: EvaluationStatus | TestStatus | InstrumentStatus | string;
  size?: "sm" | "default";
  className?: string;
}

export function StatusBadge({
  type = "evaluation",
  status,
  size = "default",
  className,
}: StatusBadgeProps) {
  const normKey = String(status ?? "").toUpperCase();
  const normKeyLower = String(status ?? "").toLowerCase();

  let cfg: BadgeStyle;
  if (type === "instrument") {
    cfg = INSTRUMENT_STATUS[normKeyLower] ??
      INSTRUMENT_STATUS[status as string] ?? {
        label:
          INSTRUMENT_STATUS_LABELS[status as InstrumentStatus] ?? String(status),
        className: "bg-muted text-muted-foreground border-border",
      };
  } else if (type === "test") {
    cfg = TEST_STATUS[normKey] ??
      TEST_STATUS[status as string] ?? {
        label: String(status),
        className: "bg-muted text-muted-foreground border-border",
      };
  } else {
    cfg = EVAL_STATUS[normKey] ??
      EVAL_STATUS[status as string] ?? {
        label: String(status),
        className: "bg-muted text-muted-foreground border-border",
      };
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-medium",
        size === "sm"
          ? "px-1.5 py-0 text-[10px] tracking-wide uppercase"
          : "px-2 py-0.5 text-[11px]",
        cfg.className,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}

// ─── ResultBadge ─────────────────────────────────────────────────────────────
// AX-1 fix: icons ensure PASS/FAIL are distinguishable without color.

const RESULT_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ComponentProps<typeof HugeiconsIcon>["icon"] | null }
> = {
  PASS: {
    label: "Pass",
    className: "bg-success-bg text-success-text border-success-border",
    icon: CheckmarkCircle02Icon,
  },
  PASSED: {
    label: "Pass",
    className: "bg-success-bg text-success-text border-success-border",
    icon: CheckmarkCircle02Icon,
  },
  FAIL: {
    label: "Fail",
    className: "bg-error-bg text-error-text border-error-border",
    icon: Cancel01Icon,
  },
  FAILED: {
    label: "Fail",
    className: "bg-error-bg text-error-text border-error-border",
    icon: Cancel01Icon,
  },
  REVIEW: {
    label: "Review",
    className: "bg-warning-bg text-warning-text border-warning-border",
    icon: AlertCircleIcon,
  },
  REQUIRES_REVIEW: {
    label: "Requires Review",
    className: "bg-warning-bg text-warning-text border-warning-border",
    icon: AlertCircleIcon,
  },
  MANUAL_REVIEW: {
    label: "Manual Review",
    className: "bg-warning-bg text-warning-text border-warning-border",
    icon: AlertCircleIcon,
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-warning-bg text-warning-text border-warning-border",
    icon: Clock01Icon,
  },
  NOT_STARTED: {
    label: "Not Started",
    className: "bg-muted text-muted-foreground border-border",
    icon: MinusSignIcon,
  },
  INCOMPLETE: {
    label: "Incomplete",
    className: "bg-warning-bg text-warning-text border-warning-border",
    icon: AlertCircleIcon,
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-success-bg text-success-text border-success-border",
    icon: CheckmarkCircle02Icon,
  },
  NOT_APPLICABLE: {
    label: "N/A",
    className: "bg-muted text-muted-foreground border-border",
    icon: MinusSignIcon,
  },
};

interface ResultBadgeProps {
  result: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function ResultBadge({ result, size = "default", className }: ResultBadgeProps) {
  const normKey = String(result ?? "").toUpperCase().trim();
  const cfg = RESULT_CONFIG[normKey] ?? RESULT_CONFIG[result] ?? {
    label: String(result),
    className: "bg-muted text-muted-foreground border-border",
    icon: null,
  };

  const iconSize =
    size === "sm" ? "size-2.5" : size === "lg" ? "size-4" : "size-3";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-semibold uppercase tracking-wide",
        size === "sm" && "px-1.5 py-0 text-[10px]",
        size === "default" && "px-2 py-0.5 text-[11px]",
        size === "lg" && "px-3 py-1 text-xs",
        cfg.className,
        className
      )}
    >
      {cfg.icon && (
        <HugeiconsIcon
          icon={cfg.icon}
          strokeWidth={2}
          className={iconSize}
          aria-hidden="true"
        />
      )}
      {cfg.label}
    </span>
  );
}
