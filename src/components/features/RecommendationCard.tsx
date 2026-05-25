"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { cn, formatDate, getRecommendationColor } from "@/lib/utils";
import { RECOMMENDATION_TYPES } from "@/lib/constants";
import type { RecommendationType } from "@prisma/client";
import type { ApiResponse } from "@/types/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import Card, { CardHeader, CardBody, CardFooter } from "@/components/ui/Card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecommendationUser {
  id: string;
  name: string;
  email: string;
}

interface RecommendationData {
  id?: string;
  applicationId: string;
  recommendation: RecommendationType;
  rationale: string;
  confidence: number;
  createdBy?: RecommendationUser | null;
  createdAt?: string;
  updatedAt?: string;
  details?: {
    completenessScore?: number;
    averageExtractionConfidence?: number;
    discrepancySummary?: {
      total: number;
      unresolved: number;
      bySeverity: Record<string, number>;
    };
    extractionSummary?: {
      totalDocuments: number;
      completedExtractions: number;
      averageConfidence: number;
      belowThreshold: number;
    };
  };
}

interface OverrideData {
  id?: string;
  applicationId?: string;
  comment: string;
  isOverride: boolean;
  overrideRecommendation: RecommendationType | null;
  justification: string | null;
  reviewer?: RecommendationUser | null;
  createdAt?: string;
  updatedAt?: string;
}

