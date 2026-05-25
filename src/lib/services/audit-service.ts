import {
  createAuditLog,
  getAuditLogById,
  queryAuditLogs,
  getAuditLogsByApplicationId,
  getAuditLogsByUserId,
  getAuditLogCountByApplicationId,
  getAuditLogCountByAction,
} from "@/lib/repositories/audit-repository";
import type {
  CreateAuditLogInput,
  AuditLogQueryFilters,
  AuditLogWithUser,
} from "@/lib/repositories/audit-repository";
import type { PaginatedResponse, PaginationParams } from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogActionInput {
  userId?: string | null;
  applicationId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  outcome: string;
}

export interface QueryLogsInput {
  applicationId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  outcome?: string;
  startDate?: string;
  endDate?: string;
}

// ---------------------------------------------------------------------------
// AuditLogger Service
// ---------------------------------------------------------------------------

class AuditLogger {
  /**
   * Records an immutable audit log entry. Audit logs are append-only —
   * once written they cannot be modified or deleted.
   */
  async logAction(input: LogActionInput): Promise<AuditLogWithUser> {
    const createInput: CreateAuditLogInput = {
      applicationId: input.applicationId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details ?? null,
      ipAddress: input.ipAddress ?? null,
      outcome: input.outcome,
    };

    try {
      const auditLog = await createAuditLog(createInput);
      return auditLog;
    } catch (error) {
      // Re-throw with context so callers can handle appropriately
      const message =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to create audit log: ${message}`);
    }
  }

  /**
   * Queries audit logs with optional filtering and pagination support.
   * Supports filtering by applicationId, userId, action type, entity type,
   * outcome, and date range.
   */
  async queryLogs(
    filters?: QueryLogsInput,
    pagination?: Partial<PaginationParams>
  ): Promise<PaginatedResponse<AuditLogWithUser>> {
    const paginationParams: PaginationParams = {
      page: pagination?.page ?? 1,
      pageSize: pagination?.pageSize ?? 20,
      sortBy: pagination?.sortBy ?? "createdAt",
      sortOrder: pagination?.sortOrder ?? "desc",
    };

    const queryFilters: AuditLogQueryFilters = {};

    if (filters?.applicationId) {
      queryFilters.applicationId = filters.applicationId;
    }
    if (filters?.userId) {
      queryFilters.userId = filters.userId;
    }
    if (filters?.action) {
      queryFilters.action = filters.action;
    }
    if (filters?.entityType) {
      queryFilters.entityType = filters.entityType;
    }
    if (filters?.outcome) {
      queryFilters.outcome = filters.outcome;
    }
    if (filters?.startDate) {
      queryFilters.startDate = filters.startDate;
    }
    if (filters?.endDate) {
      queryFilters.endDate = filters.endDate;
    }

    try {
      const result = await queryAuditLogs(paginationParams, queryFilters);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to query audit logs: ${message}`);
    }
  }

  /**
   * Retrieves a single audit log entry by its internal UUID.
   * Returns null if no entry is found.
   */
  async getById(id: string): Promise<AuditLogWithUser | null> {
    try {
      const auditLog = await getAuditLogById(id);
      return auditLog;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to retrieve audit log: ${message}`);
    }
  }

  /**
   * Retrieves all audit log entries for a given application,
   * ordered by creation date descending.
   */
  async getByApplicationId(applicationId: string): Promise<AuditLogWithUser[]> {
    try {
      const auditLogs = await getAuditLogsByApplicationId(applicationId);
      return auditLogs;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to retrieve audit logs for application ${applicationId}: ${message}`
      );
    }
  }

  /**
   * Retrieves all audit log entries for a given user,
   * ordered by creation date descending.
   */
  async getByUserId(userId: string): Promise<AuditLogWithUser[]> {
    try {
      const auditLogs = await getAuditLogsByUserId(userId);
      return auditLogs;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to retrieve audit logs for user ${userId}: ${message}`
      );
    }
  }

  /**
   * Returns the count of audit log entries for a given application.
   * Useful for summary statistics and dashboard displays.
   */
  async getCountByApplicationId(applicationId: string): Promise<number> {
    try {
      const count = await getAuditLogCountByApplicationId(applicationId);
      return count;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to count audit logs for application ${applicationId}: ${message}`
      );
    }
  }

  /**
   * Returns the count of audit log entries grouped by action
   * for a given application. Useful for activity summaries.
   */
  async getCountByAction(
    applicationId: string
  ): Promise<Record<string, number>> {
    try {
      const counts = await getAuditLogCountByAction(applicationId);
      return counts;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to count audit logs by action for application ${applicationId}: ${message}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

const auditLogger = new AuditLogger();

export default auditLogger;