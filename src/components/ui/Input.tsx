"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InputType = "text" | "number" | "email" | "password" | "search" | "tel" | "url";
type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Input label displayed above the field */
  label?: string;
  /** Input type */
  type?: InputType;
  /** Size variant */
  size?: InputSize;
  /** Error message to display below the input */
  error?: string;
  /** Helper text displayed below the input (hidden when error is present) */
  helperText?: string;
  /** Whether the field is required (shows a red asterisk next to the label) */
  required?: boolean;
  /** Additional class names for the outer wrapper */
  wrapperClassName?: string;
  /** Additional class names for the label */
  labelClassName?: string;
  /** Additional class names for the input element */
  inputClassName?: string;
  /** Left icon or adornment */
  leftAdornment?: React.ReactNode;
  /** Right icon or adornment */
  rightAdornment?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<InputSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-3 text-base",
};

// ---------------------------------------------------------------------------
// Input Component
// ---------------------------------------------------------------------------

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      type = "text",
      size = "md",
      error,
      helperText,
      required = false,
      wrapperClassName,
      labelClassName,
      inputClassName,
      leftAdornment,
      rightAdornment,
      disabled,
      id,
      className,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name || undefined;
    const hasError = !!error;

    return (
      <div className={cn("w-full", wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "mb-1 block text-sm font-medium text-gray-700",
              disabled && "text-gray-400",
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Input Wrapper */}
        <div className="relative">
          {/* Left Adornment */}
          {leftAdornment && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-400">{leftAdornment}</span>
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={
              hasError
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            aria-required={required ? "true" : undefined}
            className={cn(
              "block w-full rounded-md border bg-white font-normal text-gray-900 outline-none transition-colors",
              SIZE_STYLES[size],
              hasError
                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-gray-300 focus:border-[var(--dbs-dark-blue)] focus:ring-2 focus:ring-[var(--dbs-dark-blue)]/15",
              disabled && "cursor-not-allowed bg-gray-100 text-gray-400",
              leftAdornment && "pl-10",
              rightAdornment && "pr-10",
              inputClassName,
              className
            )}
            {...props}
          />

          {/* Right Adornment */}
          {rightAdornment && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-400">{rightAdornment}</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {hasError && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-xs text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {!hasError && helperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-1 text-xs text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
export { Input };
export type { InputProps, InputType, InputSize };