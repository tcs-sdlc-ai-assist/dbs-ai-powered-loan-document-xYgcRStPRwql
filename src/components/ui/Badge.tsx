"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Optional custom color classes that override the variant */
  colorClass?: string;
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-2xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

// ---------------------------------------------------------------------------
// Badge Component
// ---------------------------------------------------------------------------

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = "default",
      size = "md",
      colorClass,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const variantClass = colorClass || VARIANT_STYLES[variant];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          variantClass,
          SIZE_STYLES[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
export { Badge };
export type { BadgeProps, BadgeVariant, BadgeSize };