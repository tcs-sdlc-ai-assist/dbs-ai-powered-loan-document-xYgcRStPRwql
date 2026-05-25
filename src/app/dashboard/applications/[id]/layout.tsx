import { redirect, notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import applicationService from "@/lib/services/application-service";
import Sidebar from "@/components/layout/Sidebar";
import Badge from "@/components/ui/Badge";
import { APPLICATION_STATUSES } from "@/lib/constants";
import type { ApplicationStatusEnum } from "@prisma/client";
import Link from "next/link";

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

export default async function ApplicationDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  const applicationId = params.id;

  // First try to find by internal UUID
  let application = await applicationService.getById(applicationId);

  // If not found by UUID, try by human-readable application ID (e.g. DBS-1001)
  if (!application) {
    const appByDisplayId = await applicationService.getByApplicationId(applicationId);

    if (appByDisplayId) {
      application = appByDisplayId;
    }
  }

  if (!application) {
    notFound();
  }

  const statusConfig = APPLICATION_STATUSES[application.status];
  const statusLabel = statusConfig ? statusConfig.label : application.status;

  return (
    <div className="flex flex-col gap-6">
      {/* Application Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/applications"
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 no-underline"
            aria-label="Back to applications"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                {application.applicationId}
              </h1>
              <Badge
                variant={getStatusBadgeVariant(application.status)}
                size="md"
              >
                {statusLabel}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {application.applicantName} — {application.loanType}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <Sidebar
          applicationId={application.applicationId}
          applicationStatus={application.status}
        />

        {/* Page Content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}