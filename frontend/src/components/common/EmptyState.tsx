/**
 * METRA — components/common/EmptyState.tsx
 *
 * Standardized states for data-driven pages.
 *
 * Exports:
 *   EmptyState   – no records / no results / permission / workflow-not-started
 *   LoadingState – accessible spinner with role="status" / aria-live
 *   ErrorState   – error with Hugeicons (replaces raw SVG)
 *
 * Accessibility: AX-5 fix — LoadingState gets role="status" + aria-live="polite"
 * Component fix: CP-5 — ErrorState uses Hugeicons instead of raw SVG
 */

import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── EmptyState ───────────────────────────────────────────────────────────────

/**
 * variant controls the visual treatment:
 * - "no-data"    : grey — no records exist yet (first-time state)
 * - "no-results" : amber-tinted — search/filter returned nothing (user-driven)
 * - "no-access"  : red-tinted — insufficient permissions
 * - "not-started": blue-tinted — workflow has not started yet
 */
export type EmptyStateVariant = "no-data" | "no-results" | "no-access" | "not-started";

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  title: string;
  description?: string;
  action?: ReactNode;
  /** Controls visual framing of the reason for the empty state */
  variant?: EmptyStateVariant;
  className?: string;
}

const VARIANT_ICON_CLASS: Record<EmptyStateVariant, string> = {
  "no-data":     "bg-muted text-muted-foreground",
  "no-results":  "bg-warning-bg text-warning-text",
  "no-access":   "bg-error-bg text-error-text",
  "not-started": "bg-info-bg text-info-text",
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "no-data",
  className,
}: EmptyStateProps) {
  const iconClass = VARIANT_ICON_CLASS[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className={cn("mb-4 rounded-full p-4", iconClass)}>
          <HugeiconsIcon
            icon={icon}
            strokeWidth={1.5}
            className="size-8"
            aria-hidden="true"
          />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── LoadingState ─────────────────────────────────────────────────────────────
// AX-5 fix: role="status" + aria-live="polite"

export function LoadingState({
  message = "Loading…",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        "flex flex-col items-center justify-center py-16 gap-3",
        className
      )}
    >
      <div
        className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── ErrorState ───────────────────────────────────────────────────────────────
// CP-5 fix: Uses HugeiconsIcon instead of raw SVG path

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
      role="alert"
    >
      <div className="mb-4 rounded-full bg-error-bg p-4">
        <HugeiconsIcon
          icon={AlertCircleIcon}
          strokeWidth={1.5}
          className="size-8 text-error-text"
          aria-hidden="true"
        />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4"
        >
          Try again
        </Button>
      )}
    </div>
  );
}
