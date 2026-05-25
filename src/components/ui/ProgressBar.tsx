"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProgressBarSize = "sm" | "md" | "lg";
type ProgressBarVariant = "default" | "success" | "warning" | "danger" | "info";

interface ProgressBarStep {
  /** Unique key for the step */
  key: string;
  /** Display label for the step */
  label: string;
  /** Whether this step is completed */
  completed: boolean;
  /** Whether this step is currently active */
  active?: boolean;
  /** Optional variant override for this step's segment */
  variant?: ProgressBarVariant;
}

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current progress value (0–100) */
  value?: number;
  /** Maximum value (defaults to 100) */
  max?: number;
  /** Size variant controlling the bar height */
  size?: ProgressBarSize;
  /** Color variant for the filled portion */
  variant?: ProgressBarVariant;
  /** Whether to display the percentage label */
  showLabel?: boolean;
  /** Custom label to display instead of the percentage */
  label?: string;
  /** Label position relative to the bar */
  labelPosition?: "top" | "right" | "inside";
  /** Whether to show an animated stripe pattern */
  animated?: boolean;
  /** Optional step-based progress configuration */
  steps?: ProgressBarStep[];
  /** Whether to show step labels below the bar */
  showStepLabels?: boolean;
  /** Additional class names for the track (background) */
  trackClassName?: string;
  /** Additional class names for the filled bar */
  barClassName?: string;
  /** Additional class names for the label */
  labelClassName?: string;
}

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<ProgressBarSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const LABEL_SIZE_STYLES: Record<ProgressBarSize, string> = {
  sm: "text-2xs",
  md: "text-xs",
  lg: "text-sm",
};

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<ProgressBarVariant, string> = {
  default: "bg-[var(--dbs-dark-blue)]",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
};

const VARIANT_STEP_ACTIVE_STYLES: Record<ProgressBarVariant, string> = {
  default: "bg-[var(--dbs-dark-blue)]/70",
  success: "bg-green-400",
  warning: "bg-yellow-400",
  danger: "bg-red-400",
  info: "bg-blue-400",
};

const VARIANT_TEXT_STYLES: Record<ProgressBarVariant, string> = {
  default: "text-[var(--dbs-dark-blue)]",
  success: "text-green-700",
  warning: "text-yellow-700",
  danger: "text-red-700",
  info: "text-blue-700",
};

// ---------------------------------------------------------------------------
// Step Dot Component
// ---------------------------------------------------------------------------

