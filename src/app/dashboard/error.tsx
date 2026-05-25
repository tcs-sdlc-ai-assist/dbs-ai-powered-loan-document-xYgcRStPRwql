"use client";

import React from "react";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function ArrowPathIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Error Boundary Component
// ---------------------------------------------------------------------------

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error details for debugging
    console.error("[Dashboard Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      <Alert variant="error" title="Something went wrong" showIcon>
        An unexpected error occurred while loading the dashboard. Please try
        again or contact support if the problem persists.
      </Alert>

      {/* Error Details Card */}
      <Card>
        <CardBody>
          <div className="flex flex-col items-center justify-center py-12">
            <ExclamationTriangleIcon className="mb-4 h-16 w-16 text-red-400" />

            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Dashboard Error
            </h2>

            <p className="mb-6 max-w-md text-center text-sm text-gray-500">
              We encountered an error while loading this page. This could be a
              temporary issue. Please try refreshing the page or navigating back
              to the dashboard.
            </p>

            {/* Error Message */}
            {error.message && (
              <div className="mb-6 w-full max-w-lg rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-red-700">
                  Error Details
                </p>
                <p className="break-words text-sm text-red-800">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="mt-2 text-xs text-red-600">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  window.location.href = "/dashboard";
                }}
                icon={<HomeIcon className="h-4 w-4" />}
                iconPosition="left"
              >
                Go to Dashboard
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={reset}
                icon={<ArrowPathIcon className="h-4 w-4" />}
                iconPosition="left"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          If this error persists, please contact your system administrator.
        </p>
      </div>
    </div>
  );
}