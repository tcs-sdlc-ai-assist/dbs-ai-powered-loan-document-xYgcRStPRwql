import { redirect, notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import applicationService from "@/lib/services/application-service";
import ApplicantForm from "@/components/forms/ApplicantForm";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";

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

const CURRENT_STEP_INDEX = 1; // Step 2 of 6 (0-indexed)

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function ApplicantDetailsPage({
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

  const completedSteps = CURRENT_STEP_INDEX;
  const totalSteps = STEPS.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

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
          subtitle={`Step ${CURRENT_STEP_INDEX + 1} of ${totalSteps} — Applicant Entry`}
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

      {/* Applicant Form Card */}
      <Card>
        <CardHeader
          title="Applicant Details"
          subtitle="Enter the applicant's personal, employment, and loan details"
          action={
            <Badge variant="info" size="md">
              Step 2 of 6
            </Badge>
          }
        />
        <CardBody>
          <ApplicantForm
            applicationId={application.applicationId}
            initialData={{
              applicantName: application.applicantName,
              loanType: application.loanType,
              loanAmount: application.loanAmount,
              status: application.status,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}