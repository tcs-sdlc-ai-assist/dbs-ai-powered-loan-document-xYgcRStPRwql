"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: [
    "text-white focus:ring-2 focus:ring-offset-2",
    "bg-[var(--dbs-red)] hover:bg-[var(--dbs-red-600)] focus:ring-[var(--dbs-red-500)]",
  ].join(" "),
  secondary: [
    "border border-gray-300 bg-white text-gray-700",
    "hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-[var(--dbs-dark-blue)]",
  ].join(" "),
  danger: [
    "text-white bg-red-600 hover:bg-red-700",
    "focus:ring-2 focus:ring-offset-2 focus:ring-red-500",
  ].join(" "),
  ghost: [
    "bg-transparent text-gray-700",
    "hover:bg-gray-100 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400",
  ].join(" "),
};

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

// ---------------------------------------------------------------------------
// Spinner Component
// ---------------------------------------------------------------------------

function Spinner({ size }: { size: ButtonSize }) {
  const spinnerSize: Record<ButtonSize, string> = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <svg
      className={cn("animate-spin", spinnerSize[size])}
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
  );
}

// ---------------------------------------------------------------------------
// Button Component
// ---------------------------------------------------------------------------

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      disabled,
      className,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none",
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          isDisabled && "cursor-not-allowed opacity-50",
          className
        )}
        {...props}
      >
        {loading && iconPosition === "left" && (
          <span className="mr-2">
            <Spinner size={size} />
          </span>
        )}

        {!loading && icon && iconPosition === "left" && (
          <span className="mr-2 inline-flex items-center">{icon}</span>
        )}

        {children}

        {!loading && icon && iconPosition === "right" && (
          <span className="ml-2 inline-flex items-center">{icon}</span>
        )}

        {loading && iconPosition === "right" && (
          <span className="ml-2">
            <Spinner size={size} />
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
export type { ButtonProps, ButtonVariant, ButtonSize };