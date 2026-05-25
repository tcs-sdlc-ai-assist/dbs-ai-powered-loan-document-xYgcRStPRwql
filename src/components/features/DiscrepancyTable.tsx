"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { cn, formatDate } from "@/lib/utils";
import type { DiscrepancySeverity } from "@prisma/client";
import type { ApiResponse, CrossValidationResult, ValidationDiscrepancyItem } from "@/types/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import Textarea from "@/components/ui/Textarea";
import Modal from "@/components/ui/Modal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrossValidationResponse {
  applicationId: string;
  isConsistent: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  discrepancies: DiscrepancyRow[];
}

interface DiscrepancyRow {
  id?: string;
  field: string;
  sourceDocument: string;
  targetDocument: string;
  sourceValue: string;
  targetValue: string;
  severity: DiscrepancySeverity;
  resolved: boolean;
}

interface DiscrepancyTableProps {
  /** The application ID (human-readable, e.g. DBS-1001) */
  applicationId: string;
  /** Optional pre-fetched cross-validation data to avoid an additional API call */
  initialData?: CrossValidationResponse | null;
  /** Whether the current user can resolve discrepancies */
  canResolve?: boolean;
  /** Optional callback fired after a discrepancy is resolved */
  onDiscrepancyResolved?: () => void;
  /** Optional class names for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSeverityBadgeVariant(
  severity: DiscrepancySeverity
): "danger" | "warning" | "info" | "default" {
  switch (severity) {
    case "CRITICAL":
      return "danger";
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "info";
    default:
      return "default";
  }
}

function getSeverityLabel(severity: DiscrepancySeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "Critical";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
      return "Low";
    default:
      return severity;
  }
}

function getSeverityOrder(severity: DiscrepancySeverity): number {
  switch (severity) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 3;
    default:
      return 4;
  }
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
// ResolveModal Component
// ---------------------------------------------------------------------------

function ResolveModal({
  open,
  onClose,
  discrepancy,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  discrepancy: DiscrepancyRow | null;
  onConfirm: (comment: string) => void;
  loading: boolean;
}) {
  const [comment, setComment] = React.useState("");
  const [commentError, setCommentError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setComment("");
      setCommentError(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!comment.trim()) {
      setCommentError("Please provide a comment explaining why this discrepancy is resolved.");
      return;
    }
    if (comment.trim().length > 2000) {
      setCommentError("Comment must be at most 2000 characters.");
      return;
    }
    setCommentError(null);
    onConfirm(comment.trim());
  };

  if (!discrepancy) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resolve Discrepancy"
      subtitle={`Mark the "${discrepancy.field}" discrepancy as resolved`}
      size="md"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            {loading ? "Resolving…" : "Mark as Resolved"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Discrepancy Details */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500">Field</p>
              <p className="mt-0.5 font-medium text-gray-900">
                {discrepancy.field}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Severity</p>
              <div className="mt-0.5">
                <Badge
                  variant={getSeverityBadgeVariant(discrepancy.severity)}
                  size="sm"
                >
                  {getSeverityLabel(discrepancy.severity)}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                {discrepancy.sourceDocument}
              </p>
              <p className="mt-0.5 font-medium text-gray-900">
                {discrepancy.sourceValue}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                {discrepancy.targetDocument}
              </p>
              <p className="mt-0.5 font-medium text-gray-900">
                {discrepancy.targetValue}
              </p>
            </div>
          </div>
        </div>

        {/* Comment */}
        <Textarea
          label="Resolution Comment"
          name="resolveComment"
          placeholder="Explain why this discrepancy is acceptable or how it was resolved…"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (commentError) setCommentError(null);
          }}
          error={commentError ?? undefined}
          required
          disabled={loading}
          rows={3}
          resize="vertical"
          maxCharacters={2000}
          showCharacterCount
        />
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// DiscrepancyTableRow Component
// ---------------------------------------------------------------------------

