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
import analystReviewService from "@/lib/services/review-service";
import type { RecommendationType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Valid recommendation type values for runtime validation
// ---------------------------------------------------------------------------

const VALID_RECOMMENDATION_TYPES: RecommendationType[] = [
  "APPROVE",
  "REJECT",
  "REFER_TO_ANALYST",
  "REQUEST_MORE_INFO",
];

// ---------------------------------------------------------------------------
// POST /api/review/[applicationId]/override — Submit analyst override
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
      overrideRecommendation?: string;
      justification?: string;
    };

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    // Validate comment
    if (!body.comment || typeof body.comment !== "string" || body.comment.trim().length === 0) {
      return errorResponse("Comment is required and must be a non-empty string", 400);
    }

    if (body.comment.length > 5000) {
      return errorResponse("Comment must be at most 5000 characters", 400);
    }

    // Validate overrideRecommendation
    if (!body.overrideRecommendation || typeof body.overrideRecommendation !== "string") {
      return errorResponse("Override recommendation is required", 400);
    }

    if (!VALID_RECOMMENDATION_TYPES.includes(body.overrideRecommendation as RecommendationType)) {
      return errorResponse(
        `Invalid override recommendation: ${body.overrideRecommendation}. Must be one of: ${VALID_RECOMMENDATION_TYPES.join(", ")}`,
        400
      );
    }

    // Validate justification (mandatory for overrides)
    if (!body.justification || typeof body.justification !== "string" || body.justification.trim().length === 0) {
      return errorResponse("Justification is required when overriding a recommendation", 400);
    }

    if (body.justification.length > 5000) {
      return errorResponse("Justification must be at most 5000 characters", 400);
    }

    // Submit override via AnalystReviewService
    const result = await analystReviewService.override({
      applicationId: application.id,
      comment: body.comment.trim(),
      overrideRecommendation: body.overrideRecommendation as RecommendationType,
      justification: body.justification.trim(),
      reviewedBy: user.id,
      ipAddress,
    });

    const response = successResponse(
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
      "Override submitted successfully",
      201
    );
    return attachMockDbCookie(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withRole(["recommendation:override"], postHandler);