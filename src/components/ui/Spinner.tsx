"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size variant controlling the spinner dimensions */
  size?: SpinnerSize;
  /** Optional label text displayed below the spinner */
  label?: string;
  /** Additional class names for the spinner SVG */
  spinnerClassName?: string;
  /** Additional class names for the label text */
  labelClassName?: string;
}

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const LABEL_SIZE_STYLES: Record<SpinnerSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

// ---------------------------------------------------------------------------
// Spinner Component
// ---------------------------------------------------------------------------

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = "md",
      label,
      spinnerClassName,
      labelClassName,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label={label || "Loading"}
        className={cn(
          "flex flex-col items-center justify-center",
          className
        )}
        {...props}
      >
        <svg
          className={cn(
            "animate-spin text-gray-400",
            SIZE_STYLES[size],
            spinnerClassName
          )}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {label && (
          <p
            className={cn(
              "mt-2 text-gray-500",
              LABEL_SIZE_STYLES[size],
              labelClassName
            )}
          >
            {label}
          </p>
        )}
        <span className="sr-only">{label || "Loading"}</span>
      </div>
    );
  }
);

Spinner.displayName = "Spinner";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default Spinner;
export { Spinner };
export type { SpinnerProps, SpinnerSize };