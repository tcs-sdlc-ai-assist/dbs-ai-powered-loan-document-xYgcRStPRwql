import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  handleApiError,
  getClientIp,
} from "@/lib/api-helpers";
import type { AuthenticatedHandler } from "@/lib/api-helpers";
import accessController from "@/lib/services/access-service";
import type { Permission } from "@/lib/constants";
import type { UserRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Valid permission values for runtime validation
// ---------------------------------------------------------------------------

const VALID_PERMISSIONS: Permission[] = [
  "application:create",
  "application:read",
  "application:update",
  "application:delete",
  "application:approve",
  "application:reject",
  "document:upload",
  "document:read",
  "document:delete",
  "extraction:trigger",
  "extraction:read",
  "validation:trigger",
  "validation:read",
  "recommendation:read",
  "recommendation:override",
  "review:create",
  "review:read",
  "audit:read",
  "user:manage",
];

const VALID_ROLES: UserRole[] = ["ADMIN", "ANALYST", "REVIEWER", "VIEWER"];

// ---------------------------------------------------------------------------
// POST /api/access — Check if a user has access to a resource/action
// ---------------------------------------------------------------------------

const postHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const { user } = context;
    const ipAddress = getClientIp(request);

    // Parse request body
    let body: {
      userId?: string;
      role?: string;
      permission?: string;
      resourceId?: string;
    };

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    // Use the authenticated user's ID and role as defaults if not provided
    const userId = body.userId || user.id;
    const role = (body.role || user.role) as UserRole;

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return errorResponse(
        `Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(", ")}`,
        400
      );
    }

    // Validate permission
    if (!body.permission || typeof body.permission !== "string") {
      return errorResponse("Permission is required and must be a string", 400);
    }

    if (!VALID_PERMISSIONS.includes(body.permission as Permission)) {
      return errorResponse(
        `Invalid permission: ${body.permission}. Must be one of: ${VALID_PERMISSIONS.join(", ")}`,
        400
      );
    }

    const permission = body.permission as Permission;
    const resourceId = body.resourceId || undefined;

    // Check access via AccessController
    const result = await accessController.checkAccess({
      userId,
      role,
      permission,
      resourceId,
      ipAddress,
    });

    return successResponse(
      {
        allowed: result.allowed,
        reason: result.reason,
        userId,
        role,
        permission,
        resourceId: resourceId ?? null,
      },
      undefined,
      200,
      {
        allowed: result.allowed,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withAuth(postHandler);