function DiscrepancyTableRow({
  discrepancy,
  canResolve,
  onResolveClick,
}: {
  discrepancy: DiscrepancyRow;
  canResolve: boolean;
  onResolveClick: (discrepancy: DiscrepancyRow) => void;
}) {
  return (
    <tr
      className={cn(
        "border-b border-gray-100 transition-colors hover:bg-gray-50",
        discrepancy.resolved && "bg-green-50/30"
      )}
    >
      {/* Field */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {discrepancy.field}
      </td>

      {/* Source Document */}
      <td className="px-4 py-3 text-sm text-gray-700">
        {discrepancy.sourceDocument}
      </td>

      {/* Source Value */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {discrepancy.sourceValue}
      </td>

      {/* Target Document */}
      <td className="px-4 py-3 text-sm text-gray-700">
        {discrepancy.targetDocument}
      </td>

      {/* Target Value */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {discrepancy.targetValue}
      </td>

      {/* Severity */}
      <td className="px-4 py-3">
        <Badge
          variant={getSeverityBadgeVariant(discrepancy.severity)}
          size="sm"
        >
          {getSeverityLabel(discrepancy.severity)}
        </Badge>
      </td>

      {/* Resolved Status */}
      <td className="px-4 py-3">
        {discrepancy.resolved ? (
          <div className="flex items-center gap-1.5">
            <CheckCircleIcon className="text-green-500" />
            <span className="text-xs font-medium text-green-700">
              Resolved
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <XCircleIcon className="text-red-400" />
            <span className="text-xs font-medium text-red-600">
              Unresolved
            </span>
          </div>
        )}
      </td>

      {/* Actions */}
      {canResolve && (
        <td className="px-4 py-3">
          {!discrepancy.resolved && discrepancy.id ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onResolveClick(discrepancy)}
            >
              Resolve
            </Button>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
      )}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// DiscrepancyTable Component
// ---------------------------------------------------------------------------

export default function DiscrepancyTable({
  applicationId,
  initialData,
  canResolve = false,
  onDiscrepancyResolved,
  className,
}: DiscrepancyTableProps) {
  const { data: session } = useSession();

  const [crossValidationData, setCrossValidationData] =
    React.useState<CrossValidationResponse | null>(initialData ?? null);
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // Resolve modal state
  const [resolveModalOpen, setResolveModalOpen] = React.useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] =
    React.useState<DiscrepancyRow | null>(null);
  const [resolving, setResolving] = React.useState(false);
  const [resolveSuccess, setResolveSuccess] = React.useState<string | null>(
    null
  );
  const [resolveError, setResolveError] = React.useState<string | null>(null);

  // Filter state
  const [severityFilter, setSeverityFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // ---------------------------------------------------------------------------
  // Fetch cross-validation data
  // ---------------------------------------------------------------------------

  const fetchCrossValidation = React.useCallback(async () => {
    setError(null);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/cross-validation`
      );

      const data: ApiResponse<CrossValidationResponse> =
        await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error ||
          `Failed to fetch cross-validation data (${response.status})`;
        setError(errorMessage);
        return;
      }

      if (data.data) {
        setCrossValidationData(data.data);
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
      setCrossValidationData(initialData);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await fetchCrossValidation();
      if (!cancelled) {
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [initialData, fetchCrossValidation]);

  // ---------------------------------------------------------------------------
  // Refresh handler
  // ---------------------------------------------------------------------------

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCrossValidation();
    setRefreshing(false);
  };

  // ---------------------------------------------------------------------------
  // Resolve discrepancy
  // ---------------------------------------------------------------------------

  const handleResolveClick = (discrepancy: DiscrepancyRow) => {
    setSelectedDiscrepancy(discrepancy);
    setResolveModalOpen(true);
    setResolveError(null);
  };

  const handleResolveConfirm = async (comment: string) => {
    if (!selectedDiscrepancy || !selectedDiscrepancy.id) return;

    setResolving(true);
    setResolveError(null);
    setResolveSuccess(null);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/cross-validation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            discrepancyId: selectedDiscrepancy.id,
            resolved: true,
            comment,
          }),
        }
      );

      const data: ApiResponse<unknown> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || `Failed to resolve discrepancy (${response.status})`;
        setResolveError(errorMessage);
        return;
      }

      // Update local state
      setCrossValidationData((prev) => {
        if (!prev) return prev;

        const updatedDiscrepancies = prev.discrepancies.map((d) =>
          d.id === selectedDiscrepancy.id ? { ...d, resolved: true } : d
        );

        const unresolvedCount = updatedDiscrepancies.filter(
          (d) => !d.resolved
        ).length;

        return {
          ...prev,
          discrepancies: updatedDiscrepancies,
          isConsistent: unresolvedCount === 0,
          failedChecks: unresolvedCount,
          passedChecks: prev.totalChecks - unresolvedCount,
        };
      });

      setResolveSuccess(
        `Discrepancy "${selectedDiscrepancy.field}" marked as resolved.`
      );
      setResolveModalOpen(false);
      setSelectedDiscrepancy(null);

      if (onDiscrepancyResolved) {
        onDiscrepancyResolved();
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";
      setResolveError(message);
    } finally {
      setResolving(false);
    }
  };

  const handleResolveModalClose = () => {
    if (!resolving) {
      setResolveModalOpen(false);
      setSelectedDiscrepancy(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const discrepancies = crossValidationData?.discrepancies ?? [];

  // Apply filters
  const filteredDiscrepancies = React.useMemo(() => {
    let filtered = [...discrepancies];

    if (severityFilter !== "all") {
      filtered = filtered.filter((d) => d.severity === severityFilter);
    }

    if (statusFilter === "resolved") {
      filtered = filtered.filter((d) => d.resolved);
    } else if (statusFilter === "unresolved") {
      filtered = filtered.filter((d) => !d.resolved);
    }

    // Sort by severity (critical first), then by resolved status (unresolved first)
    filtered.sort((a, b) => {
      if (a.resolved !== b.resolved) {
        return a.resolved ? 1 : -1;
      }
      return getSeverityOrder(a.severity) - getSeverityOrder(b.severity);
    });

    return filtered;
  }, [discrepancies, severityFilter, statusFilter]);

  const totalCount = discrepancies.length;
  const unresolvedCount = discrepancies.filter((d) => !d.resolved).length;
  const resolvedCount = discrepancies.filter((d) => d.resolved).length;
  const criticalCount = discrepancies.filter(
    (d) => d.severity === "CRITICAL" && !d.resolved
  ).length;
  const highCount = discrepancies.filter(
    (d) => d.severity === "HIGH" && !d.resolved
  ).length;

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <Spinner
          size="md"
          label="Loading cross-validation results…"
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
          title="Failed to Load Discrepancies"
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

  if (!crossValidationData) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-12 shadow-card">
          <DocumentIcon className="mb-3 h-10 w-10 text-gray-300" />
          <p className="mb-1 text-sm font-medium text-gray-700">
            No Cross-Validation Data
          </p>
          <p className="mb-4 text-xs text-gray-500">
            Cross-validation has not been run for this application yet.
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
            {refreshing ? "Loading…" : "Run Cross-Validation"}
          </Button>
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
      {resolveSuccess && (
        <Alert
          variant="success"
          title="Discrepancy Resolved"
          dismissible
          onDismiss={() => setResolveSuccess(null)}
        >
          {resolveSuccess}
        </Alert>
      )}

      {resolveError && !resolveModalOpen && (
        <Alert
          variant="error"
          title="Failed to Resolve Discrepancy"
          dismissible
          onDismiss={() => setResolveError(null)}
        >
          {resolveError}
        </Alert>
      )}

      {/* Consistency Alert */}
      {crossValidationData.isConsistent && totalCount === 0 && (
        <Alert variant="success" title="No Discrepancies Found" showIcon>
          All cross-validation checks passed. No discrepancies were detected
          between documents.
        </Alert>
      )}

      {crossValidationData.isConsistent && totalCount > 0 && (
        <Alert
          variant="success"
          title="All Discrepancies Resolved"
          showIcon
        >
          All {totalCount} discrepancy(ies) have been resolved. The
          application data is consistent.
        </Alert>
      )}

      {!crossValidationData.isConsistent && criticalCount > 0 && (
        <Alert variant="error" title="Critical Discrepancies Found" showIcon>
          {criticalCount} critical discrepancy(ies) require immediate
          attention. These must be resolved before the application can
          proceed.
        </Alert>
      )}

      {!crossValidationData.isConsistent &&
        criticalCount === 0 &&
        unresolvedCount > 0 && (
          <Alert
            variant="warning"
            title="Discrepancies Require Review"
            showIcon
          >
            {unresolvedCount} unresolved discrepancy(ies) found during
            cross-validation. Please review and resolve before proceeding.
          </Alert>
        )}

      {/* Summary Card */}
      <Card>
        <CardHeader
          title="Cross-Validation Summary"
          subtitle={`${crossValidationData.totalChecks} check(s) performed across documents`}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {/* Total Checks */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {crossValidationData.totalChecks}
              </p>
              <p className="text-xs font-medium text-blue-600">
                Total Checks
              </p>
            </div>

            {/* Passed */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {crossValidationData.passedChecks}
              </p>
              <p className="text-xs font-medium text-green-600">Passed</p>
            </div>

            {/* Failed */}
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                crossValidationData.failedChecks > 0
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-gray-50"
              )}
            >
              <p
                className={cn(
                  "text-2xl font-bold",
                  crossValidationData.failedChecks > 0
                    ? "text-red-700"
                    : "text-gray-700"
                )}
              >
                {crossValidationData.failedChecks}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  crossValidationData.failedChecks > 0
                    ? "text-red-600"
                    : "text-gray-600"
                )}
              >
                Failed
              </p>
            </div>

            {/* Unresolved */}
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                unresolvedCount > 0
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-green-200 bg-green-50"
              )}
            >
              <p
                className={cn(
                  "text-2xl font-bold",
                  unresolvedCount > 0
                    ? "text-yellow-700"
                    : "text-green-700"
                )}
              >
                {unresolvedCount}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  unresolvedCount > 0
                    ? "text-yellow-600"
                    : "text-green-600"
                )}
              >
                Unresolved
              </p>
            </div>

            {/* Resolved */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {resolvedCount}
              </p>
              <p className="text-xs font-medium text-green-600">Resolved</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Discrepancy Table */}
      {totalCount > 0 && (
        <Card>
          <CardHeader
            title="Discrepancies"
            subtitle={`${filteredDiscrepancies.length} of ${totalCount} discrepancy(ies) shown`}
          />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-6 py-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="severityFilter"
                className="text-xs font-medium text-gray-500"
              >
                Severity:
              </label>
              <select
                id="severityFilter"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-[var(--dbs-dark-blue)] focus:ring-1 focus:ring-[var(--dbs-dark-blue)]/15"
              >
                <option value="all">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="statusFilter"
                className="text-xs font-medium text-gray-500"
              >
                Status:
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-[var(--dbs-dark-blue)] focus:ring-1 focus:ring-[var(--dbs-dark-blue)]/15"
              >
                <option value="all">All</option>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Field
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Source Document
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Source Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Target Document
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Target Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  {canResolve && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredDiscrepancies.length > 0 ? (
                  filteredDiscrepancies.map((discrepancy, index) => (
                    <DiscrepancyTableRow
                      key={discrepancy.id ?? `discrepancy-${index}`}
                      discrepancy={discrepancy}
                      canResolve={canResolve}
                      onResolveClick={handleResolveClick}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={canResolve ? 8 : 7}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircleIcon className="mb-2 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-500">
                          No discrepancies match the current filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* No Discrepancies State */}
      {totalCount === 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircleIcon className="mb-3 h-10 w-10 text-green-400" />
              <p className="mb-1 text-sm font-medium text-gray-700">
                No Discrepancies
              </p>
              <p className="text-xs text-gray-500">
                All cross-validation checks passed successfully. No
                discrepancies were found between documents.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Summary Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          {unresolvedCount > 0
            ? `${unresolvedCount} unresolved discrepancy(ies) remaining. ${criticalCount > 0 ? `${criticalCount} critical.` : ""} ${highCount > 0 ? `${highCount} high severity.` : ""}`
            : totalCount > 0
              ? "All discrepancies have been resolved."
              : "No discrepancies detected during cross-validation."}
        </p>
      </div>

      {/* Resolve Modal */}
      <ResolveModal
        open={resolveModalOpen}
        onClose={handleResolveModalClose}
        discrepancy={selectedDiscrepancy}
        onConfirm={handleResolveConfirm}
        loading={resolving}
      />
    </div>
  );
}

export { DiscrepancyTable };
export type { DiscrepancyTableProps, DiscrepancyRow, CrossValidationResponse };