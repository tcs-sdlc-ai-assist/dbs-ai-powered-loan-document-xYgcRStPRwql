import { redirect, notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import applicationService from "@/lib/services/application-service";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import ReviewPageClient from "./ReviewPageClient";

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

const CURRENT_STEP_INDEX = 4; // Step 5 of 6 (0-indexed)

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function ReviewPage({
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

  const userRole = session.user.role;
  const canResolveDiscrepancies = userRole === "ADMIN" || userRole === "ANALYST";
  const canGenerate = userRole === "ADMIN" || userRole === "ANALYST";
  const canOverride = userRole === "ADMIN" || userRole === "ANALYST";
  const canReview = userRole === "ADMIN" || userRole === "ANALYST" || userRole === "REVIEWER";

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
          subtitle={`Step ${CURRENT_STEP_INDEX + 1} of ${STEPS.length} — Review`}
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

      {/* Review Content Card */}
      <Card>
        <CardHeader
          title="Review & Recommendation"
          subtitle="Review cross-validation results, AI recommendation, and submit analyst review"
          action={
            <Badge variant="info" size="md">
              Step 5 of 6
            </Badge>
          }
        />
        <CardBody>
          <ReviewPageClient
            applicationId={application.applicationId}
            userRole={userRole}
            canResolveDiscrepancies={canResolveDiscrepancies}
            canGenerate={canGenerate}
            canOverride={canOverride}
            canReview={canReview}
          />
        </CardBody>
      </Card>
    </div>
  );
}