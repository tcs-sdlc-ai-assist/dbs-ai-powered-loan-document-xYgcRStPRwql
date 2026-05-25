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
import analystReviewService from "@/lib/services/review-service";

// ---------------------------------------------------------------------------
// POST /api/review/[applicationId] — Submit analyst review
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
      comment?: string;
    };

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    if (!body.comment || typeof body.comment !== "string" || body.comment.trim().length === 0) {
      return errorResponse("Comment is required and must be a non-empty string", 400);
    }

    if (body.comment.length > 5000) {
      return errorResponse("Comment must be at most 5000 characters", 400);
    }

    // Submit review via AnalystReviewService
    const result = await analystReviewService.review({
      applicationId: application.id,
      comment: body.comment.trim(),
      reviewedBy: user.id,
      ipAddress,
    });

    return successResponse(
      {
        id: result.review.id,
        applicationId: application.applicationId,
        comment: result.review.comment,
        isOverride: result.review.isOverride,
        overrideRecommendation: result.review.overrideRecommendation,
        justification: result.review.justification,
        reviewer: result.review.reviewer,
        createdAt: result.review.createdAt,
        updatedAt: result.review.updatedAt,
      },
      "Review submitted successfully",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withRole(["review:create"], postHandler);

// ---------------------------------------------------------------------------
// GET /api/review/[applicationId] — Retrieve all reviews for an application
// ---------------------------------------------------------------------------

const getHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const applicationId = context.params?.applicationId;

    if (!applicationId) {
      return errorResponse("Application ID is required", 400);
    }

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

    // Retrieve all reviews for the application
    const reviews = await analystReviewService.getByApplicationId(application.id);

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      applicationId: application!.applicationId,
      comment: review.comment,
      isOverride: review.isOverride,
      overrideRecommendation: review.overrideRecommendation,
      justification: review.justification,
      reviewer: review.reviewer,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }));

    return successResponse(formattedReviews, undefined, 200, {
      total: formattedReviews.length,
      applicationId: application.applicationId,
    });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["review:read"], getHandler);