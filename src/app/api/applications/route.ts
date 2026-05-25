import { NextRequest } from "next/server";
import {
  withRole,
  successResponse,
  errorResponse,
  handleApiError,
  getClientIp,
  parseValidatedBody,
  withValidation,
} from "@/lib/api-helpers";
import type { AuthenticatedHandler } from "@/lib/api-helpers";
import applicationService from "@/lib/services/application-service";
import { applicationIntakeSchema } from "@/lib/validation-schemas";
import type { ApplicationIntakeInput } from "@/lib/validation-schemas";
import type { ApplicationStatusEnum } from "@prisma/client";

// ---------------------------------------------------------------------------
// POST /api/applications — Create a new application
// ---------------------------------------------------------------------------

const createHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const { user } = context;
    const ipAddress = getClientIp(request);

    const body = await parseValidatedBody<ApplicationIntakeInput>(request);

    const result = await applicationService.createApplication({
      applicantName: body.applicantName,
      loanType: body.loanType,
      loanAmount: body.loanAmount,
      createdBy: user.id,
      ipAddress,
    });

    return successResponse(
      result.application,
      "Application created successfully",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withValidation(
  applicationIntakeSchema,
  withRole(["application:create"], createHandler)
);

// ---------------------------------------------------------------------------
// GET /api/applications — List applications with pagination and filtering
// ---------------------------------------------------------------------------

const listHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const { user } = context;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const status = searchParams.get("status") as ApplicationStatusEnum | undefined;
    const loanType = searchParams.get("loanType") || undefined;
    const search = searchParams.get("search") || undefined;

    const validPage = Math.max(1, isNaN(page) ? 1 : page);
    const validPageSize = Math.min(100, Math.max(1, isNaN(pageSize) ? 20 : pageSize));

    const result = await applicationService.list(
      {
        page: validPage,
        pageSize: validPageSize,
        sortBy,
        sortOrder,
      },
      {
        status: status || undefined,
        loanType,
        search,
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

export const GET = withRole(["application:read"], listHandler);