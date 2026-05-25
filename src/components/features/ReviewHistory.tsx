"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { cn, formatDate } from "@/lib/utils";
import { RECOMMENDATION_TYPES } from "@/lib/constants";
import type { RecommendationType } from "@prisma/client";
import type { ApiResponse } from "@/types/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewerInfo {
  id: string;
  name: string;
  email: string;
}

interface ReviewEntry {
  id: string;
  applicationId?: string;
  comment: string;
  isOverride: boolean;
  overrideRecommendation: RecommendationType | null;
  justification: string | null;
  reviewer: ReviewerInfo;
  createdAt: string;
  updatedAt: string;
}

interface ReviewHistoryProps {
  /** The application ID (human-readable, e.g. DBS-1001) */
  applicationId: string;
  /** Optional pre-fetched review data to avoid an additional API call */
  initialData?: ReviewEntry[] | null;
  /** Optional class names for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRecommendationBadgeVariant(
  recommendation: RecommendationType
): "success" | "danger" | "warning" | "info" {
  switch (recommendation) {
    case "APPROVE":
      return "success";
    case "REJECT":
      return "danger";
    case "REFER_TO_ANALYST":
      return "warning";
    case "REQUEST_MORE_INFO":
      return "info";
    default:
      return "info";
  }
}

function getRecommendationLabel(recommendation: RecommendationType): string {
  const config = RECOMMENDATION_TYPES[recommendation];
  return config ? config.label : recommendation;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function UserIcon({ className }: { className?: string }) {
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
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
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
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
      />
    </svg>
  );
}

function ShieldExclamationIcon({ className }: { className?: string }) {
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
        d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zm0 13.036h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3.5 w-3.5", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
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

function DocumentIcon({ className }: { className?: string }) {
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
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ReviewEntryCard Component
// ---------------------------------------------------------------------------

function ReviewEntryCard({ entry }: { entry: ReviewEntry }) {
  const isOverride = entry.isOverride;

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-5 transition-colors",
        isOverride
          ? "border-amber-200 shadow-card"
          : "border-gray-200 shadow-card"
      )}
    >
      {/* Header: Reviewer + Timestamp + Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Avatar / Icon */}
          <div
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
              isOverride
                ? "bg-amber-100 text-amber-600"
                : "bg-blue-100 text-blue-600"
            )}
          >
            {isOverride ? (
              <ShieldExclamationIcon className="h-4 w-4" />
            ) : (
              <UserIcon className="h-4 w-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">
                {entry.reviewer.name}
              </p>
              <Badge
                variant={isOverride ? "warning" : "info"}
                size="sm"
              >
                {isOverride ? "Override" : "Review"}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">{entry.reviewer.email}</p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ClockIcon className="text-gray-400" />
          <time dateTime={entry.createdAt}>
            {formatDate(entry.createdAt, "dd MMM yyyy, HH:mm:ss")}
          </time>
        </div>
      </div>

      {/* Override Details */}
      {isOverride && entry.overrideRecommendation && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldExclamationIcon className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Override Decision
            </p>
          </div>

          {/* Override Recommendation Badge */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-amber-700">
              New Recommendation:
            </span>
            <Badge
              variant={getRecommendationBadgeVariant(
                entry.overrideRecommendation
              )}
              size="md"
            >
              {getRecommendationLabel(entry.overrideRecommendation)}
            </Badge>
          </div>

          {/* Justification */}
          {entry.justification && (
            <div>
              <p className="mb-1 text-xs font-semibold text-amber-700">
                Justification
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
                {entry.justification}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Comment */}
      <div className="mt-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ChatBubbleIcon className="h-3.5 w-3.5 text-gray-400" />
          <p className="text-xs font-semibold text-gray-500">Comment</p>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {entry.comment}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewHistory Component
// ---------------------------------------------------------------------------

export default function ReviewHistory({
  applicationId,
  initialData,
  className,
}: ReviewHistoryProps) {
  const { data: session } = useSession();

  const [reviews, setReviews] = React.useState<ReviewEntry[] | null>(
    initialData ?? null
  );
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // ---------------------------------------------------------------------------
  // Fetch reviews
  // ---------------------------------------------------------------------------

  const fetchReviews = React.useCallback(async () => {
    setError(null);

    try {
      const response = await fetch(`/api/review/${applicationId}`);

      const data: ApiResponse<ReviewEntry[]> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error ||
          `Failed to fetch review history (${response.status})`;
        setError(errorMessage);
        return;
      }

      if (data.data) {
        // Sort chronologically (oldest first)
        const sorted = [...data.data].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setReviews(sorted);
      } else {
        setReviews([]);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";
      setError(message);
    }
  }, [applicationId]);

  React.useEffect(() => {
    if (initialData) {
      // Sort chronologically (oldest first)
      const sorted = [...initialData].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setReviews(sorted);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await fetchReviews();
      if (!cancelled) {
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [initialData, fetchReviews]);

  // ---------------------------------------------------------------------------
  // Refresh handler
  // ---------------------------------------------------------------------------

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  };

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const totalReviews = reviews?.length ?? 0;
  const overrideCount = reviews?.filter((r) => r.isOverride).length ?? 0;
  const commentCount = reviews?.filter((r) => !r.isOverride).length ?? 0;

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <Spinner
          size="md"
          label="Loading review history…"
          className="py-12"
        />
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
          title="Failed to Load Review History"
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

  if (!reviews || reviews.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-10">
              <DocumentIcon className="mb-3 h-10 w-10 text-gray-300" />
              <p className="mb-1 text-sm font-medium text-gray-700">
                No Reviews Yet
              </p>
              <p className="mb-4 text-xs text-gray-500">
                No analyst reviews or overrides have been submitted for this
                application.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                loading={refreshing}
                disabled={refreshing}
                icon={!refreshing ? <RefreshIcon /> : undefined}
                iconPosition="left"
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Summary Card */}
      <Card>
        <CardHeader
          title="Review History"
          subtitle={`${totalReviews} review${totalReviews !== 1 ? "s" : ""} recorded for this application`}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              loading={refreshing}
              disabled={refreshing}
              icon={!refreshing ? <RefreshIcon /> : undefined}
              iconPosition="left"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          }
        />
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* Total Reviews */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {totalReviews}
              </p>
              <p className="text-xs font-medium text-blue-600">
                Total Reviews
              </p>
            </div>

            {/* Comments */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">
                {commentCount}
              </p>
              <p className="text-xs font-medium text-gray-600">Comments</p>
            </div>

            {/* Overrides */}
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                overrideCount > 0
                  ? "border-amber-200 bg-amber-50"
                  : "border-gray-200 bg-gray-50"
              )}
            >
              <p
                className={cn(
                  "text-2xl font-bold",
                  overrideCount > 0 ? "text-amber-700" : "text-gray-700"
                )}
              >
                {overrideCount}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  overrideCount > 0 ? "text-amber-600" : "text-gray-600"
                )}
              >
                Overrides
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Override Alert */}
      {overrideCount > 0 && (
        <Alert variant="warning" title="Recommendation Overridden" showIcon>
          This application has {overrideCount} override
          {overrideCount !== 1 ? "s" : ""} recorded. The most recent override
          decision supersedes the AI recommendation.
        </Alert>
      )}

      {/* Review Entries (chronological order) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">
          All Reviews ({totalReviews})
        </h3>
        {reviews.map((entry) => (
          <ReviewEntryCard key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Summary Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          {totalReviews} review{totalReviews !== 1 ? "s" : ""} recorded
          {overrideCount > 0
            ? ` — ${overrideCount} override${overrideCount !== 1 ? "s" : ""}`
            : ""}
          . All review actions are recorded in the audit trail.
        </p>
      </div>
    </div>
  );
}

export { ReviewHistory };
export type { ReviewHistoryProps, ReviewEntry, ReviewerInfo };