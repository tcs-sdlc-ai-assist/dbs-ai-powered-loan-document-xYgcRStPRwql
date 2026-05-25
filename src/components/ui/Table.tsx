"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortOrder = "asc" | "desc";

interface ColumnDefinition<T> {
  /** Unique key for the column, typically matching a property name on T */
  key: string;
  /** Display header label */
  header: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Custom render function for the cell */
  render?: (item: T, index: number) => React.ReactNode;
  /** Additional class names for the header cell */
  headerClassName?: string;
  /** Additional class names for the body cell */
  cellClassName?: string;
  /** Column width (Tailwind class like "w-40") */
  width?: string;
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

interface SortConfig {
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (sortBy: string, sortOrder: SortOrder) => void;
}

interface TableProps<T> {
  /** Column definitions */
  columns: ColumnDefinition<T>[];
  /** Data array to render */
  data: T[];
  /** Unique key extractor for each row */
  keyExtractor: (item: T, index: number) => string;
  /** Whether the table is in a loading state */
  loading?: boolean;
  /** Number of skeleton rows to show when loading */
  skeletonRows?: number;
  /** Sort configuration */
  sort?: SortConfig;
  /** Pagination configuration */
  pagination?: PaginationConfig;
  /** Message to display when data is empty */
  emptyMessage?: string;
  /** Custom empty state component */
  emptyState?: React.ReactNode;
  /** Callback when a row is clicked */
  onRowClick?: (item: T, index: number) => void;
  /** Additional class names for the table wrapper */
  className?: string;
  /** Additional class names for the table element */
  tableClassName?: string;
  /** Whether rows should have hover styles */
  hoverable?: boolean;
  /** Whether the table should have striped rows */
  striped?: boolean;
  /** Whether the table should be compact */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Sort Icon
// ---------------------------------------------------------------------------

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortOrder;
}) {
  if (!active) {
    return (
      <svg
        className="ml-1 inline-block h-3 w-3 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }

  if (direction === "asc") {
    return (
      <svg
        className="ml-1 inline-block h-3 w-3 text-gray-900"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 15l7-7 7 7"
        />
      </svg>
    );
  }

  return (
    <svg
      className="ml-1 inline-block h-3 w-3 text-gray-900"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
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
// Chevron Icons for Pagination
// ---------------------------------------------------------------------------

function ChevronLeftIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Row
// ---------------------------------------------------------------------------

function SkeletonRow<T>({
  columns,
  compact,
}: {
  columns: ColumnDefinition<T>[];
  compact?: boolean;
}) {
  return (
    <tr className="border-b border-gray-100">
      {columns.map((col) => (
        <td
          key={col.key}
          className={cn(
            compact ? "px-4 py-2" : "px-6 py-4",
            col.cellClassName
          )}
        >
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function DefaultEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <svg
        className="mb-3 h-12 w-12 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination Controls
// ---------------------------------------------------------------------------

function PaginationControls({
  pagination,
}: {
  pagination: PaginationConfig;
}) {
  const {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions,
  } = pagination;

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const effectivePageSizeOptions = pageSizeOptions ?? [10, 20, 50, 100];

  // Generate visible page numbers
  const getVisiblePages = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];

    pages.push(1);

    if (page > 3) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) {
      pages.push("ellipsis");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-6 py-3 sm:flex-row">
      {/* Left: showing X to Y of Z */}
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-medium text-gray-700">{startItem}</span> to{" "}
          <span className="font-medium text-gray-700">{endItem}</span> of{" "}
          <span className="font-medium text-gray-700">{total}</span> results
        </p>

        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-[var(--dbs-dark-blue)] focus:ring-1 focus:ring-[var(--dbs-dark-blue)]/15"
            aria-label="Page size"
          >
            {effectivePageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Right: page navigation */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          className={cn(
            "inline-flex items-center justify-center rounded-md border px-2 py-1.5 text-sm transition-colors",
            hasPreviousPage
              ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300"
          )}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </button>

        {/* Page numbers */}
        {visiblePages.map((pageNum, idx) => {
          if (pageNum === "ellipsis") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1.5 text-sm text-gray-400"
              >
                …
              </span>
            );
          }

          const isCurrentPage = pageNum === page;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              disabled={isCurrentPage}
              className={cn(
                "inline-flex min-w-[2rem] items-center justify-center rounded-md border px-2 py-1.5 text-sm font-medium transition-colors",
                isCurrentPage
                  ? "border-[var(--dbs-dark-blue)] bg-[var(--dbs-dark-blue)] text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              )}
              aria-label={`Page ${pageNum}`}
              aria-current={isCurrentPage ? "page" : undefined}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className={cn(
            "inline-flex items-center justify-center rounded-md border px-2 py-1.5 text-sm transition-colors",
            hasNextPage
              ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300"
          )}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Component
// ---------------------------------------------------------------------------

function TableInner<T>(
  {
    columns,
    data,
    keyExtractor,
    loading = false,
    skeletonRows = 5,
    sort,
    pagination,
    emptyMessage = "No data available",
    emptyState,
    onRowClick,
    className,
    tableClassName,
    hoverable = true,
    striped = false,
    compact = false,
  }: TableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const handleSort = (columnKey: string) => {
    if (!sort) return;

    const newOrder: SortOrder =
      sort.sortBy === columnKey && sort.sortOrder === "asc" ? "desc" : "asc";

    sort.onSort(columnKey, newOrder);
  };

  const handleRowClick = (item: T, index: number) => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    item: T,
    index: number
  ) => {
    if (onRowClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onRowClick(item, index);
    }
  };

  const cellPadding = compact ? "px-4 py-2" : "px-6 py-4";
  const headerPadding = compact ? "px-4 py-2" : "px-6 py-3";

  const isEmpty = !loading && data.length === 0;

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-lg border border-gray-200 bg-white shadow-card",
        className
      )}
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className={cn("w-full", tableClassName)}>
          {/* Header */}
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable && sort;
                const isActiveSort = sort && sort.sortBy === col.key;

                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      headerPadding,
                      "text-left text-xs font-semibold uppercase tracking-wider text-gray-500",
                      isSortable && "cursor-pointer select-none hover:text-gray-700",
                      isActiveSort && "text-gray-900",
                      col.width,
                      col.headerClassName
                    )}
                    onClick={
                      isSortable ? () => handleSort(col.key) : undefined
                    }
                    aria-sort={
                      isActiveSort
                        ? sort.sortOrder === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center">
                      {col.header}
                      {isSortable && (
                        <SortIcon
                          active={!!isActiveSort}
                          direction={isActiveSort ? sort.sortOrder : "asc"}
                        />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {/* Loading skeleton */}
            {loading &&
              Array.from({ length: skeletonRows }).map((_, idx) => (
                <SkeletonRow
                  key={`skeleton-${idx}`}
                  columns={columns}
                  compact={compact}
                />
              ))}

            {/* Empty state */}
            {isEmpty && (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState ?? (
                    <DefaultEmptyState message={emptyMessage} />
                  )}
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading &&
              data.map((item, rowIndex) => {
                const rowKey = keyExtractor(item, rowIndex);
                const isClickable = !!onRowClick;

                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      "border-b border-gray-100 transition-colors",
                      hoverable && "hover:bg-gray-50",
                      striped && rowIndex % 2 === 1 && "bg-gray-50/50",
                      isClickable && "cursor-pointer"
                    )}
                    onClick={
                      isClickable
                        ? () => handleRowClick(item, rowIndex)
                        : undefined
                    }
                    onKeyDown={
                      isClickable
                        ? (e) => handleRowKeyDown(e, item, rowIndex)
                        : undefined
                    }
                    tabIndex={isClickable ? 0 : undefined}
                    role={isClickable ? "button" : undefined}
                  >
                    {columns.map((col) => {
                      const cellContent = col.render
                        ? col.render(item, rowIndex)
                        : (item as Record<string, unknown>)[col.key] != null
                          ? String((item as Record<string, unknown>)[col.key])
                          : "—";

                      return (
                        <td
                          key={col.key}
                          className={cn(
                            cellPadding,
                            "text-sm text-gray-700",
                            col.cellClassName
                          )}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !loading && !isEmpty && (
        <PaginationControls pagination={pagination} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forward ref with generics
// ---------------------------------------------------------------------------

// React.forwardRef does not support generics directly, so we use a wrapper
// pattern that preserves the generic type parameter.

const Table = React.forwardRef(TableInner) as <T>(
  props: TableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default Table;
export { Table, PaginationControls };
export type {
  TableProps,
  ColumnDefinition,
  PaginationConfig,
  SortConfig,
  SortOrder,
};