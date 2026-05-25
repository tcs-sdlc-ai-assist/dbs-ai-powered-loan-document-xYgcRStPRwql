import { NextRequest } from "next/server";
import {
  withRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-helpers";
import type { AuthenticatedHandler } from "@/lib/api-helpers";
import applicationService from "@/lib/services/application-service";
import statusTracker from "@/lib/services/status-service";

// ---------------------------------------------------------------------------
// GET /api/status/[applicationId]/history — Get full status change history
// ---------------------------------------------------------------------------

const getHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const applicationId = context.params?.applicationId;

    if (!applicationId) {
      return errorResponse("Application ID is required", 400);
    }

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

    // Get full status history via StatusService
    const historyResult = await statusTracker.getHistory(application.id);

    const formattedHistory = historyResult.history.map((entry) => ({
      id: entry.id,
      status: entry.status,
      previousStatus: entry.previousStatus,
      changedBy: entry.changedBy,
      comments: entry.comments,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));

    return successResponse(
      {
        applicationId: application.applicationId,
        currentStatus: application.status,
        history: formattedHistory,
      },
      undefined,
      200,
      {
        applicationId: application.applicationId,
        currentStatus: application.status,
        totalEntries: formattedHistory.length,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["application:read"], getHandler);