/**
 * METRA — components/common/MetricCard.tsx
 * Dashboard metric card displaying a labeled numeric value with optional icon and trend.
 */

import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title?: string;
  label?: string;
  value: string | number;
  icon?: any;
  iconColor?: string;
  description?: string;
  trend?: any;
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
  trend,
  className,
  onClick,
}: MetricCardProps) {
  const displayTitle = title || label || "";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        onClick && "cursor-pointer transition-shadow hover:shadow-md",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
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
          {trend && (
            <p
              className={cn(
                "mt-1 text-[11px] font-medium text-muted-foreground"
              )}
            >
              {typeof trend === "object" ? trend.value : String(trend)}
            </p>
          )}
        </div>

        {icon && (
          <div className={cn("shrink-0 rounded-md bg-accent p-2", iconColor)}>
            {typeof icon === "function" || (typeof icon === "object" && "name" in icon) ? (
              <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-5" />
            ) : (
              icon
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
