"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CardVariant = "default" | "outlined" | "elevated";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children?: React.ReactNode;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<CardVariant, string> = {
  default: "rounded-lg border border-gray-200 bg-white shadow-card",
  outlined: "rounded-lg border border-gray-300 bg-white",
  elevated: "rounded-lg border border-gray-100 bg-white shadow-card-hover",
};

// ---------------------------------------------------------------------------
// Card Component
// ---------------------------------------------------------------------------

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(VARIANT_STYLES[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// ---------------------------------------------------------------------------
// CardHeader Component
// ---------------------------------------------------------------------------

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("border-b border-gray-200 px-6 py-4", className)}
        {...props}
      >
        {(title || subtitle || action) ? (
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
            {action && (
              <div className="ml-4 flex-shrink-0">{action}</div>
            )}
          </div>
        ) : null}
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

// ---------------------------------------------------------------------------
// CardBody Component
// ---------------------------------------------------------------------------

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("px-6 py-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = "CardBody";

// ---------------------------------------------------------------------------
// CardFooter Component
// ---------------------------------------------------------------------------

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("border-t border-gray-200 px-6 py-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default Card;
export { Card, CardHeader, CardBody, CardFooter };
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps, CardVariant };