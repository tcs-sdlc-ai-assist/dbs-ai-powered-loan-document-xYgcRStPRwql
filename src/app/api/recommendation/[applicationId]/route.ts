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
import recommendationEngine from "@/lib/services/recommendation-service";

// ---------------------------------------------------------------------------
// POST /api/recommendation/[applicationId] — Generate AI recommendation
// ---------------------------------------------------------------------------

const generateHandler: AuthenticatedHandler = async (request, context) => {
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

    // Generate recommendation via RecommendationEngine
    const result = await recommendationEngine.generate({
      applicationId: application.id,
      createdBy: user.id,
      ipAddress,
    });

    return successResponse(
      {
        applicationId: application.applicationId,
        recommendation: result.recommendation.recommendation,
        rationale: result.recommendation.rationale,
        confidence: result.recommendation.confidence,
        createdBy: result.recommendation.user,
        createdAt: result.recommendation.createdAt,
        details: {
          completenessScore: result.details.completenessScore,
          averageExtractionConfidence: result.details.averageExtractionConfidence,
          discrepancySummary: result.details.discrepancySummary,
          extractionSummary: result.details.extractionSummary,
        },
      },
      "Recommendation generated successfully",
      201,
      {
        recommendation: result.details.recommendation,
        confidence: result.details.confidence,
        completenessScore: result.details.completenessScore,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withRole(
  ["recommendation:read", "recommendation:override"],
  generateHandler
);

// ---------------------------------------------------------------------------
// GET /api/recommendation/[applicationId] — Retrieve latest recommendation
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

    // Retrieve the latest recommendation
    const recommendation = await recommendationEngine.get(application.id);

    if (!recommendation) {
      return errorResponse(
        `No recommendation found for application: ${applicationId}`,
        404
      );
    }

    return successResponse(
      {
        id: recommendation.id,
        applicationId: application.applicationId,
        recommendation: recommendation.recommendation,
        rationale: recommendation.rationale,
        confidence: recommendation.confidence,
        createdBy: recommendation.user,
        createdAt: recommendation.createdAt,
        updatedAt: recommendation.updatedAt,
      },
      undefined,
      200,
      {
        recommendation: recommendation.recommendation,
        confidence: recommendation.confidence,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["recommendation:read"], getHandler);