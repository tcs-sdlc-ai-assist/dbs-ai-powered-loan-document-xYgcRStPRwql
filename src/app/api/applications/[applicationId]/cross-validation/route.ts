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
import { updateDiscrepancy } from "@/lib/repositories/discrepancy-repository";
import { getDiscrepancyById } from "@/lib/repositories/discrepancy-repository";
import auditLogger from "@/lib/services/audit-service";

// ---------------------------------------------------------------------------
// GET /api/applications/[applicationId]/cross-validation — Run cross-validation
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

    // Run cross-validation via ValidationService
    const crossValidationResult = await validationService.crossValidate({
      applicationId: application.id,
      validatedBy: user.id,
      ipAddress,
    });

    return successResponse(
      {
        applicationId: application.applicationId,
        ...crossValidationResult,
      },
      undefined,
      200,
      {
        isConsistent: crossValidationResult.isConsistent,
        totalChecks: crossValidationResult.totalChecks,
        passedChecks: crossValidationResult.passedChecks,
        failedChecks: crossValidationResult.failedChecks,
        discrepancyCount: crossValidationResult.discrepancies.length,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["validation:read", "validation:trigger"], getHandler);

// ---------------------------------------------------------------------------
// POST /api/applications/[applicationId]/cross-validation — Resolve or
// comment on discrepancies
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
      discrepancyId?: string;
      resolved?: boolean;
      comment?: string;
    };

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    if (!body.discrepancyId) {
      return errorResponse("discrepancyId is required", 400);
    }

    // Verify the discrepancy exists and belongs to this application
    const discrepancy = await getDiscrepancyById(body.discrepancyId);

    if (!discrepancy) {
      return errorResponse(`Discrepancy not found: ${body.discrepancyId}`, 404);
    }

    if (discrepancy.applicationId !== application.id) {
      return errorResponse(
        `Discrepancy ${body.discrepancyId} does not belong to application ${applicationId}`,
        400
      );
    }

    // Build update input
    const updateInput: { resolved?: boolean } = {};

    if (body.resolved !== undefined) {
      if (typeof body.resolved !== "boolean") {
        return errorResponse("resolved must be a boolean", 400);
      }
      updateInput.resolved = body.resolved;
    }

    // Update the discrepancy
    const updatedDiscrepancy = await updateDiscrepancy(
      body.discrepancyId,
      updateInput
    );

    // Log the action via AuditService
    try {
      await auditLogger.logAction({
        userId: user.id,
        applicationId: application.id,
        action: body.resolved
          ? "DISCREPANCY_RESOLVED"
          : "DISCREPANCY_UPDATED",
        entityType: "ValidationDiscrepancy",
        entityId: body.discrepancyId,
        details: {
          applicationId: application.applicationId,
          field: discrepancy.field,
          resolved: body.resolved ?? discrepancy.resolved,
          comment: body.comment ?? null,
          previousResolved: discrepancy.resolved,
        },
        ipAddress,
        outcome: "SUCCESS",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log discrepancy update audit: ${message}`);
    }

    return successResponse(
      {
        id: updatedDiscrepancy.id,
        applicationId: application.applicationId,
        field: updatedDiscrepancy.field,
        sourceDocument: updatedDiscrepancy.sourceDocument,
        targetDocument: updatedDiscrepancy.targetDocument,
        sourceValue: updatedDiscrepancy.sourceValue,
        targetValue: updatedDiscrepancy.targetValue,
        severity: updatedDiscrepancy.severity,
        resolved: updatedDiscrepancy.resolved,
      },
      body.resolved
        ? "Discrepancy marked as resolved"
        : "Discrepancy updated successfully",
      200
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withRole(["validation:trigger"], postHandler);