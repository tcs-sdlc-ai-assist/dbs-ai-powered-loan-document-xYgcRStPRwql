"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SelectSize = "sm" | "md" | "lg";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Select label displayed above the field */
  label?: string;
  /** Size variant */
  size?: SelectSize;
  /** Error message to display below the select */
  error?: string;
  /** Helper text displayed below the select (hidden when error is present) */
  helperText?: string;
  /** Whether the field is required (shows a red asterisk next to the label) */
  required?: boolean;
  /** Placeholder text shown as the first disabled option */
  placeholder?: string;
  /** Array of options to render */
  options: SelectOption[];
  /** Additional class names for the outer wrapper */
  wrapperClassName?: string;
  /** Additional class names for the label */
  labelClassName?: string;
  /** Additional class names for the select element */
  selectClassName?: string;
}

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<SelectSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-3 text-base",
};

// ---------------------------------------------------------------------------
// Select Component
// ---------------------------------------------------------------------------

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      size = "md",
      error,
      helperText,
      required = false,
      placeholder,
      options,
      wrapperClassName,
      labelClassName,
      selectClassName,
      disabled,
      id,
      className,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name || undefined;
    const hasError = !!error;

    return (
      <div className={cn("w-full", wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
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

        {/* Select */}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={
            hasError
              ? `${selectId}-error`
              : helperText
                ? `${selectId}-helper`
                : undefined
          }
          aria-required={required ? "true" : undefined}
          className={cn(
            "block w-full appearance-none rounded-md border bg-white font-normal text-gray-900 outline-none transition-colors",
            SIZE_STYLES[size],
            hasError
              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-gray-300 focus:border-[var(--dbs-dark-blue)] focus:ring-2 focus:ring-[var(--dbs-dark-blue)]/15",
            disabled && "cursor-not-allowed bg-gray-100 text-gray-400",
            "pr-10",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat",
            selectClassName,
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Error Message */}
        {hasError && (
          <p
            id={`${selectId}-error`}
            className="mt-1 text-xs text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {!hasError && helperText && (
          <p
            id={`${selectId}-helper`}
            className="mt-1 text-xs text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
export { Select };
export type { SelectProps, SelectOption, SelectSize };