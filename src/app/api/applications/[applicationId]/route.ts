import { NextRequest } from "next/server";
import {
  withRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-helpers";
import type { AuthenticatedHandler } from "@/lib/api-helpers";
import applicationService from "@/lib/services/application-service";

// ---------------------------------------------------------------------------
// GET /api/applications/[applicationId] — Get full application details
// ---------------------------------------------------------------------------

const getHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const applicationId = context.params?.applicationId;

    if (!applicationId) {
      return errorResponse("Application ID is required", 400);
    }

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
      return errorResponse(`Application not found: ${applicationId}`, 404);
    }

    return successResponse(application, undefined, 200);
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["application:read"], getHandler);