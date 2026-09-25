/**
 * METRA — components/common/MetricCard.tsx
 *
 * Dashboard metric card.
 *
 * Fixes applied:
 * - CP-3: Removed `trend: any` prop — was only ever used with meaningless
 *   "real-time" / "verified" strings. Callers have been updated to remove it.
 * - AX-2: When onClick is provided, renders as a native <button> (via
 *   ButtonPrimitive from Base UI) instead of a div with role="button",
 *   giving proper keyboard semantics and focus management for free.
 * - Added visible focus ring on clickable cards.
 */

import type { ReactNode } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title?: string;
  /** Alias for `title` — prefer `title` for new code */
  label?: string;
  value: string | number;
  icon?: any;
  iconColor?: string;
  description?: string;
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  label,
  value,
  icon,
  iconColor = "text-primary",
  description,
  className,
  onClick,
}: MetricCardProps) {
  const displayTitle = title || label || "";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {displayTitle}
          </p>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">
            {value}
          </p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        {icon && (
          <div className={cn("shrink-0 rounded-md bg-accent p-2", iconColor)}>
            {typeof icon === "function" ||
            (typeof icon === "object" && "name" in icon) ? (
              <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-5" />
            ) : (
              icon
            )}
          </div>
        )}
      </div>
    </>
  );

  // AX-2 fix: when clickable, use a native button element via Base UI primitive
  if (onClick) {
    return (
      <ButtonPrimitive
        className={cn(
          "w-full text-left rounded-lg border border-border bg-card p-4 shadow-sm",
          "cursor-pointer transition-shadow hover:shadow-md",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          className
        )}
        onClick={onClick}
      >
        {content}
      </ButtonPrimitive>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      {content}
    </div>
  );
}

// ─── MetricGrid ───────────────────────────────────────────────────────────────

interface MetricGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricGrid({ children, columns = 4, className }: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
