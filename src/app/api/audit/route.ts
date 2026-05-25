import { NextRequest } from "next/server";
import {
  withRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-helpers";
import type { AuthenticatedHandler } from "@/lib/api-helpers";
import auditLogger from "@/lib/services/audit-service";

// ---------------------------------------------------------------------------
// GET /api/audit — Query audit logs with filters and pagination
// ---------------------------------------------------------------------------

const getHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);

    const applicationId = searchParams.get("applicationId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const outcome = searchParams.get("outcome") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    const validPage = Math.max(1, isNaN(page) ? 1 : page);
    const validPageSize = Math.min(100, Math.max(1, isNaN(pageSize) ? 20 : pageSize));

    const result = await auditLogger.queryLogs(
      {
        applicationId,
        userId,
        action,
        entityType,
        outcome,
        startDate,
        endDate,
      },
      {
        page: validPage,
        pageSize: validPageSize,
        sortBy,
        sortOrder,
      }
    );

    return successResponse(result, undefined, 200, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPreviousPage: result.hasPreviousPage,
    });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["audit:read"], getHandler);