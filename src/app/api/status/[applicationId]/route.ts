import { NextRequest } from "next/server";
import {
  withRole,
  successResponse,
  errorResponse,
  handleApiError,
  getClientIp,
  attachMockDbCookie,
} from "@/lib/api-helpers";
import type { AuthenticatedHandler } from "@/lib/api-helpers";
import applicationService from "@/lib/services/application-service";
import statusTracker from "@/lib/services/status-service";
import type { ApplicationStatusEnum } from "@prisma/client";

// ---------------------------------------------------------------------------
// Valid application status values for runtime validation
// ---------------------------------------------------------------------------

const VALID_STATUSES: ApplicationStatusEnum[] = [
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

// ---------------------------------------------------------------------------
// GET /api/status/[applicationId] — Get current application status
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

    // Get current status via StatusService
    const statusResult = await statusTracker.getStatus(application.id);

    return successResponse(
      {
        applicationId: application.applicationId,
        currentStatus: statusResult.currentStatus,
        lastChanged: statusResult.lastChanged,
      },
      undefined,
      200,
      {
        applicationId: application.applicationId,
        currentStatus: statusResult.currentStatus,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["application:read"], getHandler);

// ---------------------------------------------------------------------------
// POST /api/status/[applicationId] — Update application status
// ---------------------------------------------------------------------------

const postHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const applicationId = context.params?.applicationId;

    if (!applicationId) {
      return errorResponse("Application ID is required", 400);
    }

    const { user } = context;
    const ipAddress = getClientIp(request);

    // Resolve the application (by UUID or human-readable ID)
    let application = await applicationService.getById(applicationId);

    if (!application) {
      const appByDisplayId = await applicationService.getByApplicationId(applicationId);

      if (appByDisplayId) {
        application = appByDisplayId;
      }
    }

    if (!application) {
      return errorResponse(`Application not found: ${applicationId}`, 404);
    }

    // Parse request body
    let body: {
      newStatus?: string;
      comment?: string;
    };

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    // Validate newStatus
    if (!body.newStatus || typeof body.newStatus !== "string") {
      return errorResponse("newStatus is required and must be a string", 400);
    }

    if (!VALID_STATUSES.includes(body.newStatus as ApplicationStatusEnum)) {
      return errorResponse(
        `Invalid status: ${body.newStatus}. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }

    const newStatus = body.newStatus as ApplicationStatusEnum;

    // Validate comment if provided
    if (body.comment !== undefined && body.comment !== null) {
      if (typeof body.comment !== "string") {
        return errorResponse("Comment must be a string", 400);
      }

      if (body.comment.length > 2000) {
        return errorResponse("Comment must be at most 2000 characters", 400);
      }
    }

    // Check if the transition is allowed before attempting the update
    const isAllowed = statusTracker.isTransitionAllowed(
      application.status,
      newStatus
    );

    if (!isAllowed) {
      const allowedTransitions = statusTracker.getAllowedTransitions(application.status);
      return errorResponse(
        `Status transition from ${application.status} to ${newStatus} is not allowed. Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(", ") : "none"}`,
        409
      );
    }

    // Update status via StatusService
    const result = await statusTracker.updateStatus({
      applicationId: application.id,
      newStatus,
      changedBy: user.id,
      comments: body.comment?.trim(),
      ipAddress,
    });

    const response = successResponse(
      {
        applicationId: application.applicationId,
        currentStatus: result.currentStatus,
        previousStatus: result.previousStatus,
        statusEntry: {
          id: result.statusEntry.id,
          status: result.statusEntry.status,
          previousStatus: result.statusEntry.previousStatus,
          changedBy: result.statusEntry.changedBy,
          comments: result.statusEntry.comments,
          createdAt: result.statusEntry.createdAt,
        },
      },
      "Status updated successfully",
      200,
      {
        applicationId: application.applicationId,
        previousStatus: result.previousStatus,
        currentStatus: result.currentStatus,
      }
    );
    return attachMockDbCookie(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withRole(["application:update"], postHandler);