/**
 * METRA — components/common/Stepper.tsx
 * Horizontal progress stepper for the evaluation workflow.
 */

import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

interface Step {
  id: number;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 1-indexed
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav
      aria-label="Evaluation progress"
      className={cn("w-full", className)}
    >
      {/* Desktop: horizontal */}
      <ol className="hidden sm:flex items-center">
        {steps.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isLast = idx === steps.length - 1;

          return (
            <li key={step.id} className="flex flex-1 items-center">
              {/* Step marker */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    isCompleted &&
                      "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold",
                    isActive &&
                      "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-2 ring-primary/20",
                    !isCompleted && !isActive &&
                      "border-border/80 bg-muted/40 text-muted-foreground"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2.5}
                      className="size-3.5 text-emerald-600 dark:text-emerald-400"
                    />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium whitespace-nowrap",
                    isActive ? "text-primary font-bold" : isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors",
                    isCompleted ? "bg-emerald-500/40" : "bg-border/60"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact step indicator */}
      <div className="sm:hidden flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {currentStep}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {steps.find((s) => s.id === currentStep)?.label}
          </p>
          <p className="text-xs text-muted-foreground">
            Step {currentStep} of {steps.length}
          </p>
        </div>

        {/* Progress dots */}
        <div className="ml-auto flex gap-1" aria-hidden="true">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                step.id < currentStep
                  ? "bg-primary"
                  : step.id === currentStep
                  ? "bg-primary/60"
                  : "bg-border"
              )}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

export const EVALUATION_STEPS: Step[] = [
  { id: 1, label: "Setup" },
  { id: 2, label: "Test Selection" },
  { id: 3, label: "Execution" },
  { id: 4, label: "Results" },
  { id: 5, label: "Review" },
  { id: 6, label: "Report" },
];
