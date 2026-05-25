import { redirect, notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import applicationService from "@/lib/services/application-service";
import Card, { CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { APPLICATION_STATUSES, DOCUMENT_TYPES, RECOMMENDATION_TYPES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ApplicationStatusEnum, DocumentType, RecommendationType } from "@prisma/client";
import Link from "next/link";
import StatusTimeline from "@/components/features/StatusTimeline";

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { key: "intake", label: "Intake" },
  { key: "applicant", label: "Applicant Entry" },
  { key: "documents", label: "Upload Docs" },
  { key: "verification", label: "AI Verification" },
  { key: "review", label: "Review" },
  { key: "summary", label: "Summary" },
];

const CURRENT_STEP_INDEX = 5; // Step 6 of 6 (0-indexed)

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

function getExtractionStatusBadgeVariant(
  status: string
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

function getSeverityBadgeVariant(
  severity: string
): "danger" | "warning" | "info" | "default" {
  switch (severity) {
    case "CRITICAL":
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

function getDocumentTypeLabel(type: DocumentType): string {
  const config = DOCUMENT_TYPES[type];
  return config ? config.label : type;
}

function getRecommendationLabel(recommendation: RecommendationType): string {
  const config = RECOMMENDATION_TYPES[recommendation];
  return config ? config.label : recommendation;
}

function getStatusLabel(status: ApplicationStatusEnum): string {
  const config = APPLICATION_STATUSES[status];
  return config ? config.label : status;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
      className={className}
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
      className={className}
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function SummaryPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  const applicationId = params.id;

  // First try to find by internal UUID
  let application = await applicationService.getWithRelations(applicationId);

  // If not found by UUID, try by human-readable application ID (e.g. DBS-1001)
  if (!application) {
    const appByDisplayId = await applicationService.getByApplicationId(applicationId);

    if (appByDisplayId) {
      application = await applicationService.getWithRelations(appByDisplayId.id);
    }
  }

  if (!application) {
    notFound();
  }

  // ---------------------------------------------------------------------------
  // User role permissions
  // ---------------------------------------------------------------------------

  const userRole = session.user.role;
  const canApprove = userRole === "ADMIN" || userRole === "ANALYST" || userRole === "REVIEWER";
  const canReject = userRole === "ADMIN" || userRole === "ANALYST" || userRole === "REVIEWER";
  const canReturn = userRole === "ADMIN" || userRole === "ANALYST";
  const canSubmitForReview = userRole === "ADMIN" || userRole === "ANALYST";

  // Determine which actions are available based on current status
  const currentStatus = application.status;
  const showApproveButton =
    canApprove &&
    (currentStatus === "ANALYST_REVIEW" || currentStatus === "RECOMMENDATION_GENERATED");
  const showRejectButton =
    canReject &&
    (currentStatus === "ANALYST_REVIEW" || currentStatus === "RECOMMENDATION_GENERATED");
  const showReturnButton =
    canReturn &&
    (currentStatus === "ANALYST_REVIEW" || currentStatus === "UNDER_REVIEW");
  const showSubmitForReviewButton =
    canSubmitForReview &&
    (currentStatus === "VALIDATION_COMPLETE" || currentStatus === "EXTRACTION_COMPLETE");

  const isFinalStatus =
    currentStatus === "APPROVED" ||
    currentStatus === "REJECTED" ||
    currentStatus === "CANCELLED";

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const documents = application.documents ?? [];
  const discrepancies = application.validationDiscrepancies ?? [];
  const recommendations = application.recommendations ?? [];
  const reviews = application.analystReviews ?? [];
  const statusHistory = application.applicationStatusHistory ?? [];

  const latestRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  // Document stats
  const totalDocuments = documents.length;
  const documentsWithExtraction = documents.filter(
    (doc) => doc.extractionResult !== null
  );
  const completedExtractions = documentsWithExtraction.filter(
    (doc) =>
      doc.extractionResult?.status === "COMPLETED" ||
      doc.extractionResult?.status === "PARTIALLY_COMPLETED"
  );
  const failedExtractions = documentsWithExtraction.filter(
    (doc) => doc.extractionResult?.status === "FAILED"
  );

  // Extraction confidence
  const confidenceScores = completedExtractions
    .map((doc) => doc.extractionResult?.confidence ?? 0)
    .filter((c) => c > 0);
  const averageConfidence =
    confidenceScores.length > 0
      ? Math.round(
          (confidenceScores.reduce((sum, c) => sum + c, 0) /
            confidenceScores.length) *
            100
        ) / 100
      : 0;

  // Discrepancy stats
  const unresolvedDiscrepancies = discrepancies.filter((d) => !d.resolved);
  const resolvedDiscrepancies = discrepancies.filter((d) => d.resolved);
  const criticalDiscrepancies = unresolvedDiscrepancies.filter(
    (d) => d.severity === "CRITICAL"
  );
  const highDiscrepancies = unresolvedDiscrepancies.filter(
    (d) => d.severity === "HIGH"
  );

  // Review stats
  const overrideReviews = reviews.filter((r) => r.isOverride);

  const appId = application.applicationId;

  const stepProgressItems = STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    completed: index < CURRENT_STEP_INDEX,
    active: index === CURRENT_STEP_INDEX,
  }));

  return (
    <div className="space-y-6">
      {/* Step Indicator Card */}
      <Card>
        <CardHeader
          title="Application Progress"
          subtitle={`Step ${CURRENT_STEP_INDEX + 1} of ${STEPS.length} — Summary`}
        />
        <CardBody>
          <ProgressBar
            steps={stepProgressItems}
            size="md"
            variant="default"
            showLabel
            labelPosition="top"
            showStepLabels
          />
        </CardBody>
      </Card>

      {/* Final Status Banner */}
      {isFinalStatus && (
        <div
          className={`rounded-lg border-2 p-6 text-center ${
            currentStatus === "APPROVED"
              ? "border-green-300 bg-green-50"
              : currentStatus === "REJECTED"
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            {currentStatus === "APPROVED" ? (
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            ) : currentStatus === "REJECTED" ? (
              <XCircleIcon className="h-8 w-8 text-red-500" />
            ) : (
              <WarningIcon className="h-8 w-8 text-gray-500" />
            )}
            <h2
              className={`text-2xl font-bold ${
                currentStatus === "APPROVED"
                  ? "text-green-800"
                  : currentStatus === "REJECTED"
                    ? "text-red-800"
                    : "text-gray-800"
              }`}
            >
              Application {getStatusLabel(currentStatus)}
            </h2>
          </div>
          <p
            className={`text-sm ${
              currentStatus === "APPROVED"
                ? "text-green-700"
                : currentStatus === "REJECTED"
                  ? "text-red-700"
                  : "text-gray-700"
            }`}
          >
            {currentStatus === "APPROVED"
              ? "This loan application has been approved. All verification checks have been completed."
              : currentStatus === "REJECTED"
                ? "This loan application has been rejected. Please review the discrepancies and recommendation details."
                : "This application has been cancelled."}
          </p>
        </div>
      )}

      {/* Applicant Details Summary */}
      <Card>
        <CardHeader
          title="Applicant Details"
          subtitle="Core application information"
          action={
            <Badge variant={getStatusBadgeVariant(currentStatus)} size="md">
              {getStatusLabel(currentStatus)}
            </Badge>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Applicant Name */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">
                  Applicant Name
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {application.applicantName}
              </p>
            </div>

            {/* Loan Type */}
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">
                Loan Type
              </p>
              <Badge variant="default" size="md">
                {application.loanType}
              </Badge>
            </div>

            {/* Loan Amount */}
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">
                Loan Amount
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(application.loanAmount)}
              </p>
            </div>

            {/* Application ID */}
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">
                Application ID
              </p>
              <p className="text-sm font-medium text-gray-900">
                {application.applicationId}
              </p>
            </div>

            {/* Created */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">Created</p>
              </div>
              <p className="text-sm text-gray-700">
                {formatDate(application.createdAt, "dd MMM yyyy, HH:mm")}
              </p>
            </div>

            {/* Last Updated */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">
                  Last Updated
                </p>
              </div>
              <p className="text-sm text-gray-700">
                {formatDate(application.updatedAt, "dd MMM yyyy, HH:mm")}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Documents */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
          <DocumentIcon className="mx-auto mb-1 h-6 w-6 text-blue-500" />
          <p className="text-2xl font-bold text-blue-700">{totalDocuments}</p>
          <p className="text-xs font-medium text-blue-600">Documents</p>
        </div>

        {/* Extractions */}
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center">
          <SparklesIcon className="mx-auto mb-1 h-6 w-6 text-purple-500" />
          <p className="text-2xl font-bold text-purple-700">
            {completedExtractions.length}
          </p>
          <p className="text-xs font-medium text-purple-600">Extractions</p>
        </div>

        {/* Discrepancies */}
        <div
          className={`rounded-lg border p-4 text-center ${
            unresolvedDiscrepancies.length > 0
              ? "border-yellow-200 bg-yellow-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          {unresolvedDiscrepancies.length > 0 ? (
            <WarningIcon className="mx-auto mb-1 h-6 w-6 text-yellow-500" />
          ) : (
            <CheckCircleIcon className="mx-auto mb-1 h-6 w-6 text-green-500" />
          )}
          <p
            className={`text-2xl font-bold ${
              unresolvedDiscrepancies.length > 0
                ? "text-yellow-700"
                : "text-green-700"
            }`}
          >
            {unresolvedDiscrepancies.length}
          </p>
          <p
            className={`text-xs font-medium ${
              unresolvedDiscrepancies.length > 0
                ? "text-yellow-600"
                : "text-green-600"
            }`}
          >
            Unresolved
          </p>
        </div>

        {/* Reviews */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <ChatBubbleIcon className="mx-auto mb-1 h-6 w-6 text-gray-500" />
          <p className="text-2xl font-bold text-gray-700">{reviews.length}</p>
          <p className="text-xs font-medium text-gray-600">Reviews</p>
        </div>
      </div>

      {/* Documents Summary */}
      <Card>
        <CardHeader
          title="Documents"
          subtitle={`${totalDocuments} document(s) uploaded`}
        />
        <CardBody>
          {totalDocuments > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => {
                const extraction = doc.extractionResult;
                const hasExtraction = extraction !== null;
                const extractionStatus = extraction?.status ?? "PENDING";

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <DocumentIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {doc.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getDocumentTypeLabel(doc.type)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {hasExtraction && (
                        <Badge
                          variant={getExtractionStatusBadgeVariant(
                            extractionStatus
                          )}
                          size="sm"
                        >
                          {extractionStatus === "COMPLETED"
                            ? `${((extraction?.confidence ?? 0) * 100).toFixed(0)}%`
                            : extractionStatus === "PARTIALLY_COMPLETED"
                              ? "Partial"
                              : extractionStatus === "FAILED"
                                ? "Failed"
                                : extractionStatus === "IN_PROGRESS"
                                  ? "Processing"
                                  : "Pending"}
                        </Badge>
                      )}
                      {!hasExtraction && (
                        <Badge variant="default" size="sm">
                          No Extraction
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <DocumentIcon className="mb-2 h-8 w-8 text-gray-300" />
              <p className="mb-1 text-sm font-medium text-gray-700">
                No Documents Uploaded
              </p>
              <p className="text-xs text-gray-500">
                No documents were uploaded for this application.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Extraction & Validation Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Extraction Summary */}
        <Card>
          <CardHeader
            title="Extraction Summary"
            subtitle={`${completedExtractions.length} of ${totalDocuments} document(s) extracted`}
          />
          <CardBody>
            {totalDocuments > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                    <p className="text-xl font-bold text-green-700">
                      {completedExtractions.length}
                    </p>
                    <p className="text-2xs font-medium text-green-600">
                      Completed
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                    <p className="text-xl font-bold text-red-700">
                      {failedExtractions.length}
                    </p>
                    <p className="text-2xs font-medium text-red-600">Failed</p>
                  </div>
                  <div
                    className={`rounded-lg border p-3 text-center ${
                      averageConfidence >= 0.9
                        ? "border-green-200 bg-green-50"
                        : averageConfidence >= 0.8
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <p
                      className={`text-xl font-bold ${
                        averageConfidence >= 0.9
                          ? "text-green-700"
                          : averageConfidence >= 0.8
                            ? "text-yellow-700"
                            : "text-orange-700"
                      }`}
                    >
                      {averageConfidence > 0
                        ? `${(averageConfidence * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                    <p className="text-2xs font-medium text-gray-600">
                      Avg Confidence
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <SparklesIcon className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">
                  No extraction results available.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Validation Summary */}
        <Card>
          <CardHeader
            title="Validation Summary"
            subtitle={`${discrepancies.length} discrepancy(ies) found`}
          />
          <CardBody>
            {discrepancies.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-xl font-bold text-gray-700">
                      {discrepancies.length}
                    </p>
                    <p className="text-2xs font-medium text-gray-600">Total</p>
                  </div>
                  <div
                    className={`rounded-lg border p-3 text-center ${
                      unresolvedDiscrepancies.length > 0
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-green-200 bg-green-50"
                    }`}
                  >
                    <p
                      className={`text-xl font-bold ${
                        unresolvedDiscrepancies.length > 0
                          ? "text-yellow-700"
                          : "text-green-700"
                      }`}
                    >
                      {unresolvedDiscrepancies.length}
                    </p>
                    <p
                      className={`text-2xs font-medium ${
                        unresolvedDiscrepancies.length > 0
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      Unresolved
                    </p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                    <p className="text-xl font-bold text-green-700">
                      {resolvedDiscrepancies.length}
                    </p>
                    <p className="text-2xs font-medium text-green-600">
                      Resolved
                    </p>
                  </div>
                </div>

                {/* Severity Breakdown */}
                {unresolvedDiscrepancies.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">
                      Unresolved by Severity
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {criticalDiscrepancies.length > 0 && (
                        <Badge variant="danger" size="sm">
                          {criticalDiscrepancies.length} Critical
                        </Badge>
                      )}
                      {highDiscrepancies.length > 0 && (
                        <Badge variant="danger" size="sm">
                          {highDiscrepancies.length} High
                        </Badge>
                      )}
                      {unresolvedDiscrepancies.filter(
                        (d) => d.severity === "MEDIUM"
                      ).length > 0 && (
                        <Badge variant="warning" size="sm">
                          {
                            unresolvedDiscrepancies.filter(
                              (d) => d.severity === "MEDIUM"
                            ).length
                          }{" "}
                          Medium
                        </Badge>
                      )}
                      {unresolvedDiscrepancies.filter(
                        (d) => d.severity === "LOW"
                      ).length > 0 && (
                        <Badge variant="info" size="sm">
                          {
                            unresolvedDiscrepancies.filter(
                              (d) => d.severity === "LOW"
                            ).length
                          }{" "}
                          Low
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <CheckCircleIcon className="mb-2 h-8 w-8 text-green-400" />
                <p className="text-sm text-gray-500">
                  No discrepancies found.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Final Recommendation */}
      <Card>
        <CardHeader
          title="Final Recommendation"
          subtitle={
            latestRecommendation
              ? "AI-generated recommendation for this application"
              : "No recommendation generated yet"
          }
        />
        <CardBody>
          {latestRecommendation ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    Recommendation:
                  </span>
                  <Badge
                    variant={getRecommendationBadgeVariant(
                      latestRecommendation.recommendation
                    )}
                    size="lg"
                  >
                    {getRecommendationLabel(
                      latestRecommendation.recommendation
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    Confidence:
                  </span>
                  <Badge
                    variant={
                      latestRecommendation.confidence >= 0.9
                        ? "success"
                        : latestRecommendation.confidence >= 0.7
                          ? "warning"
                          : "danger"
                    }
                    size="md"
                  >
                    {(latestRecommendation.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Rationale
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {latestRecommendation.rationale}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                {latestRecommendation.user && (
                  <span>
                    Generated by:{" "}
                    <span className="font-medium text-gray-700">
                      {latestRecommendation.user.name}
                    </span>
                  </span>
                )}
                <span>
                  {formatDate(
                    latestRecommendation.createdAt,
                    "dd MMM yyyy, HH:mm"
                  )}
                </span>
              </div>

              {/* Override indicator */}
              {overrideReviews.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <WarningIcon className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">
                      Recommendation Overridden
                    </p>
                  </div>
                  {overrideReviews[0].overrideRecommendation && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-amber-700">
                        Override Decision:
                      </span>
                      <Badge
                        variant={getRecommendationBadgeVariant(
                          overrideReviews[0].overrideRecommendation
                        )}
                        size="sm"
                      >
                        {getRecommendationLabel(
                          overrideReviews[0].overrideRecommendation
                        )}
                      </Badge>
                    </div>
                  )}
                  {overrideReviews[0].justification && (
                    <p className="text-xs text-amber-900">
                      <span className="font-medium">Justification:</span>{" "}
                      {overrideReviews[0].justification}
                    </p>
                  )}
                  <p className="mt-1 text-2xs text-amber-600">
                    Overridden by: {overrideReviews[0].reviewer.name} —{" "}
                    {formatDate(
                      overrideReviews[0].createdAt,
                      "dd MMM yyyy, HH:mm"
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <SparklesIcon className="mb-2 h-8 w-8 text-gray-300" />
              <p className="mb-1 text-sm font-medium text-gray-700">
                No Recommendation Yet
              </p>
              <p className="text-xs text-gray-500">
                Complete document extraction and validation to generate a
                recommendation.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Review History */}
      <Card>
        <CardHeader
          title="Review History"
          subtitle={`${reviews.length} review(s) recorded`}
        />
        <CardBody>
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className={`rounded-lg border px-4 py-3 ${
                    review.isOverride
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {review.reviewer.name}
                      </p>
                      <Badge
                        variant={review.isOverride ? "warning" : "info"}
                        size="sm"
                      >
                        {review.isOverride ? "Override" : "Review"}
                      </Badge>
                      {review.isOverride && review.overrideRecommendation && (
                        <Badge
                          variant={getRecommendationBadgeVariant(
                            review.overrideRecommendation
                          )}
                          size="sm"
                        >
                          {getRecommendationLabel(
                            review.overrideRecommendation
                          )}
                        </Badge>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-500">
                      {formatDate(review.createdAt, "dd MMM yyyy, HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                  {review.isOverride && review.justification && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2">
                      <p className="text-xs text-amber-800">
                        <span className="font-medium">Justification:</span>{" "}
                        {review.justification}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <ChatBubbleIcon className="mb-2 h-8 w-8 text-gray-300" />
              <p className="mb-1 text-sm font-medium text-gray-700">
                No Reviews Yet
              </p>
              <p className="text-xs text-gray-500">
                No analyst reviews have been submitted for this application.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader
          title="Status Timeline"
          subtitle={`${statusHistory.length} status change(s) recorded`}
        />
        <CardBody>
          <StatusTimeline applicationId={appId} />
        </CardBody>
      </Card>

      {/* Action Buttons */}
      {!isFinalStatus &&
        (showApproveButton ||
          showRejectButton ||
          showReturnButton ||
          showSubmitForReviewButton) && (
          <Card>
            <CardHeader
              title="Actions"
              subtitle="Take action on this application"
            />
            <CardBody>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {showReturnButton && (
                  <Link
                    href={`/dashboard/applications/${appId}/review`}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--dbs-dark-blue)] no-underline"
                  >
                    Request Changes
                  </Link>
                )}
                {showSubmitForReviewButton && (
                  <Link
                    href={`/dashboard/applications/${appId}/review`}
                    className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 no-underline"
                    style={{ backgroundColor: "var(--dbs-dark-blue)" }}
                  >
                    Submit for Review
                  </Link>
                )}
                {showRejectButton && (
                  <Link
                    href={`/dashboard/applications/${appId}/review`}
                    className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 no-underline"
                  >
                    Reject Application
                  </Link>
                )}
                {showApproveButton && (
                  <Link
                    href={`/dashboard/applications/${appId}/review`}
                    className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 no-underline"
                  >
                    Approve Application
                  </Link>
                )}
              </div>
            </CardBody>
          </Card>
        )}

      {/* Summary Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          Application {appId} — {application.applicantName} —{" "}
          {application.loanType} — {formatCurrency(application.loanAmount)} —
          Status: {getStatusLabel(currentStatus)}
        </p>
      </div>
    </div>
  );
}