"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, formatDate } from "@/lib/utils";
import type { ApiResponse, AuditLogEntry, PaginatedResponse } from "@/types/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import type { ColumnDefinition, SortConfig, PaginationConfig } from "@/components/ui/Table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogViewerProps {
  /** Optional pre-set application ID filter */
  applicationId?: string;
  /** Optional pre-set user ID filter */
  userId?: string;
  /** Optional class names for the wrapper */
  className?: string;
}

interface AuditLogFilters {
  applicationId: string;
  userId: string;
  action: string;
  entityType: string;
  outcome: string;
  startDate: string;
  endDate: string;
}

interface AuditLogApiResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ---------------------------------------------------------------------------
// Action Type Options
// ---------------------------------------------------------------------------

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "APPLICATION_CREATED", label: "Application Created" },
  { value: "APPLICANT_DETAILS_UPDATED", label: "Applicant Updated" },
  { value: "DOCUMENT_UPLOAD", label: "Document Upload" },
  { value: "DOCUMENT_DELETED", label: "Document Deleted" },
  { value: "EXTRACTION_COMPLETED", label: "Extraction Completed" },
  { value: "VALIDATION_COMPLETED", label: "Validation Completed" },
  { value: "COMPLETENESS_CHECK", label: "Completeness Check" },
  { value: "RECOMMENDATION_GENERATED", label: "Recommendation Generated" },
  { value: "RECOMMENDATION_OVERRIDE", label: "Recommendation Override" },
  { value: "ANALYST_REVIEW_SUBMITTED", label: "Analyst Review" },
  { value: "STATUS_UPDATE", label: "Status Update" },
  { value: "STATUS_TRANSITION_DENIED", label: "Transition Denied" },
  { value: "ACCESS_DENIED", label: "Access Denied" },
  { value: "USER_LOGIN", label: "User Login" },
  { value: "DISCREPANCY_RESOLVED", label: "Discrepancy Resolved" },
  { value: "DISCREPANCY_UPDATED", label: "Discrepancy Updated" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All Entity Types" },
  { value: "Application", label: "Application" },
  { value: "Document", label: "Document" },
  { value: "ExtractionResult", label: "Extraction Result" },
  { value: "Recommendation", label: "Recommendation" },
  { value: "AnalystReview", label: "Analyst Review" },
  { value: "ValidationDiscrepancy", label: "Validation Discrepancy" },
  { value: "User", label: "User" },
  { value: "AccessControl", label: "Access Control" },
];

const OUTCOME_OPTIONS = [
  { value: "", label: "All Outcomes" },
  { value: "SUCCESS", label: "Success" },
  { value: "DENIED", label: "Denied" },
  { value: "PARTIAL_SUCCESS", label: "Partial Success" },
  { value: "INCOMPLETE", label: "Incomplete" },
  { value: "DISCREPANCIES_FOUND", label: "Discrepancies Found" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOutcomeBadgeVariant(
  outcome: string
): "success" | "danger" | "warning" | "info" | "default" {
  switch (outcome) {
    case "SUCCESS":
      return "success";
    case "DENIED":
      return "danger";
    case "PARTIAL_SUCCESS":
      return "warning";
    case "INCOMPLETE":
      return "warning";
    case "DISCREPANCIES_FOUND":
      return "info";
    default:
      return "default";
  }
}

function getActionBadgeVariant(
  action: string
): "success" | "danger" | "warning" | "info" | "default" {
  if (action.includes("DENIED") || action.includes("DELETED")) return "danger";
  if (action.includes("OVERRIDE") || action.includes("TRANSITION_DENIED")) return "warning";
  if (action.includes("CREATED") || action.includes("COMPLETED") || action.includes("LOGIN")) return "success";
  if (action.includes("UPLOAD") || action.includes("SUBMITTED") || action.includes("UPDATE")) return "info";
  return "default";
}

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bId\b/g, "ID");
}