interface RecommendationCardProps {
  /** The application ID (human-readable, e.g. DBS-1001) */
  applicationId: string;
  /** Optional pre-fetched recommendation data */
  initialData?: RecommendationData | null;
  /** Optional pre-fetched override data (latest override review) */
  initialOverride?: OverrideData | null;
  /** Whether the current user can generate a recommendation */
  canGenerate?: boolean;
  /** Whether the current user can override the recommendation */
  canOverride?: boolean;
  /** Whether the current user can submit a review */
  canReview?: boolean;
  /** Callback fired when the user clicks "Generate Recommendation" */
  onGenerate?: () => void;
  /** Callback fired when the user clicks "Override" */
  onOverride?: () => void;
  /** Callback fired when the user clicks "Review" */
  onReview?: () => void;
  /** Callback fired after a successful recommendation generation */
  onGenerateComplete?: () => void;
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

function getRecommendationDisplayType(
  recommendation: RecommendationType
): string {
  switch (recommendation) {
    case "APPROVE":
      return "Proceed";
    case "REJECT":
      return "Incomplete";
    case "REFER_TO_ANALYST":
      return "Needs Review";
    case "REQUEST_MORE_INFO":
      return "Needs Review";
    default:
      return recommendation;
  }
}

function getConfidenceBadgeVariant(
  confidence: number
): "success" | "warning" | "danger" | "info" {
  if (confidence >= 0.9) return "success";
  if (confidence >= 0.7) return "warning";
  if (confidence >= 0.5) return "info";
  return "danger";
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "text-green-700";
  if (confidence >= 0.8) return "text-yellow-700";
  if (confidence >= 0.6) return "text-orange-700";
  return "text-red-700";
}

function getConfidenceBgColor(confidence: number): string {
  if (confidence >= 0.9) return "border-green-200 bg-green-50";
  if (confidence >= 0.8) return "border-yellow-200 bg-yellow-50";
  if (confidence >= 0.6) return "border-orange-200 bg-orange-50";
  return "border-red-200 bg-red-50";
}

function getLargeBadgeBgColor(recommendation: RecommendationType): string {
  switch (recommendation) {
    case "APPROVE":
      return "bg-green-100 text-green-800 border-green-300";
    case "REJECT":
      return "bg-red-100 text-red-800 border-red-300";
    case "REFER_TO_ANALYST":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "REQUEST_MORE_INFO":
      return "bg-blue-100 text-blue-800 border-blue-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
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

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
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

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
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

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
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

function SparklesIcon({ className }: { className?: string }) {
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
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
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

function getRecommendationIcon(recommendation: RecommendationType): React.ReactNode {
  switch (recommendation) {
    case "APPROVE":
      return <CheckCircleIcon className="text-green-600" />;
    case "REJECT":
      return <XCircleIcon className="text-red-600" />;
    case "REFER_TO_ANALYST":
      return <WarningIcon className="text-amber-600" />;
    case "REQUEST_MORE_INFO":
      return <InfoIcon className="text-blue-600" />;
    default:
      return <InfoIcon className="text-gray-600" />;
  }
}

// ---------------------------------------------------------------------------
// LargeBadge Component
// ---------------------------------------------------------------------------

function LargeBadge({
  recommendation,
}: {
  recommendation: RecommendationType;
}) {
  const displayType = getRecommendationDisplayType(recommendation);
  const label = getRecommendationLabel(recommendation);
  const bgColor = getLargeBadgeBgColor(recommendation);
  const icon = getRecommendationIcon(recommendation);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border-2 px-5 py-3",
        bgColor
      )}
    >
      {icon}
      <div>
        <p className="text-lg font-bold leading-tight">{displayType}</p>
        <p className="text-xs font-medium opacity-75">{label}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfidenceDisplay Component
// ---------------------------------------------------------------------------

function ConfidenceDisplay({ confidence }: { confidence: number }) {
  const percentage = (confidence * 100).toFixed(1);

  return (
    <div
      className={cn(
        "rounded-lg border p-4 text-center",
        getConfidenceBgColor(confidence)
      )}
    >
      <p
        className={cn(
          "text-3xl font-bold",
          getConfidenceColor(confidence)
        )}
      >
        {percentage}%
      </p>
      <p className="mt-0.5 text-xs font-medium text-gray-600">
        Confidence Score
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OverrideComparison Component
// ---------------------------------------------------------------------------

function OverrideComparison({
  original,
  override,
}: {
  original: RecommendationData;
  override: OverrideData;
}) {
  return (
    <Card variant="outlined" className="border-amber-200">
      <CardHeader
        title="Recommendation Override"
        subtitle="The AI recommendation has been overridden by an analyst"
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Original Recommendation */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <SparklesIcon className="text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700">
                AI Recommendation
              </h4>
              <Badge variant="default" size="sm">
                Original
              </Badge>
            </div>
            <div className="mb-3">
              <Badge
                variant={getRecommendationBadgeVariant(
                  original.recommendation
                )}
                size="lg"
              >
                {getRecommendationLabel(original.recommendation)}
              </Badge>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">
                Confidence:
              </span>
              <Badge
                variant={getConfidenceBadgeVariant(original.confidence)}
                size="sm"
              >
                {(original.confidence * 100).toFixed(1)}%
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-600 line-clamp-4">
              {original.rationale}
            </p>
            {original.createdAt && (
              <p className="mt-2 text-2xs text-gray-400">
                Generated: {formatDate(original.createdAt, "dd MMM yyyy, HH:mm")}
              </p>
            )}
          </div>

          {/* Override Recommendation */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-amber-600"
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
              <h4 className="text-sm font-semibold text-amber-800">
                Analyst Override
              </h4>
              <Badge variant="warning" size="sm">
                Override
              </Badge>
            </div>
            {override.overrideRecommendation && (
              <div className="mb-3">
                <Badge
                  variant={getRecommendationBadgeVariant(
                    override.overrideRecommendation
                  )}
                  size="lg"
                >
                  {getRecommendationLabel(override.overrideRecommendation)}
                </Badge>
              </div>
            )}
            {override.comment && (
              <div className="mb-2">
                <p className="text-xs font-medium text-amber-700">Comment:</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-900">
                  {override.comment}
                </p>
              </div>
            )}
            {override.justification && (
              <div className="mb-2">
                <p className="text-xs font-medium text-amber-700">
                  Justification:
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-900">
                  {override.justification}
                </p>
              </div>
            )}
            {override.reviewer && (
              <p className="mt-2 text-2xs text-amber-600">
                Overridden by: {override.reviewer.name}
              </p>
            )}
            {override.createdAt && (
              <p className="text-2xs text-amber-500">
                {formatDate(override.createdAt, "dd MMM yyyy, HH:mm")}
              </p>
            )}
          </div>
        </div>

        {/* Arrow indicator between original and override */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <Badge
            variant={getRecommendationBadgeVariant(original.recommendation)}
            size="sm"
          >
            {getRecommendationLabel(original.recommendation)}
          </Badge>
          <ArrowRightIcon className="text-gray-400" />
          {override.overrideRecommendation && (
            <Badge
              variant={getRecommendationBadgeVariant(
                override.overrideRecommendation
              )}
              size="sm"
            >
              {getRecommendationLabel(override.overrideRecommendation)}
            </Badge>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RecommendationCard Component
// ---------------------------------------------------------------------------

export default function RecommendationCard({
  applicationId,
  initialData,
  initialOverride,
  canGenerate = false,
  canOverride = false,
  canReview = false,
  onGenerate,
  onOverride,
  onReview,
  onGenerateComplete,
  className,
}: RecommendationCardProps) {
  const { data: session } = useSession();

  const [recommendationData, setRecommendationData] =
    React.useState<RecommendationData | null>(initialData ?? null);
  const [overrideData, setOverrideData] =
    React.useState<OverrideData | null>(initialOverride ?? null);
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [generateSuccess, setGenerateSuccess] = React.useState<string | null>(
    null
  );
  const [generateError, setGenerateError] = React.useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch recommendation data
  // ---------------------------------------------------------------------------

  const fetchRecommendation = React.useCallback(async () => {
    setError(null);

    try {
      const response = await fetch(
        `/api/recommendation/${applicationId}`
      );

      if (response.status === 404) {
        // No recommendation exists yet — not an error
        setRecommendationData(null);
        return;
      }

      const data: ApiResponse<RecommendationData> = await response.json();

      if (!response.ok || !data.success) {
        if (response.status !== 404) {
          const errorMessage =
            data.error ||
            `Failed to fetch recommendation (${response.status})`;
          setError(errorMessage);
        }
        return;
      }

      if (data.data) {
        setRecommendationData(data.data);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";
      setError(message);
    }
  }, [applicationId]);

  const fetchOverrides = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/review/${applicationId}`);

      if (!response.ok) return;

      const data: ApiResponse<OverrideData[]> = await response.json();

      if (data.success && data.data && Array.isArray(data.data)) {
        const latestOverride = data.data.find((r) => r.isOverride);
        if (latestOverride) {
          setOverrideData(latestOverride);
        }
      }
    } catch {
      // Silently fail — override data is supplementary
    }
  }, [applicationId]);

  React.useEffect(() => {
    if (initialData !== undefined) {
      setRecommendationData(initialData);
      if (initialOverride !== undefined) {
        setOverrideData(initialOverride);
      }
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await fetchRecommendation();
      await fetchOverrides();
      if (!cancelled) {
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [initialData, initialOverride, fetchRecommendation, fetchOverrides]);

  // ---------------------------------------------------------------------------
  // Generate recommendation
  // ---------------------------------------------------------------------------

  const handleGenerate = async () => {
    if (onGenerate) {
      onGenerate();
      return;
    }

    setGenerating(true);
    setGenerateError(null);
    setGenerateSuccess(null);

    try {
      const response = await fetch(
        `/api/recommendation/${applicationId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data: ApiResponse<RecommendationData> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error ||
          `Failed to generate recommendation (${response.status})`;
        setGenerateError(errorMessage);
        return;
      }

      if (data.data) {
        setRecommendationData(data.data);
      }

      setGenerateSuccess("Recommendation generated successfully.");

      if (onGenerateComplete) {
        onGenerateComplete();
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";
      setGenerateError(message);
    } finally {
      setGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <Spinner
          size="md"
          label="Loading recommendation…"
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
          title="Failed to Load Recommendation"
          dismissible
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty State — No Recommendation
  // ---------------------------------------------------------------------------

  if (!recommendationData) {
    return (
      <div className={cn("w-full", className)}>
        {generateSuccess && (
          <Alert
            variant="success"
            title="Success"
            dismissible
            onDismiss={() => setGenerateSuccess(null)}
            className="mb-4"
          >
            {generateSuccess}
          </Alert>
        )}

        {generateError && (
          <Alert
            variant="error"
            title="Generation Failed"
            dismissible
            onDismiss={() => setGenerateError(null)}
            className="mb-4"
          >
            {generateError}
          </Alert>
        )}

        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-10">
              <SparklesIcon className="mb-3 h-10 w-10 text-gray-300" />
              <p className="mb-1 text-sm font-medium text-gray-700">
                No Recommendation Generated
              </p>
              <p className="mb-4 text-xs text-gray-500">
                An AI recommendation has not been generated for this
                application yet.
              </p>
              {canGenerate && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleGenerate}
                  loading={generating}
                  disabled={generating}
                  icon={!generating ? <SparklesIcon className="h-4 w-4" /> : undefined}
                  iconPosition="left"
                >
                  {generating
                    ? "Generating…"
                    : "Generate Recommendation"}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const {
    recommendation,
    rationale,
    confidence,
    createdBy,
    createdAt,
    details,
  } = recommendationData;

  const hasOverride = overrideData !== null && overrideData.isOverride;
  const effectiveRecommendation = hasOverride && overrideData?.overrideRecommendation
    ? overrideData.overrideRecommendation
    : recommendation;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Success / Error Alerts */}
      {generateSuccess && (
        <Alert
          variant="success"
          title="Success"
          dismissible
          onDismiss={() => setGenerateSuccess(null)}
        >
          {generateSuccess}
        </Alert>
      )}

      {generateError && (
        <Alert
          variant="error"
          title="Generation Failed"
          dismissible
          onDismiss={() => setGenerateError(null)}
        >
          {generateError}
        </Alert>
      )}

      {/* Override Alert */}
      {hasOverride && (
        <Alert variant="warning" title="Recommendation Overridden" showIcon>
          The AI recommendation has been overridden by an analyst. The
          effective recommendation is now{" "}
          <strong>
            {getRecommendationLabel(effectiveRecommendation)}
          </strong>
          .
        </Alert>
      )}

      {/* Main Recommendation Card */}
      <Card>
        <CardHeader
          title="AI Recommendation"
          subtitle="Generated recommendation based on document analysis and cross-validation"
          action={
            canGenerate ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerate}
                loading={generating}
                disabled={generating}
                icon={!generating ? <RefreshIcon /> : undefined}
                iconPosition="left"
              >
                {generating ? "Regenerating…" : "Regenerate"}
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          <div className="space-y-6">
            {/* Top Section: Large Badge + Confidence */}
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
              {/* Large Color-Coded Badge */}
              <LargeBadge
                recommendation={
                  hasOverride ? effectiveRecommendation : recommendation
                }
              />

              {/* Confidence Score */}
              <ConfidenceDisplay confidence={confidence} />
            </div>

            {/* Effective vs Original indicator when overridden */}
            {hasOverride && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
                <WarningIcon className="h-4 w-4 flex-shrink-0 text-amber-500" />
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Note:</span> The original
                  AI recommendation was{" "}
                  <Badge
                    variant={getRecommendationBadgeVariant(recommendation)}
                    size="sm"
                  >
                    {getRecommendationLabel(recommendation)}
                  </Badge>
                  . It has been overridden to{" "}
                  <Badge
                    variant={getRecommendationBadgeVariant(
                      effectiveRecommendation
                    )}
                    size="sm"
                  >
                    {getRecommendationLabel(effectiveRecommendation)}
                  </Badge>
                  .
                </p>
              </div>
            )}

            {/* Rationale */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700">
                Rationale
              </h4>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {rationale}
                </p>
              </div>
            </div>

            {/* Details Summary (if available) */}
            {details && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  Analysis Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {details.completenessScore !== undefined && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">
                        {details.completenessScore}%
                      </p>
                      <p className="text-2xs font-medium text-gray-500">
                        Completeness
                      </p>
                    </div>
                  )}
                  {details.averageExtractionConfidence !== undefined && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                      <p
                        className={cn(
                          "text-xl font-bold",
                          getConfidenceColor(
                            details.averageExtractionConfidence
                          )
                        )}
                      >
                        {(details.averageExtractionConfidence * 100).toFixed(
                          1
                        )}
                        %
                      </p>
                      <p className="text-2xs font-medium text-gray-500">
                        Avg Extraction
                      </p>
                    </div>
                  )}
                  {details.discrepancySummary && (
                    <>
                      <div
                        className={cn(
                          "rounded-lg border p-3 text-center",
                          details.discrepancySummary.unresolved > 0
                            ? "border-yellow-200 bg-yellow-50"
                            : "border-green-200 bg-green-50"
                        )}
                      >
                        <p
                          className={cn(
                            "text-xl font-bold",
                            details.discrepancySummary.unresolved > 0
                              ? "text-yellow-700"
                              : "text-green-700"
                          )}
                        >
                          {details.discrepancySummary.unresolved}
                        </p>
                        <p className="text-2xs font-medium text-gray-500">
                          Unresolved
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                        <p className="text-xl font-bold text-gray-900">
                          {details.discrepancySummary.total}
                        </p>
                        <p className="text-2xs font-medium text-gray-500">
                          Total Discrepancies
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
              {createdBy && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
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
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                  <span>
                    Generated by:{" "}
                    <span className="font-medium text-gray-700">
                      {createdBy.name}
                    </span>
                  </span>
                </div>
              )}
              {createdAt && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
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
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    {formatDate(createdAt, "dd MMM yyyy, HH:mm:ss")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardBody>

        {/* Action Buttons */}
        {(canReview || canOverride) && (
          <CardFooter>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {canReview && onReview && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onReview}
                >
                  Add Review Comment
                </Button>
              )}
              {canOverride && onOverride && (
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  onClick={onOverride}
                >
                  Override Recommendation
                </Button>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Override Comparison (if overridden) */}
      {hasOverride && overrideData && (
        <OverrideComparison
          original={recommendationData}
          override={overrideData}
        />
      )}

      {/* Summary Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          {hasOverride
            ? "This recommendation has been overridden by an analyst. The override decision is final."
            : `AI recommendation: ${getRecommendationLabel(recommendation)} with ${(confidence * 100).toFixed(1)}% confidence.`}
        </p>
      </div>
    </div>
  );
}

export { RecommendationCard };
export type {
  RecommendationCardProps,
  RecommendationData,
  OverrideData,
  RecommendationUser,
};