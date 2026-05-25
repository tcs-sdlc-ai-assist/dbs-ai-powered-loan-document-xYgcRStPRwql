import { NextRequest } from "next/server";
import {
  withRole,
  successResponse,
  errorResponse,
  handleApiError,
  getClientIp,
  parseValidatedBody,
  withValidation,
  attachMockDbCookie,
} from "@/lib/api-helpers";
import type { AuthenticatedHandler } from "@/lib/api-helpers";
import applicationService from "@/lib/services/application-service";
import { applicantDetailsSchema } from "@/lib/validation-schemas";
import type { ApplicantDetailsInput } from "@/lib/validation-schemas";

// ---------------------------------------------------------------------------
// PUT /api/applications/[applicationId]/applicant — Update applicant details
// ---------------------------------------------------------------------------

const updateHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const applicationId = context.params?.applicationId;

    if (!applicationId) {
      return errorResponse("Application ID is required", 400);
    }

    const { user } = context;
    const ipAddress = getClientIp(request);

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
      return errorResponse(`Application not found: ${applicationId}`, 404);
    }

    const body = await parseValidatedBody<ApplicantDetailsInput>(request);

    const result = await applicationService.updateApplicant(application.id, {
      applicantName: body.applicantName,
      loanType: body.loanType,
      loanAmount: body.loanAmount,
      status: body.status,
      updatedBy: user.id,
      ipAddress,
    });

    const response = successResponse(
      result.application,
      "Applicant details updated successfully",
      200
    );
    return attachMockDbCookie(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const PUT = withValidation(
  applicantDetailsSchema,
  withRole(["application:update"], updateHandler)
);