import { redirect, notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import applicationService from "@/lib/services/application-service";
import documentService from "@/lib/services/document-service";
import DocumentUploadClient from "./DocumentUploadClient";
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

const CURRENT_STEP_INDEX = 2; // Step 3 of 6 (0-indexed)

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function DocumentsPage({
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

  // Fetch existing documents for this application
  const existingDocuments = await documentService.getByApplicationId(application.id);

  const serializedDocuments = existingDocuments.map((doc) => ({
    id: doc.id,
    type: doc.type,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    createdAt: doc.createdAt.toISOString(),
  }));

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
          subtitle={`Step ${CURRENT_STEP_INDEX + 1} of ${STEPS.length} — Upload Documents`}
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

      {/* Document Upload Card */}
      <Card>
        <CardHeader
          title="Document Upload"
          subtitle="Upload all required documents for verification"
          action={
            <Badge variant="info" size="md">
              Step 3 of 6
            </Badge>
          }
        />
        <CardBody>
          <DocumentUploadClient
            applicationId={application.applicationId}
            existingDocuments={serializedDocuments}
          />
        </CardBody>
      </Card>
    </div>
  );
}