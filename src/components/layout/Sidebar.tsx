"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ApplicationStatusEnum } from "@prisma/client";
import { APPLICATION_STATUSES, WORKFLOW_STEPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Workflow Step Definitions for Sidebar
// ---------------------------------------------------------------------------

interface SidebarStep {
  key: string;
  label: string;
  description: string;
  href: (applicationId: string) => string;
  /** Application statuses at which this step is considered "completed" */
  completedStatuses: ApplicationStatusEnum[];
  /** Application statuses at which this step is considered "active" / current */
  activeStatuses: ApplicationStatusEnum[];
  /** Application statuses at which this step should be visible */
  visibleStatuses: ApplicationStatusEnum[];
}

const ALL_STATUSES: ApplicationStatusEnum[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "DOCUMENTS_PENDING",
  "EXTRACTION_IN_PROGRESS",
  "EXTRACTION_COMPLETE",
  "VALIDATION_IN_PROGRESS",
  "VALIDATION_COMPLETE",
  "RECOMMENDATION_GENERATED",
  "ANALYST_REVIEW",
  "APPROVED",
  "REJECTED",
  "RETURNED",
  "CANCELLED",
];

const SIDEBAR_STEPS: SidebarStep[] = [
  {
    key: "intake",
    label: "Intake",
    description: "Application submission",
    href: (id) => `/dashboard/applications/${id}`,
    completedStatuses: [
      "SUBMITTED",
      "UNDER_REVIEW",
      "DOCUMENTS_PENDING",
      "EXTRACTION_IN_PROGRESS",
      "EXTRACTION_COMPLETE",
      "VALIDATION_IN_PROGRESS",
      "VALIDATION_COMPLETE",
      "RECOMMENDATION_GENERATED",
      "ANALYST_REVIEW",
      "APPROVED",
      "REJECTED",
      "RETURNED",
      "CANCELLED",
    ],
    activeStatuses: ["DRAFT"],
    visibleStatuses: ALL_STATUSES,
  },
  {
    key: "applicant",
    label: "Applicant Entry",
    description: "Applicant details",
    href: (id) => `/dashboard/applications/${id}/applicant`,
    completedStatuses: [
      "UNDER_REVIEW",
      "DOCUMENTS_PENDING",
      "EXTRACTION_IN_PROGRESS",
      "EXTRACTION_COMPLETE",
      "VALIDATION_IN_PROGRESS",
      "VALIDATION_COMPLETE",
      "RECOMMENDATION_GENERATED",
      "ANALYST_REVIEW",
      "APPROVED",
      "REJECTED",
      "RETURNED",
      "CANCELLED",
    ],
    activeStatuses: ["SUBMITTED"],
    visibleStatuses: ALL_STATUSES,
  },
  {
    key: "documents",
    label: "Upload Docs",
    description: "Document upload",
    href: (id) => `/dashboard/applications/${id}/documents`,
    completedStatuses: [
      "EXTRACTION_IN_PROGRESS",
      "EXTRACTION_COMPLETE",
      "VALIDATION_IN_PROGRESS",
      "VALIDATION_COMPLETE",
      "RECOMMENDATION_GENERATED",
      "ANALYST_REVIEW",
      "APPROVED",
      "REJECTED",
    ],
    activeStatuses: ["UNDER_REVIEW", "DOCUMENTS_PENDING"],
    visibleStatuses: ALL_STATUSES,
  },
  {
    key: "verification",
    label: "AI Verification",
    description: "Extraction & validation",
    href: (id) => `/dashboard/applications/${id}/verification`,
    completedStatuses: [
      "VALIDATION_COMPLETE",
      "RECOMMENDATION_GENERATED",
      "ANALYST_REVIEW",
      "APPROVED",
      "REJECTED",
    ],
    activeStatuses: [
      "EXTRACTION_IN_PROGRESS",
      "EXTRACTION_COMPLETE",
      "VALIDATION_IN_PROGRESS",
    ],
    visibleStatuses: [
      "UNDER_REVIEW",
      "DOCUMENTS_PENDING",
      "EXTRACTION_IN_PROGRESS",
      "EXTRACTION_COMPLETE",
      "VALIDATION_IN_PROGRESS",
      "VALIDATION_COMPLETE",
      "RECOMMENDATION_GENERATED",
      "ANALYST_REVIEW",
      "APPROVED",
      "REJECTED",
      "RETURNED",
      "CANCELLED",
    ],
  },
  {
    key: "review",
    label: "Review",
    description: "Analyst review & recommendation",
    href: (id) => `/dashboard/applications/${id}/review`,
    completedStatuses: ["APPROVED", "REJECTED"],
    activeStatuses: ["RECOMMENDATION_GENERATED", "ANALYST_REVIEW"],
    visibleStatuses: [
      "EXTRACTION_COMPLETE",
      "VALIDATION_IN_PROGRESS",
      "VALIDATION_COMPLETE",
      "RECOMMENDATION_GENERATED",
      "ANALYST_REVIEW",
      "APPROVED",
      "REJECTED",
      "RETURNED",
      "CANCELLED",
    ],
  },
  {
    key: "summary",
    label: "Summary",
    description: "Final decision",
    href: (id) => `/dashboard/applications/${id}/summary`,
    completedStatuses: [],
    activeStatuses: ["APPROVED", "REJECTED", "CANCELLED"],
    visibleStatuses: [
      "RECOMMENDATION_GENERATED",
      "ANALYST_REVIEW",
      "APPROVED",
      "REJECTED",
      "RETURNED",
      "CANCELLED",
    ],
  },
];

// ---------------------------------------------------------------------------
// Step Status
// ---------------------------------------------------------------------------

type StepStatus = "completed" | "active" | "upcoming";

function getStepStatus(
  step: SidebarStep,
  applicationStatus: ApplicationStatusEnum
): StepStatus {
  if (step.activeStatuses.includes(applicationStatus)) {
    return "active";
  }
  if (step.completedStatuses.includes(applicationStatus)) {
    return "completed";
  }
  return "upcoming";
}

// ---------------------------------------------------------------------------
// Step Icon
// ---------------------------------------------------------------------------

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === "completed") {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: "var(--dbs-dark-blue)" }}
      >
        {index + 1}
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-sm font-medium text-gray-400">
      {index + 1}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar Props
