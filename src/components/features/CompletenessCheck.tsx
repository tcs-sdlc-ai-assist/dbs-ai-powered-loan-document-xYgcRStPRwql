"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { cn, formatDate } from "@/lib/utils";
import { DOCUMENT_TYPES } from "@/lib/constants";
import type { DocumentType } from "@prisma/client";
import type { ApiResponse, CompletenessResult } from "@/types/types";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompletenessResponse {
  applicationId: string;
  isComplete: boolean;
  totalDocuments: number;
  requiredDocuments: DocumentType[];
  missingDocuments: DocumentType[];
  completenessPercentage: number;
}

interface CompletenessCheckProps {
  /** The application ID (human-readable, e.g. DBS-1001) */
  applicationId: string;
  /** Optional pre-fetched completeness data to avoid an additional API call */
  initialData?: CompletenessResponse | null;
  /** Optional callback fired when the user clicks the action to upload missing documents */
  onUploadMissing?: () => void;
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

function getProgressVariant(
  percentage: number
): "success" | "warning" | "danger" {
  if (percentage >= 100) return "success";
  if (percentage >= 50) return "warning";
  return "danger";
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

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

function UploadIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// RequiredDocumentRow Component
// ---------------------------------------------------------------------------

function RequiredDocumentRow({
  type,
  isUploaded,
}: {
  type: DocumentType;
  isUploaded: boolean;
}) {
  const label = getDocumentTypeLabel(type);

  return (
    <li className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {isUploaded ? (
          <CheckCircleIcon className="flex-shrink-0 text-green-500" />
        ) : (
          <XCircleIcon className="flex-shrink-0 text-red-500" />
        )}
        <p
          className={cn(
            "text-sm font-medium",
            isUploaded ? "text-green-700" : "text-red-700"
          )}
        >
          {label}
        </p>
      </div>
      <Badge
        variant={isUploaded ? "success" : "danger"}
        size="sm"
      >
        {isUploaded ? "Uploaded" : "Missing"}
      </Badge>
    </li>
  );
}

// ---------------------------------------------------------------------------
// CompletenessCheck Component
// ---------------------------------------------------------------------------

export default function CompletenessCheck({
  applicationId,
  initialData,
  onUploadMissing,
  className,
}: CompletenessCheckProps) {
  const { data: session } = useSession();

  const [completenessData, setCompletenessData] =
    React.useState<CompletenessResponse | null>(initialData ?? null);
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // ---------------------------------------------------------------------------
  // Fetch completeness data
  // ---------------------------------------------------------------------------

  const fetchCompleteness = React.useCallback(async () => {
    setError(null);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/completeness`
      );

      const data: ApiResponse<CompletenessResponse> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error ||
          `Failed to fetch completeness data (${response.status})`;
        setError(errorMessage);
        return;
      }

      if (data.data) {
        setCompletenessData(data.data);
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
      setCompletenessData(initialData);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await fetchCompleteness();
      if (!cancelled) {
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [initialData, fetchCompleteness]);

  // ---------------------------------------------------------------------------
  // Refresh handler
  // ---------------------------------------------------------------------------

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCompleteness();
    setRefreshing(false);
  };

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <Spinner
          size="md"
          label="Checking document completeness…"
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
          title="Failed to Load Completeness Check"
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

  if (!completenessData) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-12 shadow-card">
          <DocumentIcon className="mb-3 h-10 w-10 text-gray-300" />
          <p className="mb-1 text-sm font-medium text-gray-700">
            No Completeness Data
          </p>
          <p className="mb-4 text-xs text-gray-500">
            Unable to determine document completeness for this application.
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
            {refreshing ? "Checking…" : "Check Completeness"}
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const {
    isComplete,
    totalDocuments,
    requiredDocuments,
    missingDocuments,
    completenessPercentage,
  } = completenessData;

  const missingDocumentSet = new Set<DocumentType>(missingDocuments);
  const uploadedRequiredCount = requiredDocuments.length - missingDocuments.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Incompleteness Alert */}
      {!isComplete && (
        <Alert
          variant="warning"
          title="Application Cannot Proceed"
          showIcon
        >
          This application is missing {missingDocuments.length} required
          document{missingDocuments.length !== 1 ? "s" : ""}. Please upload
          all required documents before proceeding to verification.
        </Alert>
      )}

      {/* Completeness Alert */}
      {isComplete && (
        <Alert
          variant="success"
          title="All Required Documents Uploaded"
          showIcon
        >
          All required documents have been uploaded. This application is ready
          to proceed to the next step.
        </Alert>
      )}

      {/* Overview Card */}
      <Card>
        <CardHeader
          title="Document Completeness"
          subtitle={`${totalDocuments} document(s) uploaded for this application`}
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
          {/* Progress Bar */}
          <div className="mb-4">
            <ProgressBar
              value={completenessPercentage}
              max={100}
              size="md"
              variant={getProgressVariant(completenessPercentage)}
              showLabel
              labelPosition="right"
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Completeness */}
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                isComplete
                  ? "border-green-200 bg-green-50"
                  : "border-yellow-200 bg-yellow-50"
              )}
            >
              <p
                className={cn(
                  "text-2xl font-bold",
                  isComplete ? "text-green-700" : "text-yellow-700"
                )}
              >
                {completenessPercentage}%
              </p>
              <p className="text-xs font-medium text-gray-600">Complete</p>
            </div>

            {/* Total Documents */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {totalDocuments}
              </p>
              <p className="text-xs font-medium text-blue-600">
                Total Uploaded
              </p>
            </div>

            {/* Required Uploaded */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {uploadedRequiredCount}
              </p>
              <p className="text-xs font-medium text-green-600">
                Required Uploaded
              </p>
            </div>

            {/* Missing */}
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                missingDocuments.length > 0
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-gray-50"
              )}
            >
              <p
                className={cn(
                  "text-2xl font-bold",
                  missingDocuments.length > 0
                    ? "text-red-700"
                    : "text-gray-700"
                )}
              >
                {missingDocuments.length}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  missingDocuments.length > 0
                    ? "text-red-600"
                    : "text-gray-600"
                )}
              >
                Missing
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Required Documents Checklist */}
      <Card>
        <CardHeader
          title="Required Documents Checklist"
          subtitle={`${uploadedRequiredCount} of ${requiredDocuments.length} required documents uploaded`}
        />
        <div>
          {requiredDocuments.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {requiredDocuments.map((docType) => (
                <RequiredDocumentRow
                  key={docType}
                  type={docType}
                  isUploaded={!missingDocumentSet.has(docType)}
                />
              ))}
            </ul>
          ) : (
            <CardBody>
              <p className="text-center text-sm text-gray-500">
                No required document types configured.
              </p>
            </CardBody>
          )}
        </div>
      </Card>

      {/* Missing Documents Detail */}
      {missingDocuments.length > 0 && (
        <Card variant="outlined" className="border-red-200">
          <CardHeader
            title="Missing Documents"
            subtitle="The following required documents must be uploaded before this application can proceed"
          />
          <CardBody>
            <ul className="space-y-3">
              {missingDocuments.map((docType) => (
                <li
                  key={docType}
                  className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50/50 px-4 py-3"
                >
                  <XCircleIcon className="flex-shrink-0 text-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-red-800">
                      {getDocumentTypeLabel(docType)}
                    </p>
                    <p className="mt-0.5 text-xs text-red-600">
                      This document is required for application processing
                    </p>
                  </div>
                  <Badge variant="danger" size="sm">
                    Required
                  </Badge>
                </li>
              ))}
            </ul>

            {/* Upload Action */}
            {onUploadMissing && (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onUploadMissing}
                  icon={<UploadIcon />}
                  iconPosition="left"
                >
                  Upload Missing Documents
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Summary Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          {isComplete
            ? "All required documents are present. Application is ready for processing."
            : `${missingDocuments.length} required document${missingDocuments.length !== 1 ? "s" : ""} still needed before this application can proceed.`}
        </p>
      </div>
    </div>
  );
}

export { CompletenessCheck };
export type { CompletenessCheckProps, CompletenessResponse };