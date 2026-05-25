"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/lib/constants";
import type { ApplicationStatusEnum } from "@prisma/client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApplicationCardProps {
  /** Internal UUID of the application */
  id: string;
  /** Human-readable application ID (e.g. DBS-1001) */
  applicationId: string;
  /** Full name of the applicant */
  applicantName: string;
  /** Type of loan (e.g. Personal Loan, Home Loan) */
  loanType: string;
  /** Requested loan amount in SGD */
  loanAmount: number;
  /** Current application status */
  status: ApplicationStatusEnum;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** ISO timestamp of creation */
  createdAt?: string;
  /** Optional callback fired when the View button is clicked */
  onView?: (applicationId: string) => void;
  /** Optional callback fired when the Continue button is clicked */
  onContinue?: (applicationId: string) => void;
  /** Optional class names for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
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

function getStatusLabel(status: ApplicationStatusEnum): string {
  const config = APPLICATION_STATUSES[status];
  return config ? config.label : status;
}

function canContinue(status: ApplicationStatusEnum): boolean {
  const continuableStatuses: ApplicationStatusEnum[] = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "DOCUMENTS_PENDING",
    "EXTRACTION_COMPLETE",
    "VALIDATION_COMPLETE",
    "RECOMMENDATION_GENERATED",
    "ANALYST_REVIEW",
    "RETURNED",
  ];
  return continuableStatuses.includes(status);
}

function getContinueHref(
  applicationId: string,
  status: ApplicationStatusEnum
): string {
  switch (status) {
    case "DRAFT":
      return `/applications/${applicationId}/applicant`;
    case "SUBMITTED":
      return `/applications/${applicationId}/applicant`;
    case "UNDER_REVIEW":
    case "DOCUMENTS_PENDING":
      return `/applications/${applicationId}/documents`;
    case "EXTRACTION_COMPLETE":
    case "VALIDATION_COMPLETE":
      return `/applications/${applicationId}/verification`;
    case "RECOMMENDATION_GENERATED":
    case "ANALYST_REVIEW":
      return `/applications/${applicationId}/review`;
    case "RETURNED":
      return `/applications/${applicationId}/documents`;
    default:
      return `/applications/${applicationId}`;
  }
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

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

function EyeIcon({ className }: { className?: string }) {
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
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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

function UserIcon({ className }: { className?: string }) {
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
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function CurrencyIcon({ className }: { className?: string }) {
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
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ApplicationCard Component
// ---------------------------------------------------------------------------

export default function ApplicationCard({
  id,
  applicationId,
  applicantName,
  loanType,
  loanAmount,
  status,
  updatedAt,
  createdAt,
  onView,
  onContinue,
  className,
}: ApplicationCardProps) {
  const router = useRouter();

  const showContinue = canContinue(status);
  const continueHref = getContinueHref(applicationId, status);

  const handleView = () => {
    if (onView) {
      onView(applicationId);
    } else {
      router.push(`/applications/${applicationId}`);
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue(applicationId);
    } else {
      router.push(continueHref);
    }
  };

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-card-hover",
        className
      )}
    >
      <CardBody>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left Section: Application Info */}
          <div className="min-w-0 flex-1">
            {/* Header: Application ID + Status Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <DocumentIcon className="flex-shrink-0 text-gray-400" />
                <Link
                  href={`/applications/${applicationId}`}
                  className="text-sm font-bold text-gray-900 no-underline hover:text-[var(--dbs-dark-blue)] hover:underline"
                >
                  {applicationId}
                </Link>
              </div>
              <Badge
                variant={getStatusBadgeVariant(status)}
                size="sm"
              >
                {getStatusLabel(status)}
              </Badge>
            </div>

            {/* Applicant Name */}
            <div className="mt-2 flex items-center gap-1.5">
              <UserIcon className="flex-shrink-0 text-gray-400" />
              <p className="truncate text-sm font-medium text-gray-900">
                {applicantName}
              </p>
            </div>

            {/* Loan Details */}
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Badge variant="default" size="sm">
                  {loanType}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <CurrencyIcon className="flex-shrink-0 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">
                  {formatCurrency(loanAmount)}
                </span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <ClockIcon className="flex-shrink-0 text-gray-400" />
                <span>
                  Updated:{" "}
                  <time dateTime={updatedAt}>
                    {formatDate(updatedAt, "dd MMM yyyy, HH:mm")}
                  </time>
                </span>
              </div>
              {createdAt && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span>
                    Created:{" "}
                    <time dateTime={createdAt}>
                      {formatDate(createdAt, "dd MMM yyyy")}
                    </time>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Action Buttons */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleView}
              icon={<EyeIcon />}
              iconPosition="left"
            >
              View
            </Button>
            {showContinue && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleContinue}
                icon={<ArrowRightIcon />}
                iconPosition="right"
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export { ApplicationCard };
export type { ApplicationCardProps };