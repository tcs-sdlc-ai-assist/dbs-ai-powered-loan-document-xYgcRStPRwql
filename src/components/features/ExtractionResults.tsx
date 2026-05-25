"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { cn, formatDate } from "@/lib/utils";
import { DOCUMENT_TYPES } from "@/lib/constants";
import type { DocumentType, ExtractionStatus } from "@prisma/client";
import type { ApiResponse } from "@/types/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractionField {
  key: string;
  value: unknown;
  confidence?: number;
}

interface ExtractionResultItem {
  documentId: string;
  documentType: DocumentType;
  fileName: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  status: ExtractionStatus;
  errors: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ExtractionResultsResponse {
  applicationId: string;
  extractionResults: ExtractionResultItem[];
}

interface ExtractionResultsProps {
  /** The application ID (human-readable, e.g. DBS-1001) */
  applicationId: string;
  /** Optional pre-fetched extraction data to avoid an additional API call */
  initialData?: ExtractionResultsResponse | null;
  /** Whether the user can trigger re-extraction */
  canReExtract?: boolean;
  /** Optional callback fired after a successful re-extraction */
  onReExtractComplete?: () => void;
  /** Optional class names for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDocumentTypeLabel(type: DocumentType): string {
  const config = DOCUMENT_TYPES[type];
  return config ? config.label : type;
}

function getStatusBadgeVariant(
  status: ExtractionStatus
): "success" | "danger" | "warning" | "info" | "default" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PARTIALLY_COMPLETED":
      return "warning";
    case "FAILED":
      return "danger";
    case "IN_PROGRESS":
      return "info";
    case "PENDING":
    default:
      return "default";
  }
}

function getStatusLabel(status: ExtractionStatus): string {
  switch (status) {
    case "COMPLETED":
      return "Completed";
    case "PARTIALLY_COMPLETED":
      return "Partial";
    case "FAILED":
      return "Failed";
    case "IN_PROGRESS":
      return "In Progress";
    case "PENDING":
      return "Pending";
    default:
      return status;
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "text-green-700";
  if (confidence >= 0.8) return "text-yellow-700";
  if (confidence >= 0.6) return "text-orange-700";
  return "text-red-700";
}

function getConfidenceBgColor(confidence: number): string {
  if (confidence >= 0.9) return "bg-green-50 border-green-200";
  if (confidence >= 0.8) return "bg-yellow-50 border-yellow-200";
  if (confidence >= 0.6) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

function getConfidenceBadgeVariant(
  confidence: number
): "success" | "warning" | "danger" | "info" {
  if (confidence >= 0.9) return "success";
  if (confidence >= 0.8) return "warning";
  if (confidence >= 0.6) return "info";
  return "danger";
}

function getOverallProgressVariant(
  results: ExtractionResultItem[]
): "success" | "warning" | "danger" | "default" {
  if (results.length === 0) return "default";
  const allCompleted = results.every((r) => r.status === "COMPLETED");
  const anyFailed = results.some((r) => r.status === "FAILED");
  if (allCompleted) return "success";
  if (anyFailed) return "danger";
  return "warning";
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatFieldKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

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

function CheckCircleIcon({ className }: { className?: string }) {
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

function XCircleIcon({ className }: { className?: string }) {
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

// ---------------------------------------------------------------------------
// ExtractionFieldRow Component
// ---------------------------------------------------------------------------

function ExtractionFieldRow({
  fieldKey,
  value,
  confidence,
}: {
  fieldKey: string;
  value: unknown;
  confidence?: number;
}) {
  const formattedValue = formatFieldValue(value);
  const formattedKey = formatFieldKey(fieldKey);

  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500">{formattedKey}</p>
        <p className="mt-0.5 text-sm font-medium text-gray-900 break-words">
          {formattedValue}
        </p>
      </div>
      {confidence !== undefined && (
        <div className="flex-shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-semibold",
              getConfidenceBgColor(confidence),
              getConfidenceColor(confidence)
            )}
          >
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentExtractionCard Component
// ---------------------------------------------------------------------------

function DocumentExtractionCard({
  result,
  canReExtract,
  onReExtract,
  reExtracting,
}: {
  result: ExtractionResultItem;
  canReExtract: boolean;
  onReExtract: (documentId: string) => void;
  reExtracting: boolean;
}) {
  const [expanded, setExpanded] = React.useState(
    result.status === "COMPLETED" || result.status === "PARTIALLY_COMPLETED"
  );

  const isFailed = result.status === "FAILED";
  const isPending =
    result.status === "PENDING" || result.status === "IN_PROGRESS";
  const hasData =
    result.extractedData &&
    Object.keys(result.extractedData).length > 0;

  const fields = hasData
    ? Object.entries(result.extractedData).map(([key, value]) => ({
        key,
        value,
      }))
    : [];

  return (
    <Card
      variant={isFailed ? "outlined" : "default"}
      className={cn(isFailed && "border-red-200")}
    >
      {/* Card Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b border-gray-200 px-6 py-4",
          isFailed && "border-red-200 bg-red-50/50"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isFailed ? (
            <XCircleIcon className="flex-shrink-0 text-red-500" />
          ) : result.status === "COMPLETED" ? (
            <CheckCircleIcon className="flex-shrink-0 text-green-500" />
          ) : result.status === "PARTIALLY_COMPLETED" ? (
            <WarningIcon className="flex-shrink-0 text-yellow-500" />
          ) : (
            <DocumentIcon className="flex-shrink-0 text-gray-400" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {getDocumentTypeLabel(result.documentType)}
              </h4>
              <Badge
                variant={getStatusBadgeVariant(result.status)}
                size="sm"
              >
                {getStatusLabel(result.status)}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 truncate">
              {result.fileName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {/* Confidence Badge */}
          {result.confidence > 0 && (
            <Badge
              variant={getConfidenceBadgeVariant(result.confidence)}
              size="md"
            >
              {(result.confidence * 100).toFixed(1)}%
            </Badge>
          )}