// ---------------------------------------------------------------------------

interface SidebarProps {
  applicationId: string;
  applicationStatus: ApplicationStatusEnum;
}

// ---------------------------------------------------------------------------
// Sidebar Component
// ---------------------------------------------------------------------------

export default function Sidebar({
  applicationId,
  applicationStatus,
}: SidebarProps) {
  const pathname = usePathname();

  const visibleSteps = SIDEBAR_STEPS.filter((step) =>
    step.visibleStatuses.includes(applicationStatus)
  );

  const statusConfig = APPLICATION_STATUSES[applicationStatus];

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="card sticky top-6">
        {/* Application Status Badge */}
        <div className="card-header">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Application Status
          </p>
          <span
            className={cn(
              "badge mt-1",
              statusConfig ? statusConfig.color : "bg-gray-100 text-gray-800"
            )}
          >
            {statusConfig ? statusConfig.label : applicationStatus}
          </span>
        </div>

        {/* Workflow Steps */}
        <nav className="card-body p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
            Workflow
          </p>
          <ol className="relative space-y-1">
            {visibleSteps.map((step, index) => {
              const stepStatus = getStepStatus(step, applicationStatus);
              const stepHref = step.href(applicationId);
              const isCurrentPage =
                pathname === stepHref ||
                (step.key === "intake" &&
                  pathname === `/dashboard/applications/${applicationId}` &&
                  !visibleSteps.some(
                    (s) =>
                      s.key !== "intake" && pathname === s.href(applicationId)
                  ));

              const isClickable =
                stepStatus === "completed" || stepStatus === "active";

              return (
                <li key={step.key}>
                  {isClickable ? (
                    <Link
                      href={stepHref}
                      className={cn(
                        "flex items-start gap-3 rounded-md px-3 py-2.5 no-underline transition-colors",
                        isCurrentPage
                          ? "bg-gray-100"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <StepIcon status={stepStatus} index={index} />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium leading-tight",
                            stepStatus === "active"
                              ? "text-gray-900"
                              : stepStatus === "completed"
                                ? "text-green-700"
                                : "text-gray-400"
                          )}
                        >
                          {step.label}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {step.description}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 rounded-md px-3 py-2.5">
                      <StepIcon status={stepStatus} index={index} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight text-gray-400">
                          {step.label}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Connector line between steps */}
                  {index < visibleSteps.length - 1 && (
                    <div className="ml-[22px] h-2 border-l-2 border-gray-200" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </aside>
  );
}