import { NextRequest } from "next/server";
import {
  withRole,
  successResponse,
  errorResponse,
  handleApiError,
  getClientIp,
} from "@/lib/api-helpers";
import type { AuthenticatedHandler } from "@/lib/api-helpers";
import applicationService from "@/lib/services/application-service";
import validationService from "@/lib/services/validation-service";

// ---------------------------------------------------------------------------
// GET /api/applications/[applicationId]/completeness — Check completeness
// ---------------------------------------------------------------------------

const getHandler: AuthenticatedHandler = async (request, context) => {
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

    // Run completeness check via ValidationService
    const completenessResult = await validationService.checkCompleteness({
      applicationId: application.id,
      checkedBy: user.id,
      ipAddress,
    });

    return successResponse(
      {
        applicationId: application.applicationId,
        ...completenessResult,
      },
      undefined,
      200,
      {
        isComplete: completenessResult.isComplete,
        totalDocuments: completenessResult.totalDocuments,
        completenessPercentage: completenessResult.completenessPercentage,
        missingDocumentCount: completenessResult.missingDocuments.length,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["validation:read"], getHandler);