function StepDot({
  completed,
  active,
  variant = "default",
  size,
}: {
  completed: boolean;
  active?: boolean;
  variant?: ProgressBarVariant;
  size: ProgressBarSize;
}) {
  const dotSize: Record<ProgressBarSize, string> = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  if (completed) {
    return (
      <div
        className={cn(
          "flex-shrink-0 rounded-full",
          dotSize[size],
          VARIANT_STYLES[variant]
        )}
      />
    );
  }

  if (active) {
    return (
      <div
        className={cn(
          "flex-shrink-0 rounded-full border-2",
          dotSize[size],
          variant === "default"
            ? "border-[var(--dbs-dark-blue)] bg-white"
            : variant === "success"
              ? "border-green-500 bg-white"
              : variant === "warning"
                ? "border-yellow-500 bg-white"
                : variant === "danger"
                  ? "border-red-500 bg-white"
                  : "border-blue-500 bg-white"
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex-shrink-0 rounded-full border-2 border-gray-300 bg-white",
        dotSize[size]
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// ProgressBar Component
// ---------------------------------------------------------------------------

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value = 0,
      max = 100,
      size = "md",
      variant = "default",
      showLabel = false,
      label,
      labelPosition = "top",
      animated = false,
      steps,
      showStepLabels = true,
      trackClassName,
      barClassName,
      labelClassName,
      className,
      ...props
    },
    ref
  ) => {
    // Clamp value between 0 and max
    const clampedValue = Math.min(Math.max(0, value), max);
    const percentage = max > 0 ? Math.round((clampedValue / max) * 100) : 0;

    // If steps are provided, calculate progress from steps
    const hasSteps = steps && steps.length > 0;
    let stepPercentage = percentage;

    if (hasSteps) {
      const completedCount = steps.filter((s) => s.completed).length;
      const activeCount = steps.filter((s) => s.active && !s.completed).length;
      const totalSteps = steps.length;
      // Active steps count as half-complete for visual progress
      stepPercentage =
        totalSteps > 0
          ? Math.round(
              ((completedCount + activeCount * 0.5) / totalSteps) * 100
            )
          : 0;
    }

    const displayPercentage = hasSteps ? stepPercentage : percentage;
    const displayLabel = label ?? `${displayPercentage}%`;

    // Render step-based progress bar
    if (hasSteps) {
      return (
        <div
          ref={ref}
          className={cn("w-full", className)}
          role="progressbar"
          aria-valuenow={displayPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ?? `${displayPercentage}% complete`}
          {...props}
        >
          {/* Top label */}
          {showLabel && labelPosition === "top" && (
            <div className="mb-1.5 flex items-center justify-between">
              <span
                className={cn(
                  "font-medium",
                  LABEL_SIZE_STYLES[size],
                  VARIANT_TEXT_STYLES[variant],
                  labelClassName
                )}
              >
                {displayLabel}
              </span>
              <span
                className={cn(
                  "text-gray-500",
                  LABEL_SIZE_STYLES[size]
                )}
              >
                {steps.filter((s) => s.completed).length} of {steps.length}{" "}
                steps
              </span>
            </div>
          )}

          {/* Step track */}
          <div className="relative flex items-center">
            {steps.map((step, index) => {
              const stepVariant = step.variant ?? variant;
              const isLast = index === steps.length - 1;

              return (
                <React.Fragment key={step.key}>
                  {/* Step dot */}
                  <StepDot
                    completed={step.completed}
                    active={step.active}
                    variant={stepVariant}
                    size={size}
                  />

                  {/* Connector line between steps */}
                  {!isLast && (
                    <div
                      className={cn(
                        "flex-1",
                        SIZE_STYLES["sm"],
                        "rounded-full mx-1",
                        step.completed
                          ? VARIANT_STYLES[stepVariant]
                          : "bg-gray-200"
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Right label */}
            {showLabel && labelPosition === "right" && (
              <span
                className={cn(
                  "ml-3 flex-shrink-0 font-medium",
                  LABEL_SIZE_STYLES[size],
                  VARIANT_TEXT_STYLES[variant],
                  labelClassName
                )}
              >
                {displayLabel}
              </span>
            )}
          </div>

          {/* Step labels */}
          {showStepLabels && (
            <div className="mt-1.5 flex items-start">
              {steps.map((step, index) => {
                const isLast = index === steps.length - 1;

                return (
                  <React.Fragment key={`label-${step.key}`}>
                    <span
                      className={cn(
                        "flex-shrink-0 text-center",
                        LABEL_SIZE_STYLES[size],
                        step.completed
                          ? "font-medium text-gray-900"
                          : step.active
                            ? "font-medium text-gray-700"
                            : "text-gray-400"
                      )}
                      style={{
                        width: size === "sm" ? "0.5rem" : size === "md" ? "0.75rem" : "1rem",
                      }}
                      title={step.label}
                    />
                    {!isLast && <div className="mx-1 flex-1" />}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Full-width step labels (alternative layout) */}
          {showStepLabels && (
            <div className="mt-2 flex justify-between">
              {steps.map((step) => (
                <span
                  key={`full-label-${step.key}`}
                  className={cn(
                    "text-center",
                    LABEL_SIZE_STYLES[size],
                    step.completed
                      ? "font-medium text-gray-900"
                      : step.active
                        ? "font-medium text-gray-700"
                        : "text-gray-400"
                  )}
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                  title={step.label}
                >
                  {step.label}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Render standard progress bar (non-step-based)
    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        {/* Top label */}
        {showLabel && labelPosition === "top" && (
          <div className="mb-1.5 flex items-center justify-between">
            <span
              className={cn(
                "font-medium",
                LABEL_SIZE_STYLES[size],
                VARIANT_TEXT_STYLES[variant],
                labelClassName
              )}
            >
              {displayLabel}
            </span>
          </div>
        )}

        <div className="flex items-center">
          {/* Track */}
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-full bg-gray-200",
              SIZE_STYLES[size],
              trackClassName
            )}
            role="progressbar"
            aria-valuenow={clampedValue}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={label ?? `${displayPercentage}% complete`}
          >
            {/* Filled bar */}
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                VARIANT_STYLES[variant],
                animated &&
                  "bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] animate-[progress-stripes_1s_linear_infinite]",
                barClassName
              )}
              style={{ width: `${displayPercentage}%` }}
            >
              {/* Inside label */}
              {showLabel && labelPosition === "inside" && size === "lg" && (
                <span
                  className={cn(
                    "flex h-full items-center justify-center text-2xs font-semibold text-white",
                    labelClassName
                  )}
                >
                  {displayPercentage > 10 ? displayLabel : ""}
                </span>
              )}
            </div>
          </div>

          {/* Right label */}
          {showLabel && labelPosition === "right" && (
            <span
              className={cn(
                "ml-3 flex-shrink-0 font-medium",
                LABEL_SIZE_STYLES[size],
                VARIANT_TEXT_STYLES[variant],
                labelClassName
              )}
            >
              {displayLabel}
            </span>
          )}
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default ProgressBar;
export { ProgressBar };
export type {
  ProgressBarProps,
  ProgressBarStep,
  ProgressBarSize,
  ProgressBarVariant,
};