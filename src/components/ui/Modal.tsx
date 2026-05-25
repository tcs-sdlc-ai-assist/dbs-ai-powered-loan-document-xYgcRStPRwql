"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback fired when the modal should close */
  onClose: () => void;
  /** Modal title displayed in the header */
  title?: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Size variant controlling the max-width */
  size?: ModalSize;
  /** Whether clicking the overlay closes the modal */
  closeOnOverlayClick?: boolean;
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean;
  /** Whether to show the close (X) button in the header */
  showCloseButton?: boolean;
  /** Footer content (typically action buttons) */
  footer?: React.ReactNode;
  /** Additional class names for the modal panel */
  className?: string;
  /** Additional class names for the modal body */
  bodyClassName?: string;
  /** Modal body content */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

// ---------------------------------------------------------------------------
// CloseIcon Component
// ---------------------------------------------------------------------------

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
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

// ---------------------------------------------------------------------------
// Modal Component
// ---------------------------------------------------------------------------

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  footer,
  className,
  bodyClassName,
  children,
}) => {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Handle Escape key
  React.useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeOnEscape, onClose]);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Focus trap: focus the panel when opened
  React.useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={handleOverlayClick}
      />

      {/* Centering wrapper */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        onClick={handleOverlayClick}
      >
        {/* Modal Panel */}
        <div
          ref={panelRef}
          tabIndex={-1}
          className={cn(
            "relative w-full rounded-lg border border-gray-200 bg-white shadow-card-hover outline-none",
            SIZE_STYLES[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div className="min-w-0 flex-1">
                {title && (
                  <h3
                    id="modal-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-4 flex-shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--dbs-dark-blue)] focus:ring-offset-1"
                  aria-label="Close modal"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className={cn("px-6 py-4", bodyClassName)}>{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Modal.displayName = "Modal";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default Modal;
export { Modal };
export type { ModalProps, ModalSize };