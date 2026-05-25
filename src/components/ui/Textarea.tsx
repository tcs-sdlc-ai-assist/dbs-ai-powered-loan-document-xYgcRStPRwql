"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TextareaSize = "sm" | "md" | "lg";
type TextareaResize = "none" | "vertical" | "horizontal" | "both";

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  /** Textarea label displayed above the field */
  label?: string;
  /** Size variant */
  size?: TextareaSize;
  /** Error message to display below the textarea */
  error?: string;
  /** Helper text displayed below the textarea (hidden when error is present) */
  helperText?: string;
  /** Whether the field is required (shows a red asterisk next to the label) */
  required?: boolean;
  /** Resize behavior */
  resize?: TextareaResize;
  /** Maximum character count — when provided, a character counter is displayed */
  maxCharacters?: number;
  /** Whether to show the character count (requires maxCharacters or maxLength) */
  showCharacterCount?: boolean;
  /** Additional class names for the outer wrapper */
  wrapperClassName?: string;
  /** Additional class names for the label */
  labelClassName?: string;
  /** Additional class names for the textarea element */
  textareaClassName?: string;
}

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<TextareaSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-3 text-base",
};

// ---------------------------------------------------------------------------
// Resize Styles
// ---------------------------------------------------------------------------

const RESIZE_STYLES: Record<TextareaResize, string> = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

// ---------------------------------------------------------------------------
// Textarea Component
// ---------------------------------------------------------------------------

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      size = "md",
      error,
      helperText,
      required = false,
      resize = "vertical",
      maxCharacters,
      showCharacterCount = false,
      wrapperClassName,
      labelClassName,
      textareaClassName,
      disabled,
      id,
      className,
      value,
      defaultValue,
      onChange,
      maxLength,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || props.name || undefined;
    const hasError = !!error;

    // Determine the effective max for character counting
    const effectiveMax = maxCharacters ?? maxLength;

    // Track current character count for display
    const [charCount, setCharCount] = React.useState<number>(() => {
      if (value !== undefined && value !== null) {
        return String(value).length;
      }
      if (defaultValue !== undefined && defaultValue !== null) {
        return String(defaultValue).length;
      }
      return 0;
    });

    // Update character count when controlled value changes
    React.useEffect(() => {
      if (value !== undefined && value !== null) {
        setCharCount(String(value).length);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      if (onChange) {
        onChange(e);
      }
    };

    const shouldShowCount = showCharacterCount || (maxCharacters !== undefined);
    const isOverLimit = effectiveMax !== undefined && charCount > effectiveMax;

    return (
      <div className={cn("w-full", wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
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

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          maxLength={maxLength}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={
            hasError
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          aria-required={required ? "true" : undefined}
          className={cn(
            "block w-full rounded-md border bg-white font-normal text-gray-900 outline-none transition-colors",
            SIZE_STYLES[size],
            RESIZE_STYLES[resize],
            hasError
              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-gray-300 focus:border-[var(--dbs-dark-blue)] focus:ring-2 focus:ring-[var(--dbs-dark-blue)]/15",
            disabled && "cursor-not-allowed bg-gray-100 text-gray-400",
            textareaClassName,
            className
          )}
          {...props}
        />

        {/* Bottom row: error/helper on left, character count on right */}
        <div className="mt-1 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {/* Error Message */}
            {hasError && (
              <p
                id={`${textareaId}-error`}
                className="text-xs text-red-600"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Helper Text */}
            {!hasError && helperText && (
              <p
                id={`${textareaId}-helper`}
                className="text-xs text-gray-500"
              >
                {helperText}
              </p>
            )}
          </div>

          {/* Character Count */}
          {shouldShowCount && (
            <p
              className={cn(
                "ml-2 flex-shrink-0 text-xs",
                isOverLimit ? "text-red-600" : "text-gray-500"
              )}
            >
              {charCount}
              {effectiveMax !== undefined && `/${effectiveMax}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
export { Textarea };
export type { TextareaProps, TextareaSize, TextareaResize };