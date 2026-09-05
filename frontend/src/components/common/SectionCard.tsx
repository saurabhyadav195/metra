/**
 * METRA — components/common/SectionCard.tsx
 * Consistent card wrapper for page sections.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  action?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  description,
  children,
  actions,
  action,
  className,
  noPadding = false,
}: SectionCardProps) {
  const headerActions = actions || action;
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card shadow-sm",
        className
      )}
    >
      {(title || description || headerActions) && (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {headerActions && <div className="shrink-0">{headerActions}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "px-5 py-4"}>{children}</div>
    </div>
  );
}

/**
 * Labeled detail row for forms/detail views.
 */
interface DetailRowProps {
  label: string;
  value?: string | number | null | ReactNode;
  mono?: boolean;
  className?: string;
}

export function DetailRow({ label, value, mono, className }: DetailRowProps) {
  const isEmpty =
    value === undefined || value === null || value === "";

  return (
    <div
      className={cn(
        "py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-border/50 last:border-0",
        className
      )}
    >
      <dt className="text-xs font-medium text-muted-foreground py-0.5">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm sm:col-span-2 sm:mt-0",
          mono ? "font-mono text-xs" : "",
          isEmpty ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {isEmpty ? "—" : value}
      </dd>
    </div>
  );
}
