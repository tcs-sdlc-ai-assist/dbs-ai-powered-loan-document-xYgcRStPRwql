"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { cn, formatDate } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/lib/constants";
import type { ApplicationStatusEnum } from "@prisma/client";
import type { ApiResponse } from "@/types/types";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatusHistoryEntry {
  id: string;
  status: ApplicationStatusEnum;
  previousStatus: ApplicationStatusEnum | null;
  changedBy: string;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StatusHistoryResponse {
  applicationId: string;
  currentStatus: ApplicationStatusEnum;
  history: StatusHistoryEntry[];
}

interface StatusTimelineProps {
  /** The application ID (human-readable, e.g. DBS-1001) */
  applicationId: string;
  /** Optional pre-fetched history data to avoid an additional API call */
  initialData?: StatusHistoryResponse | null;
  /** Optional class names for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Status Badge Variant
// ---------------------------------------------------------------------------

function getStatusBadgeVariant(
  status: ApplicationStatusEnum
): "success" | "danger" | "warning" | "info" | "default" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
    case "CANCELLED":
      return "danger";
    case "DRAFT":
    case "RETURNED":
    case "DOCUMENTS_PENDING":
      return "warning";
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "ANALYST_REVIEW":
      return "info";
    default:
      return "default";
  }
}

// ---------------------------------------------------------------------------
// Status Dot Color
// ---------------------------------------------------------------------------

function getStatusDotColor(status: ApplicationStatusEnum): string {
  switch (status) {
    case "APPROVED":
      return "bg-green-500";
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-500";
    case "DRAFT":
      return "bg-gray-400";
    case "SUBMITTED":
      return "bg-blue-500";
    case "UNDER_REVIEW":
      return "bg-indigo-500";
    case "DOCUMENTS_PENDING":
      return "bg-yellow-500";
    case "EXTRACTION_IN_PROGRESS":
    case "EXTRACTION_COMPLETE":
      return "bg-purple-500";
    case "VALIDATION_IN_PROGRESS":
    case "VALIDATION_COMPLETE":
      return "bg-orange-500";
    case "RECOMMENDATION_GENERATED":
      return "bg-cyan-500";
    case "ANALYST_REVIEW":
      return "bg-amber-500";
    case "RETURNED":
      return "bg-yellow-500";
    default:
      return "bg-gray-400";
  }
}

// ---------------------------------------------------------------------------
// Status Label
// ---------------------------------------------------------------------------

function getStatusLabel(status: ApplicationStatusEnum): string {
  const config = APPLICATION_STATUSES[status];
  return config ? config.label : status;
}

// ---------------------------------------------------------------------------
// Timeline Dot Icon
// ---------------------------------------------------------------------------

function TimelineDot({
  status,
  isFirst,
}: {
  status: ApplicationStatusEnum;
  isFirst: boolean;
}) {
  const dotColor = getStatusDotColor(status);

  if (isFirst) {
    return (
      <div
        className={cn(
          "relative z-10 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ring-4 ring-white",
          dotColor
        )}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-white" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative z-10 h-3 w-3 flex-shrink-0 rounded-full ring-4 ring-white",
        dotColor
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// StatusTimeline Component
// ---------------------------------------------------------------------------

export default function StatusTimeline({
  applicationId,
  initialData,
  className,
}: StatusTimelineProps) {
  const { data: session } = useSession();

  const [historyData, setHistoryData] =
    React.useState<StatusHistoryResponse | null>(initialData ?? null);
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch status history
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    if (initialData) {
      setHistoryData(initialData);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/status/${applicationId}/history`
        );

        const data: ApiResponse<StatusHistoryResponse> =
          await response.json();

        if (cancelled) return;

        if (!response.ok || !data.success) {
          const errorMessage =
            data.error ||
            `Failed to fetch status history (${response.status})`;
          setError(errorMessage);
          return;
        }

        if (data.data) {
          setHistoryData(data.data);
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [applicationId, initialData]);

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <Spinner size="md" label="Loading status history…" className="py-12" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error State
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className={cn("w-full", className)}>
        <Alert
          variant="error"
          title="Failed to Load Status History"
          dismissible
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty State
  // ---------------------------------------------------------------------------

  if (
    !historyData ||
    !historyData.history ||
    historyData.history.length === 0
  ) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-12 shadow-card">
          <svg
            className="mb-3 h-10 w-10 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-gray-500">
            No status history available for this application.
          </p>
        </div>
      </div>
    );
  }

  // Reverse the history so the most recent entry is at the top
  const sortedHistory = [...historyData.history].reverse();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn("w-full", className)}>
      {/* Current Status Header */}
      <div className="mb-6 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">
          Status Timeline
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">
            Current:
          </span>
          <Badge
            variant={getStatusBadgeVariant(historyData.currentStatus)}
            size="md"
          >
            {getStatusLabel(historyData.currentStatus)}
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {sortedHistory.map((entry, index) => {
          const isFirst = index === 0;
          const isLast = index === sortedHistory.length - 1;

          return (
            <div key={entry.id} className="relative flex gap-4">
              {/* Timeline Line & Dot */}
              <div className="flex flex-col items-center">
                <TimelineDot status={entry.status} isFirst={isFirst} />
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-gray-200" />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "min-w-0 flex-1 pb-6",
                  isLast && "pb-0"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg border bg-white p-4 transition-colors",
                    isFirst
                      ? "border-gray-300 shadow-card"
                      : "border-gray-200"
                  )}
                >
                  {/* Status & Timestamp Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getStatusBadgeVariant(entry.status)}
                        size="sm"
                      >
                        {getStatusLabel(entry.status)}
                      </Badge>
                      {entry.previousStatus && (
                        <span className="text-xs text-gray-400">
                          from{" "}
                          <span className="font-medium text-gray-500">
                            {getStatusLabel(entry.previousStatus)}
                          </span>
                        </span>
                      )}
                    </div>
                    <time
                      className="flex-shrink-0 text-xs text-gray-500"
                      dateTime={entry.createdAt}
                    >
                      {formatDate(entry.createdAt, "dd MMM yyyy, HH:mm:ss")}
                    </time>
                  </div>

                  {/* Comments */}
                  {entry.comments && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-700">
                      {entry.comments}
                    </p>
                  )}

                  {/* Changed By */}
                  {entry.changedBy && (
                    <div className="mt-2 flex items-center gap-1">
                      <svg
                        className="h-3.5 w-3.5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                      </svg>
                      <span className="text-xs text-gray-500">
                        Changed by:{" "}
                        <span className="font-medium text-gray-600">
                          {entry.changedBy}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Entries */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          {sortedHistory.length} status{" "}
          {sortedHistory.length === 1 ? "change" : "changes"} recorded
        </p>
      </div>
    </div>
  );
}

export { StatusTimeline };
export type { StatusTimelineProps, StatusHistoryEntry, StatusHistoryResponse };