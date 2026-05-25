import { NextRequest, NextResponse } from "next/server";
import { getMockDb } from "@/lib/db";

import { getServerSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { Permission } from "@/lib/constants";
import type { UserRole } from "@prisma/client";
import type { ApiResponse } from "@/types/types";
import type { ZodSchema, ZodError } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: { user: AuthenticatedUser; params?: Record<string, string> }
) => Promise<NextResponse>;

export type ApiHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

// ---------------------------------------------------------------------------
// Response Builders
// ---------------------------------------------------------------------------

/**
 * Builds a successful API response conforming to the ApiResponse<T> envelope.
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200,
  meta?: Record<string, unknown>
): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    body.message = message;
  }

  if (meta) {
    body.meta = meta;
  }

  return NextResponse.json(body, { status });
}

/**
 * Attaches the MockDbClient's pending delta as a cookie on the NextResponse.
 *
 * MUST be called by any route handler that mutates data (POST/PUT/PATCH/DELETE)
 * so that the next server-side render can read the updated state.
 *
 * Using response.cookies.set() is the guaranteed approach in Next.js 14 Route
 * Handlers — more reliable than calling cookies() from within service code.
 */
export function attachMockDbCookie(response: NextResponse): NextResponse {
  try {
    const mockDb = getMockDb();
    if (!mockDb) return response;

    const payload = mockDb.getPendingCookiePayload();
    if (!payload) return response;

    response.cookies.set("mock_db_delta", payload, {
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false, // must be readable by SSR page renders
    });

    // Clear legacy oversized cookie if present
    response.cookies.set("mock_db_state", "", {
      path: "/",
      maxAge: 0,
    });
  } catch {
    // Never let cookie logic break the response
  }
  return response;
}

/**
 * Builds an error API response conforming to the ApiResponse<T> envelope.
 */
export function errorResponse(
  error: string,
  status: number = 500,
  meta?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  const body: ApiResponse<never> = {
    success: false,
    error,
  };

  if (meta) {
    body.meta = meta;
  }

  return NextResponse.json(body, { status });
}

// ---------------------------------------------------------------------------
// Error Handler
// ---------------------------------------------------------------------------

/**
 * Standardized error response handler. Converts known error types into
 * appropriate HTTP responses. Unknown errors return a generic 500.
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  if (error instanceof Error) {
    const message = error.message;

    // Not found errors
    if (message.includes("not found") || message.includes("Not found")) {
      return errorResponse(message, 404);
    }

    // Validation errors
    if (message.includes("Validation failed") || message.includes("Invalid")) {
      return errorResponse(message, 400);
    }

    // Authorization errors
    if (
      message.includes("not allowed") ||
      message.includes("not authorized") ||
      message.includes("permission") ||
      message.includes("Access denied")
    ) {
      return errorResponse(message, 403);
    }

    // Transition errors
    if (message.includes("transition") || message.includes("Transition")) {
      return errorResponse(message, 409);
    }

    return errorResponse(message, 500);
  }

  return errorResponse("An unexpected error occurred", 500);
}

// ---------------------------------------------------------------------------
// IP Extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the client IP address from request headers.
 * Checks x-forwarded-for, x-real-ip, and falls back to null.
 */
export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for may contain a comma-separated list; take the first
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return null;
}

// ---------------------------------------------------------------------------
// Auth Wrapper
// ---------------------------------------------------------------------------

/**
 * Wraps an API route handler with session validation. If the user is not
 * authenticated, returns a 401 response. Otherwise, passes the authenticated
 * user to the handler.
 */
export function withAuth(handler: AuthenticatedHandler): ApiHandler {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      const session = await getServerSession();

      if (!session || !session.user) {
        return errorResponse("Authentication required", 401);
      }

      const user: AuthenticatedUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      };

      return await handler(request, {
        user,
        params: context?.params,
      });
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ---------------------------------------------------------------------------
// Role Wrapper
// ---------------------------------------------------------------------------

/**
 * Wraps an API route handler with role-based access control. Requires
 * authentication and checks that the user has at least one of the
 * specified permissions. Returns 403 if the check fails.
 */
export function withRole(
  permissions: Permission | Permission[],
  handler: AuthenticatedHandler
): ApiHandler {
  return withAuth(async (request, context) => {
    const { user } = context;
    const permissionList = Array.isArray(permissions) ? permissions : [permissions];

    const roleConfig = ROLES[user.role];

    if (!roleConfig) {
      return errorResponse(
        `Unknown role: ${user.role}`,
        403
      );
    }

    const hasPermission = permissionList.some((perm) =>
      roleConfig.permissions.includes(perm)
    );

    if (!hasPermission) {
      return errorResponse(
        `Access denied: role ${roleConfig.label} does not have the required permission(s): ${permissionList.join(", ")}`,
        403
      );
    }

    return await handler(request, context);
  });
}

// ---------------------------------------------------------------------------
// Validation Wrapper
// ---------------------------------------------------------------------------

/**
 * Wraps an API route handler with Zod schema validation on the request body.
 * Parses the JSON body against the provided schema. If validation fails,
 * returns a 400 response with the validation error messages.
 *
 * The validated data is attached to the request via a header (x-validated-body)
 * as a JSON string, since NextRequest is immutable. Handlers should use
 * parseValidatedBody<T>(request) to retrieve the parsed data.
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: ApiHandler
): ApiHandler {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON in request body", 400);
      }

      const result = schema.safeParse(body);

      if (!result.success) {
        const zodError = result.error as ZodError;
        const errorMessages = zodError.errors
          .map((e) => {
            const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
            return `${path}${e.message}`;
          })
          .join("; ");

        return errorResponse(`Validation failed: ${errorMessages}`, 400);
      }

      // Clone the request with the validated body stored in a header
      const headers = new Headers(request.headers);
      headers.set("x-validated-body", JSON.stringify(result.data));

      const validatedRequest = new NextRequest(request.url, {
        method: request.method,
        headers,
        body: JSON.stringify(result.data),
      });

      return await handler(validatedRequest, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Retrieves the validated body from a request that has been processed
 * by withValidation. Falls back to parsing the request body if the
 * header is not present.
 */
export async function parseValidatedBody<T>(request: NextRequest): Promise<T> {
  const validatedHeader = request.headers.get("x-validated-body");

  if (validatedHeader) {
    return JSON.parse(validatedHeader) as T;
  }

  const body = await request.json();
  return body as T;
}