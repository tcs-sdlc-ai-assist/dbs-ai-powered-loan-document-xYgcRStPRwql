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
import documentService from "@/lib/services/document-service";

// ---------------------------------------------------------------------------
// POST /api/applications/[applicationId]/extract — Trigger AI extraction
// ---------------------------------------------------------------------------

const extractHandler: AuthenticatedHandler = async (request, context) => {
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

    // Parse optional documentIds from request body
    let documentIds: string[] | undefined;

    try {
      const body = await request.json();

      if (body && Array.isArray(body.documentIds) && body.documentIds.length > 0) {
        documentIds = body.documentIds;
      }
    } catch {
      // No body or invalid JSON — extract all documents
    }

    // Trigger extraction via DocumentService
    const result = await documentService.triggerExtraction({
      applicationId: application.id,
      documentIds,
      triggeredBy: user.id,
      ipAddress,
    });

    if (!result.success) {
      return errorResponse(
        `Extraction failed for application ${applicationId}: ${result.errors.join("; ")}`,
        500,
        {
          extractionResults: result.extractionResults,
          errors: result.errors,
        }
      );
    }

    return successResponse(
      {
        applicationId: application.applicationId,
        extractionResults: result.extractionResults,
        errors: result.errors,
      },
      "Extraction completed successfully",
      200,
      {
        totalDocuments: result.extractionResults.length,
        successCount: result.extractionResults.filter(
          (r) => r.status === "COMPLETED" || r.status === "PARTIALLY_COMPLETED"
        ).length,
        failureCount: result.extractionResults.filter(
          (r) => r.status === "FAILED"
        ).length,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withRole(["extraction:trigger"], extractHandler);

// ---------------------------------------------------------------------------
// GET /api/applications/[applicationId]/extract — Get extraction results
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

    // Retrieve existing extraction results
    const extractions = await documentService.getExtractionsByApplicationId(
      application.id
    );

    const extractionResults = extractions.map((extraction) => ({
      documentId: extraction.document.id,
      documentType: extraction.document.type,
      fileName: extraction.document.fileName,
      extractedData: extraction.extractedData as Record<string, unknown>,
      confidence: extraction.confidence,
      status: extraction.status,
      errors: extraction.errors as Record<string, unknown> | null,
      createdAt: extraction.createdAt,
      updatedAt: extraction.updatedAt,
    }));

    // Calculate summary statistics
    const confidenceScores = extractionResults
      .filter((r) => r.confidence > 0)
      .map((r) => r.confidence);
    const averageConfidence =
      confidenceScores.length > 0
        ? Math.round(
            (confidenceScores.reduce((sum, c) => sum + c, 0) /
              confidenceScores.length) *
              100
          ) / 100
        : 0;

    return successResponse(
      {
        applicationId: application.applicationId,
        extractionResults,
      },
      undefined,
      200,
      {
        totalDocuments: extractionResults.length,
        completedCount: extractionResults.filter(
          (r) => r.status === "COMPLETED"
        ).length,
        partialCount: extractionResults.filter(
          (r) => r.status === "PARTIALLY_COMPLETED"
        ).length,
        failedCount: extractionResults.filter(
          (r) => r.status === "FAILED"
        ).length,
        pendingCount: extractionResults.filter(
          (r) => r.status === "PENDING" || r.status === "IN_PROGRESS"
        ).length,
        averageConfidence,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["extraction:read"], getHandler);