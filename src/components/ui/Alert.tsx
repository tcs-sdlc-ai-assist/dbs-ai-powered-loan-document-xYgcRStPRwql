"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertVariant = "success" | "warning" | "error" | "info";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant controlling colors and default icon */
  variant?: AlertVariant;
  /** Optional title displayed in bold above the description */
  title?: string;
  /** Whether the alert can be dismissed via a close button */
  dismissible?: boolean;
  /** Callback fired when the dismiss button is clicked */
  onDismiss?: () => void;
  /** Optional custom icon element rendered to the left */
  icon?: React.ReactNode;
  /** Whether to show the default icon for the variant */
  showIcon?: boolean;
  /** Alert body content (description) */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<AlertVariant, string> = {
  success: "border-green-300 bg-green-50 text-green-800",
  warning: "border-yellow-300 bg-yellow-50 text-yellow-800",
  error: "border-red-300 bg-red-50 text-red-800",
  info: "border-blue-300 bg-blue-50 text-blue-800",
};

const VARIANT_ICON_STYLES: Record<AlertVariant, string> = {
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
  info: "text-blue-500",
};

const VARIANT_CLOSE_STYLES: Record<AlertVariant, string> = {
  success: "text-green-500 hover:bg-green-100 focus:ring-green-400",
  warning: "text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-400",
  error: "text-red-500 hover:bg-red-100 focus:ring-red-400",
  info: "text-blue-500 hover:bg-blue-100 focus:ring-blue-400",
};

// ---------------------------------------------------------------------------
// Default Icons
// ---------------------------------------------------------------------------

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

const DEFAULT_ICONS: Record<AlertVariant, React.FC<{ className?: string }>> = {
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

// ---------------------------------------------------------------------------
// Alert Component
// ---------------------------------------------------------------------------

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = "info",
      title,
      dismissible = false,
      onDismiss,
      icon,
      showIcon = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [dismissed, setDismissed] = React.useState(false);

    const handleDismiss = React.useCallback(() => {
      setDismissed(true);
      if (onDismiss) {
        onDismiss();
      }
    }, [onDismiss]);

    if (dismissed) {
      return null;
    }

    const DefaultIcon = DEFAULT_ICONS[variant];
    const iconElement = icon ?? (showIcon ? <DefaultIcon className={VARIANT_ICON_STYLES[variant]} /> : null);

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "rounded-md border p-4",
          VARIANT_STYLES[variant],
          className
        )}
        {...props}
      >
        <div className="flex">
          {/* Icon */}
          {iconElement && (
            <div className="flex-shrink-0">{iconElement}</div>
          )}

          {/* Content */}
          <div className={cn("min-w-0 flex-1", iconElement ? "ml-3" : "")}>
            {title && (
              <h3 className="text-sm font-semibold">{title}</h3>
            )}
            {children && (
              <div className={cn("text-sm", title && "mt-1")}>
                {children}
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          {dismissible && (
            <div className="ml-auto flex-shrink-0 pl-3">
              <button
                type="button"
                onClick={handleDismiss}
                className={cn(
                  "inline-flex rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                  VARIANT_CLOSE_STYLES[variant]
                )}
                aria-label="Dismiss alert"
              >
                <CloseIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default Alert;
export { Alert };
export type { AlertProps, AlertVariant };