import prisma from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { PaginatedResponse, PaginationParams } from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateAuditLogInput {
  applicationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  outcome: string;
}

export interface AuditLogQueryFilters {
  applicationId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  outcome?: string;
  startDate?: string;
  endDate?: string;
}

export type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

// ---------------------------------------------------------------------------
// Repository Methods
// ---------------------------------------------------------------------------

/**
 * Creates a new audit log entry. Audit logs are append-only and immutable —
 * no update or delete operations are provided.
 */
export async function createAuditLog(input: CreateAuditLogInput) {
  const auditLog = await prisma.auditLog.create({
    data: {
      applicationId: input.applicationId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details
        ? (input.details as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ipAddress: input.ipAddress ?? null,
      outcome: input.outcome,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return auditLog;
}

/**
 * Retrieves a single audit log entry by its internal UUID (primary key).
 * Returns null if no entry is found.
 */
export async function getAuditLogById(id: string): Promise<AuditLogWithUser | null> {
  const auditLog = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return auditLog;
}

/**
 * Queries audit logs with pagination and optional filtering by
 * applicationId, userId, action, entityType, outcome, and date range.
 * Results are ordered by creation date descending by default.
 */
export async function queryAuditLogs(
  pagination: PaginationParams,
  filters?: AuditLogQueryFilters
): Promise<PaginatedResponse<AuditLogWithUser>> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = pagination;

  const where: Prisma.AuditLogWhereInput = {};

  if (filters?.applicationId) {
    where.applicationId = filters.applicationId;
  }

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.action) {
    where.action = {
      contains: filters.action,
      mode: "insensitive",
    };
  }

  if (filters?.entityType) {
    where.entityType = {
      contains: filters.entityType,
      mode: "insensitive",
    };
  }

  if (filters?.outcome) {
    where.outcome = {
      contains: filters.outcome,
      mode: "insensitive",
    };
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};

    if (filters?.startDate) {
      (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.startDate);
    }

    if (filters?.endDate) {
      (where.createdAt as Prisma.DateTimeFilter).lte = new Date(filters.endDate);
    }
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Retrieves all audit log entries for a given application,
 * ordered by creation date descending.
 */
export async function getAuditLogsByApplicationId(
  applicationId: string
): Promise<AuditLogWithUser[]> {
  const auditLogs = await prisma.auditLog.findMany({
    where: { applicationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return auditLogs;
}

/**
 * Retrieves all audit log entries for a given user,
 * ordered by creation date descending.
 */
export async function getAuditLogsByUserId(
  userId: string
): Promise<AuditLogWithUser[]> {
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return auditLogs;
}

/**
 * Returns the count of audit log entries for a given application.
 * Useful for summary statistics and dashboard displays.
 */
export async function getAuditLogCountByApplicationId(
  applicationId: string
): Promise<number> {
  const count = await prisma.auditLog.count({
    where: { applicationId },
  });

  return count;
}

/**
 * Returns the count of audit log entries grouped by action
 * for a given application. Useful for activity summaries.
 */
export async function getAuditLogCountByAction(
  applicationId: string
): Promise<Record<string, number>> {
  const counts = await prisma.auditLog.groupBy({
    by: ["action"],
    where: { applicationId },
    _count: {
      action: true,
    },
  });

  const result: Record<string, number> = {};

  for (const entry of counts) {
    result[entry.action] = entry._count.action;
  }

  return result;
}