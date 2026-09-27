/**
 * METRA — components/metrology/ToleranceBar.tsx
 * Visual tolerance gauge illustrating corrected error (Ec) relative to ±MPE limits.
 *
 * Example:
 * -MPE ------------ 0 ------------ +MPE
 * [ |-------------- ● --------------| ]
 */

import React from "react";

interface ToleranceBarProps {
  /** Corrected error value (Ec) */
  error: number;
  /** Maximum Permissible Error limit magnitude (MPE) */
  mpe: number;
  /** Unit of measurement (e.g., "g", "kg", "mg") */
  unit?: string;
  /** Size variant */
  size?: "sm" | "md";
  className?: string;
}

export function ToleranceBar({
  error,
  mpe,
  unit = "g",
  size = "md",
  className = "",
}: ToleranceBarProps) {
  // If mpe is 0 or invalid, render a simple neutral bar
  const validMpe = Math.abs(mpe) || 0.001;
  // Calculate relative position of error within [-MPE, +MPE] range mapped to [0%, 100%]
  // Clamp between -1.5 * MPE and +1.5 * MPE for display bounds
  const clampedError = Math.max(-1.5 * validMpe, Math.min(1.5 * validMpe, error));
  // 0 is at 50%, -MPE is at 16.67%, +MPE is at 83.33% if bounded [-1.5MPE, +1.5MPE]
  // Or simply map [-MPE, +MPE] to [10%, 90%] for clean padding
  const percentage = 50 + (clampedError / (1.2 * validMpe)) * 40;

  const isCompliant = Math.abs(error) <= validMpe;
  const dotColorClass = isCompliant
    ? "bg-emerald-600 border-white ring-emerald-500/30"
    : "bg-rose-600 border-white ring-rose-500/30";

  const isSmall = size === "sm";

  return (
    <div className={`w-full font-mono select-none ${className}`}>
      {/* Label Row */}
      <div className={`flex justify-between items-center text-muted-foreground ${isSmall ? "text-[10px]" : "text-xs"} mb-1`}>
        <span className="font-medium">-MPE (-{validMpe} {unit})</span>
        <span className="text-[11px] text-foreground font-semibold">0</span>
        <span className="font-medium">+MPE (+{validMpe} {unit})</span>
      </div>

      {/* Track & Marker */}
      <div className={`relative w-full rounded-full bg-muted border border-border overflow-hidden ${isSmall ? "h-2" : "h-3"}`}>
        {/* Safe Tolerance Zone [-MPE to +MPE] */}
        <div
          className="absolute top-0 bottom-0 bg-emerald-500/15 dark:bg-emerald-500/20 border-x border-emerald-500/30"
          style={{ left: "16.67%", right: "16.67%" }}
          title={`Compliant tolerance range: ±${validMpe} ${unit}`}
        />

        {/* Center Zero Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40 z-10"
          style={{ left: "50%" }}
        />

        {/* Error Pointer Dot */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 shadow-sm ring-2 z-20 transition-all duration-200 ${dotColorClass} ${
            isSmall ? "size-3" : "size-4"
          }`}
          style={{ left: `${percentage}%` }}
          title={`Ec = ${error > 0 ? `+${error}` : error} ${unit} (MPE = ±${validMpe} ${unit})`}
        />
      </div>

      {/* Value Sub-caption */}
      <div className="flex justify-between items-center mt-1 text-[11px]">
        <span className="text-muted-foreground">
          Ec: <strong className={isCompliant ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
            {error > 0 ? `+${error}` : error} {unit}
          </strong>
        </span>
        <span className={`text-[10px] font-sans font-medium px-1.5 py-0.2 rounded border ${
          isCompliant
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
            : "border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300"
        }`}>
          {isCompliant ? "Within MPE" : "Exceeds MPE"}
        </span>
      </div>
    </div>
  );
}