function formatDetailsForDisplay(details: Record<string, unknown> | null): string {
  if (!details) return "—";
  const entries = Object.entries(details);
  if (entries.length === 0) return "—";

  const displayParts: string[] = [];
  for (const [key, value] of entries) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object" && !Array.isArray(value)) continue;
    const formattedKey = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
    displayParts.push(`${formattedKey}: ${String(value)}`);
  }

  if (displayParts.length === 0) return "—";
  return displayParts.slice(0, 3).join("; ") + (displayParts.length > 3 ? "…" : "");
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function FilterIcon({ className }: { className?: string }) {
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
        d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
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

function DownloadIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
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

function ChevronDownIcon({ className }: { className?: string }) {
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
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// DetailsExpandRow Component
// ---------------------------------------------------------------------------

function DetailsExpandRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const details = entry.details;

  if (!details || Object.keys(details).length === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
      >
        {expanded ? "Hide" : "View"}
        <ChevronDownIcon
          className={cn(
            "transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3">
          <pre className="whitespace-pre-wrap break-words text-2xs text-gray-700">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuditLogViewer Component
// ---------------------------------------------------------------------------

export default function AuditLogViewer({
  applicationId: initialApplicationId,
  userId: initialUserId,
  className,
}: AuditLogViewerProps) {
  const { data: session } = useSession();
  const router = useRouter();

  // Data state
  const [auditLogs, setAuditLogs] = React.useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // Pagination state
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [hasNextPage, setHasNextPage] = React.useState(false);
  const [hasPreviousPage, setHasPreviousPage] = React.useState(false);

  // Sort state
  const [sortBy, setSortBy] = React.useState("createdAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Filter state
  const [filters, setFilters] = React.useState<AuditLogFilters>({
    applicationId: initialApplicationId ?? "",
    userId: initialUserId ?? "",
    action: "",
    entityType: "",
    outcome: "",
    startDate: "",
    endDate: "",
  });

  const [showFilters, setShowFilters] = React.useState(
    !!(initialApplicationId || initialUserId)
  );

  // Expanded details state
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(
    new Set()
  );

  // Export state
  const [exporting, setExporting] = React.useState(false);
  const [exportSuccess, setExportSuccess] = React.useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch audit logs
  // ---------------------------------------------------------------------------

  const fetchAuditLogs = React.useCallback(async () => {
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      if (filters.applicationId.trim()) {
        params.set("applicationId", filters.applicationId.trim());
      }
      if (filters.userId.trim()) {
        params.set("userId", filters.userId.trim());
      }
      if (filters.action.trim()) {
        params.set("action", filters.action.trim());
      }
      if (filters.entityType.trim()) {
        params.set("entityType", filters.entityType.trim());
      }
      if (filters.outcome.trim()) {
        params.set("outcome", filters.outcome.trim());
      }
      if (filters.startDate.trim()) {
        params.set("startDate", filters.startDate.trim());
      }
      if (filters.endDate.trim()) {
        params.set("endDate", filters.endDate.trim());
      }

      const response = await fetch(`/api/audit?${params.toString()}`);
      const data: ApiResponse<AuditLogApiResponse> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || `Failed to fetch audit logs (${response.status})`;
        setError(errorMessage);
        return;
      }

      if (data.data) {
        setAuditLogs(data.data.items);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
        setHasNextPage(data.data.hasNextPage);
        setHasPreviousPage(data.data.hasPreviousPage);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    }
  }, [page, pageSize, sortBy, sortOrder, filters]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await fetchAuditLogs();
      if (!cancelled) {
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchAuditLogs]);

  // ---------------------------------------------------------------------------
  // Refresh handler
  // ---------------------------------------------------------------------------

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAuditLogs();
    setRefreshing(false);
  };

  // ---------------------------------------------------------------------------
  // Filter handlers
  // ---------------------------------------------------------------------------

  const handleFilterChange = (
    field: keyof AuditLogFilters,
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      applicationId: "",
      userId: "",
      action: "",
      entityType: "",
      outcome: "",
      startDate: "",
      endDate: "",
    });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(
    (v) => v.trim() !== ""
  );

  // ---------------------------------------------------------------------------
  // Sort handler
  // ---------------------------------------------------------------------------

  const handleSort = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  // ---------------------------------------------------------------------------
  // Pagination handlers
  // ---------------------------------------------------------------------------

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setExpandedRows(new Set());
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    setExpandedRows(new Set());
  };

  // ---------------------------------------------------------------------------
  // Expand/collapse details
  // ---------------------------------------------------------------------------

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Export handler
  // ---------------------------------------------------------------------------

  const handleExport = async () => {
    setExporting(true);
    setExportSuccess(null);

    try {
      // Fetch all matching records (up to a reasonable limit)
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "1000");
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      if (filters.applicationId.trim()) {
        params.set("applicationId", filters.applicationId.trim());
      }
      if (filters.userId.trim()) {
        params.set("userId", filters.userId.trim());
      }
      if (filters.action.trim()) {
        params.set("action", filters.action.trim());
      }
      if (filters.entityType.trim()) {
        params.set("entityType", filters.entityType.trim());
      }
      if (filters.outcome.trim()) {
        params.set("outcome", filters.outcome.trim());
      }
      if (filters.startDate.trim()) {
        params.set("startDate", filters.startDate.trim());
      }
      if (filters.endDate.trim()) {
        params.set("endDate", filters.endDate.trim());
      }

      const response = await fetch(`/api/audit?${params.toString()}`);
      const data: ApiResponse<AuditLogApiResponse> = await response.json();

      if (!response.ok || !data.success || !data.data) {
        setError("Failed to export audit logs");
        return;
      }

      const items = data.data.items;

      // Build CSV content
      const headers = [
        "Timestamp",
        "User",
        "User Email",
        "Action",
        "Entity Type",
        "Entity ID",
        "Application ID",
        "IP Address",
        "Outcome",
        "Details",
      ];

      const rows = items.map((item) => [
        item.createdAt,
        item.user?.name ?? "System",
        item.user?.email ?? "—",
        item.action,
        item.entityType,
        item.entityId,
        item.applicationId ?? "—",
        item.ipAddress ?? "—",
        item.outcome,
        item.details ? JSON.stringify(item.details) : "—",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const escaped = String(cell).replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(",")
        ),
      ].join("\n");

      // Trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(
        `Exported ${items.length} audit log entries to CSV.`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setExporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------

  const columns: ColumnDefinition<AuditLogEntry>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      sortable: true,
      width: "w-40",
      render: (item) => (
        <time
          className="whitespace-nowrap text-xs text-gray-700"
          dateTime={item.createdAt}
        >
          {formatDate(item.createdAt, "dd MMM yyyy, HH:mm:ss")}
        </time>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (item) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {item.user?.name ?? "System"}
          </p>
          {item.user?.email && (
            <p className="truncate text-xs text-gray-500">
              {item.user.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (item) => (
        <Badge
          variant={getActionBadgeVariant(item.action)}
          size="sm"
        >
          {formatActionLabel(item.action)}
        </Badge>
      ),
    },
    {
      key: "entityType",
      header: "Entity",
      sortable: true,
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm text-gray-700">{item.entityType}</p>
          <p className="truncate text-xs text-gray-400" title={item.entityId}>
            {item.entityId.length > 12
              ? `${item.entityId.slice(0, 8)}…`
              : item.entityId}
          </p>
        </div>
      ),
    },
    {
      key: "details",
      header: "Details",
      render: (item) => (
        <DetailsExpandRow
          entry={item}
          expanded={expandedRows.has(item.id)}
          onToggle={() => toggleRowExpanded(item.id)}
        />
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (item) => (
        <span className="text-xs text-gray-500">
          {item.ipAddress ?? "—"}
        </span>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      sortable: true,
      render: (item) => (
        <Badge
          variant={getOutcomeBadgeVariant(item.outcome)}
          size="sm"
        >
          {item.outcome}
        </Badge>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Sort config
  // ---------------------------------------------------------------------------

  const sortConfig: SortConfig = {
    sortBy,
    sortOrder,
    onSort: handleSort,
  };

  // ---------------------------------------------------------------------------
  // Pagination config
  // ---------------------------------------------------------------------------

  const paginationConfig: PaginationConfig = {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    pageSizeOptions: [10, 20, 50, 100],
  };

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const successCount = auditLogs.filter(
    (l) => l.outcome === "SUCCESS"
  ).length;
  const deniedCount = auditLogs.filter(
    (l) => l.outcome === "DENIED"
  ).length;

  // ---------------------------------------------------------------------------
  // Error State (full page)
  // ---------------------------------------------------------------------------

  if (error && auditLogs.length === 0 && !loading) {
    return (
      <div className={cn("w-full", className)}>
        <Alert
          variant="error"
          title="Failed to Load Audit Logs"
          dismissible
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Success / Error Alerts */}
      {exportSuccess && (
        <Alert
          variant="success"
          title="Export Complete"
          dismissible
          onDismiss={() => setExportSuccess(null)}
        >
          {exportSuccess}
        </Alert>
      )}

      {error && auditLogs.length > 0 && (
        <Alert
          variant="error"
          title="Error"
          dismissible
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Header Card */}
      <Card>
        <CardHeader
          title="Audit Log"
          subtitle={`${total} audit log entries recorded`}
          action={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                icon={<FilterIcon />}
                iconPosition="left"
              >
                {showFilters ? "Hide Filters" : "Filters"}
                {hasActiveFilters && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-2xs font-bold text-white">
                    !
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                loading={refreshing}
                disabled={refreshing || loading}
                icon={!refreshing ? <RefreshIcon /> : undefined}
                iconPosition="left"
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleExport}
                loading={exporting}
                disabled={exporting || loading || total === 0}
                icon={!exporting ? <DownloadIcon /> : undefined}
                iconPosition="left"
              >
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            </div>
          }
        />

        {/* Summary Stats */}
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{total}</p>
              <p className="text-xs font-medium text-blue-600">Total Entries</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {successCount}
              </p>
              <p className="text-xs font-medium text-green-600">
                Success (Page)
              </p>
            </div>
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                deniedCount > 0
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-gray-50"
              )}
            >
              <p
                className={cn(
                  "text-2xl font-bold",
                  deniedCount > 0 ? "text-red-700" : "text-gray-700"
                )}
              >
                {deniedCount}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  deniedCount > 0 ? "text-red-600" : "text-gray-600"
                )}
              >
                Denied (Page)
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{totalPages}</p>
              <p className="text-xs font-medium text-gray-600">Total Pages</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader
            title="Filters"
            subtitle="Narrow down audit log entries"
            action={
              hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  icon={<ClearIcon />}
                  iconPosition="left"
                >
                  Clear All
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Application ID */}
              <Input
                label="Application ID"
                name="filterApplicationId"
                type="text"
                placeholder="Enter application ID or UUID"
                value={filters.applicationId}
                onChange={(e) =>
                  handleFilterChange("applicationId", e.target.value)
                }
                size="sm"
              />

              {/* User ID */}
              <Input
                label="User ID"
                name="filterUserId"
                type="text"
                placeholder="Enter user UUID"
                value={filters.userId}
                onChange={(e) =>
                  handleFilterChange("userId", e.target.value)
                }
                size="sm"
              />

              {/* Action */}
              <Select
                label="Action"
                name="filterAction"
                options={ACTION_OPTIONS}
                value={filters.action}
                onChange={(e) =>
                  handleFilterChange("action", e.target.value)
                }
                size="sm"
              />

              {/* Entity Type */}
              <Select
                label="Entity Type"
                name="filterEntityType"
                options={ENTITY_TYPE_OPTIONS}
                value={filters.entityType}
                onChange={(e) =>
                  handleFilterChange("entityType", e.target.value)
                }
                size="sm"
              />

              {/* Outcome */}
              <Select
                label="Outcome"
                name="filterOutcome"
                options={OUTCOME_OPTIONS}
                value={filters.outcome}
                onChange={(e) =>
                  handleFilterChange("outcome", e.target.value)
                }
                size="sm"
              />

              {/* Start Date */}
              <div className="w-full">
                <label
                  htmlFor="filterStartDate"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Start Date
                </label>
                <input
                  id="filterStartDate"
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange(
                      "startDate",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : ""
                    )
                  }
                  className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-normal text-gray-900 outline-none transition-colors focus:border-[var(--dbs-dark-blue)] focus:ring-2 focus:ring-[var(--dbs-dark-blue)]/15"
                />
              </div>

              {/* End Date */}
              <div className="w-full">
                <label
                  htmlFor="filterEndDate"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  End Date
                </label>
                <input
                  id="filterEndDate"
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange(
                      "endDate",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : ""
                    )
                  }
                  className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-normal text-gray-900 outline-none transition-colors focus:border-[var(--dbs-dark-blue)] focus:ring-2 focus:ring-[var(--dbs-dark-blue)]/15"
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500">
                  Active filters:
                </span>
                {filters.applicationId && (
                  <Badge variant="info" size="sm">
                    App: {filters.applicationId}
                  </Badge>
                )}
                {filters.userId && (
                  <Badge variant="info" size="sm">
                    User: {filters.userId.slice(0, 8)}…
                  </Badge>
                )}
                {filters.action && (
                  <Badge variant="info" size="sm">
                    Action: {formatActionLabel(filters.action)}
                  </Badge>
                )}
                {filters.entityType && (
                  <Badge variant="info" size="sm">
                    Entity: {filters.entityType}
                  </Badge>
                )}
                {filters.outcome && (
                  <Badge variant="info" size="sm">
                    Outcome: {filters.outcome}
                  </Badge>
                )}
                {filters.startDate && (
                  <Badge variant="info" size="sm">
                    From: {formatDate(filters.startDate, "dd MMM yyyy")}
                  </Badge>
                )}
                {filters.endDate && (
                  <Badge variant="info" size="sm">
                    To: {formatDate(filters.endDate, "dd MMM yyyy")}
                  </Badge>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Audit Log Table */}
      <Table<AuditLogEntry>
        columns={columns}
        data={auditLogs}
        keyExtractor={(item) => item.id}
        loading={loading}
        skeletonRows={pageSize > 10 ? 10 : pageSize}
        sort={sortConfig}
        pagination={paginationConfig}
        emptyMessage="No audit log entries found matching the current filters."
        emptyState={
          <div className="flex flex-col items-center justify-center py-12">
            <DocumentIcon className="mb-3 h-10 w-10 text-gray-300" />
            <p className="mb-1 text-sm font-medium text-gray-700">
              No Audit Logs Found
            </p>
            <p className="mb-4 text-xs text-gray-500">
              {hasActiveFilters
                ? "No entries match the current filters. Try adjusting your filter criteria."
                : "No audit log entries have been recorded yet."}
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                icon={<ClearIcon />}
                iconPosition="left"
              >
                Clear Filters
              </Button>
            )}
          </div>
        }
        hoverable
        compact
      />

      {/* Summary Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          {total > 0
            ? `Showing page ${page} of ${totalPages} — ${total} total audit log entries.`
            : "No audit log entries to display."}
          {hasActiveFilters && " Filters are active."}
        </p>
      </div>
    </div>
  );
}

export { AuditLogViewer };
export type { AuditLogViewerProps };