          {/* Re-extract Button */}
          {canReExtract && (isFailed || result.status === "PARTIALLY_COMPLETED") && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onReExtract(result.documentId)}
              disabled={reExtracting}
              loading={reExtracting}
              icon={!reExtracting ? <RefreshIcon /> : undefined}
              iconPosition="left"
            >
              Re-extract
            </Button>
          )}

          {/* Expand/Collapse Toggle */}
          {hasData && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label={expanded ? "Collapse fields" : "Expand fields"}
            >
              <svg
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {isFailed && result.errors && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3">
          <div className="flex items-start gap-2">
            <WarningIcon className="mt-0.5 flex-shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-800">
                Extraction Failed
              </p>
              <p className="mt-0.5 text-xs text-red-700">
                {typeof result.errors.message === "string"
                  ? result.errors.message
                  : "An error occurred during extraction. Please try re-extracting this document."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending / In Progress Display */}
      {isPending && (
        <CardBody>
          <div className="flex flex-col items-center justify-center py-6">
            {result.status === "IN_PROGRESS" ? (
              <>
                <Spinner size="sm" className="mb-2" />
                <p className="text-sm text-gray-500">
                  Extraction in progress…
                </p>
              </>
            ) : (
              <>
                <DocumentIcon className="mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Extraction pending. Trigger extraction to process this
                  document.
                </p>
              </>
            )}
          </div>
        </CardBody>
      )}

      {/* Extracted Fields */}
      {expanded && hasData && (
        <div className="divide-y divide-gray-100">
          {fields.map((field) => (
            <ExtractionFieldRow
              key={field.key}
              fieldKey={field.key}
              value={field.value}
              confidence={result.confidence}
            />
          ))}
        </div>
      )}

      {/* No Data State */}
      {!isFailed && !isPending && !hasData && (
        <CardBody>
          <p className="text-center text-sm text-gray-500">
            No extracted data available for this document.
          </p>
        </CardBody>
      )}

      {/* Timestamps */}
      {(result.createdAt || result.updatedAt) && (
        <div className="border-t border-gray-100 px-6 py-2">
          <div className="flex items-center gap-4 text-2xs text-gray-400">
            {result.createdAt && (
              <span>Extracted: {formatDate(result.createdAt, "dd MMM yyyy, HH:mm")}</span>
            )}
            {result.updatedAt && result.updatedAt !== result.createdAt && (
              <span>Updated: {formatDate(result.updatedAt, "dd MMM yyyy, HH:mm")}</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ExtractionResults Component
// ---------------------------------------------------------------------------

export default function ExtractionResults({
  applicationId,
  initialData,
  canReExtract = true,
  onReExtractComplete,
  className,
}: ExtractionResultsProps) {
  const { data: session } = useSession();

  const [extractionData, setExtractionData] =
    React.useState<ExtractionResultsResponse | null>(initialData ?? null);
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [reExtracting, setReExtracting] = React.useState(false);
  const [reExtractingAll, setReExtractingAll] = React.useState(false);
  const [reExtractDocId, setReExtractDocId] = React.useState<string | null>(
    null
  );
  const [reExtractSuccess, setReExtractSuccess] = React.useState<string | null>(
    null
  );
  const [reExtractError, setReExtractError] = React.useState<string | null>(
    null
  );

  // ---------------------------------------------------------------------------
  // Fetch extraction results
  // ---------------------------------------------------------------------------

  const fetchExtractionResults = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/extract`
      );

      const data: ApiResponse<ExtractionResultsResponse> =
        await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error ||
          `Failed to fetch extraction results (${response.status})`;
        setError(errorMessage);
        return;
      }

      if (data.data) {
        setExtractionData(data.data);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  React.useEffect(() => {
    if (initialData) {
      setExtractionData(initialData);
      setLoading(false);
      return;
    }

    fetchExtractionResults();
  }, [initialData, fetchExtractionResults]);

  // ---------------------------------------------------------------------------
  // Re-extract single document
  // ---------------------------------------------------------------------------

  const handleReExtractDocument = async (documentId: string) => {
    setReExtracting(true);
    setReExtractDocId(documentId);
    setReExtractSuccess(null);
    setReExtractError(null);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentIds: [documentId],
          }),
        }
      );

      const data: ApiResponse<unknown> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || `Re-extraction failed (${response.status})`;
        setReExtractError(errorMessage);
        return;
      }

      setReExtractSuccess("Document re-extracted successfully.");

      // Refresh extraction results
      await fetchExtractionResults();

      if (onReExtractComplete) {
        onReExtractComplete();
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";
      setReExtractError(message);
    } finally {
      setReExtracting(false);
      setReExtractDocId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Re-extract all documents
  // ---------------------------------------------------------------------------

  const handleReExtractAll = async () => {
    setReExtractingAll(true);
    setReExtractSuccess(null);
    setReExtractError(null);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const data: ApiResponse<unknown> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || `Re-extraction failed (${response.status})`;
        setReExtractError(errorMessage);
        return;
      }

      setReExtractSuccess("All documents re-extracted successfully.");

      // Refresh extraction results
      await fetchExtractionResults();

      if (onReExtractComplete) {
        onReExtractComplete();
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";
      setReExtractError(message);
    } finally {
      setReExtractingAll(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const results = extractionData?.extractionResults ?? [];

  const completedCount = results.filter(
    (r) => r.status === "COMPLETED"
  ).length;
  const partialCount = results.filter(
    (r) => r.status === "PARTIALLY_COMPLETED"
  ).length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;
  const pendingCount = results.filter(
    (r) => r.status === "PENDING" || r.status === "IN_PROGRESS"
  ).length;
  const totalCount = results.length;

  const confidenceScores = results
    .filter((r) => r.confidence > 0)
    .map((r) => r.confidence);
  const averageConfidence =
    confidenceScores.length > 0
      ? Math.round(
          (confidenceScores.reduce((sum, c) => sum + c, 0) /
            confidenceScores.length) *
            100
        ) / 100
      : 0;

  const completionPercentage =
    totalCount > 0
      ? Math.round(
          ((completedCount + partialCount) / totalCount) * 100
        )
      : 0;

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <Spinner
          size="md"
          label="Loading extraction results…"
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
          title="Failed to Load Extraction Results"
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

  if (!extractionData || results.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-12 shadow-card">
          <DocumentIcon className="mb-3 h-10 w-10 text-gray-300" />
          <p className="mb-1 text-sm font-medium text-gray-700">
            No Extraction Results
          </p>
          <p className="mb-4 text-xs text-gray-500">
            No documents have been extracted yet for this application.
          </p>
          {canReExtract && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleReExtractAll}
              loading={reExtractingAll}
              disabled={reExtractingAll}
              icon={!reExtractingAll ? <RefreshIcon /> : undefined}
              iconPosition="left"
            >
              {reExtractingAll ? "Extracting…" : "Trigger Extraction"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Success / Error Alerts */}
      {reExtractSuccess && (
        <Alert
          variant="success"
          title="Re-extraction Complete"
          dismissible
          onDismiss={() => setReExtractSuccess(null)}
        >
          {reExtractSuccess}
        </Alert>
      )}

      {reExtractError && (
        <Alert
          variant="error"
          title="Re-extraction Failed"
          dismissible
          onDismiss={() => setReExtractError(null)}
        >
          {reExtractError}
        </Alert>
      )}

      {/* Overall Status Summary */}
      <Card>
        <CardHeader
          title="Extraction Overview"
          subtitle={`${totalCount} document(s) processed`}
          action={
            canReExtract ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleReExtractAll}
                loading={reExtractingAll}
                disabled={reExtractingAll || reExtracting}
                icon={!reExtractingAll ? <RefreshIcon /> : undefined}
                iconPosition="left"
              >
                {reExtractingAll ? "Re-extracting…" : "Re-extract All"}
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          {/* Progress Bar */}
          <div className="mb-4">
            <ProgressBar
              value={completionPercentage}
              max={100}
              size="md"
              variant={getOverallProgressVariant(results)}
              showLabel
              labelPosition="right"
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Completed */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {completedCount}
              </p>
              <p className="text-xs font-medium text-green-600">Completed</p>
            </div>

            {/* Partial */}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700">
                {partialCount}
              </p>
              <p className="text-xs font-medium text-yellow-600">Partial</p>
            </div>

            {/* Failed */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{failedCount}</p>
              <p className="text-xs font-medium text-red-600">Failed</p>
            </div>

            {/* Avg Confidence */}
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                averageConfidence >= 0.9
                  ? "border-green-200 bg-green-50"
                  : averageConfidence >= 0.8
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-orange-200 bg-orange-50"
              )}
            >
              <p
                className={cn(
                  "text-2xl font-bold",
                  getConfidenceColor(averageConfidence)
                )}
              >
                {averageConfidence > 0
                  ? `${(averageConfidence * 100).toFixed(1)}%`
                  : "—"}
              </p>
              <p className="text-xs font-medium text-gray-600">
                Avg Confidence
              </p>
            </div>
          </div>

          {/* Pending / In Progress Warning */}
          {pendingCount > 0 && (
            <Alert variant="info" className="mt-4" showIcon>
              {pendingCount} document(s) are pending or in progress.
              {canReExtract &&
                " Click 'Re-extract All' to process remaining documents."}
            </Alert>
          )}

          {/* Failed Warning */}
          {failedCount > 0 && (
            <Alert variant="warning" className="mt-4" showIcon>
              {failedCount} document(s) failed extraction.
              {canReExtract &&
                " You can re-extract individual documents or all documents at once."}
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Per-Document Extraction Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Document Extraction Details
        </h3>
        {results.map((result) => (
          <DocumentExtractionCard
            key={result.documentId}
            result={result}
            canReExtract={canReExtract}
            onReExtract={handleReExtractDocument}
            reExtracting={
              reExtracting && reExtractDocId === result.documentId
            }
          />
        ))}
      </div>
    </div>
  );
}

export { ExtractionResults };
export type { ExtractionResultsProps, ExtractionResultItem, ExtractionResultsResponse };