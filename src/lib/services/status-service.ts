import {
  createStatusEntry,
  createStatusEntryWithApplicationUpdate,
  getStatusHistory,
  getLatestStatus,
  getStatusByApplicationId,
  getStatusEntryById,
  getStatusEntryCount,
  getStatusEntriesByStatus,
} from "@/lib/repositories/status-repository";
import {
  getApplicationById,
  updateApplicantDetails,
} from "@/lib/repositories/application-repository";
import auditLogger from "@/lib/services/audit-service";
import type { ApplicationStatusEnum } from "@prisma/client";
import type { StatusEntry } from "@/lib/repositories/status-repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateStatusInput {
  applicationId: string;
  newStatus: ApplicationStatusEnum;
  changedBy: string;
  comments?: string;
  ipAddress?: string | null;
}

export interface StatusResult {
  applicationId: string;
  currentStatus: ApplicationStatusEnum;
  lastChanged: Date;
}

export interface StatusHistoryResult {
  applicationId: string;
  history: StatusEntry[];
}

export interface UpdateStatusResult {
  success: boolean;
  currentStatus: ApplicationStatusEnum;
  previousStatus: ApplicationStatusEnum | null;
  statusEntry: StatusEntry;
}

// ---------------------------------------------------------------------------
// Allowed Status Transitions
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<ApplicationStatusEnum, ApplicationStatusEnum[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: [
    "DOCUMENTS_PENDING",
    "EXTRACTION_IN_PROGRESS",
    "RETURNED",
    "CANCELLED",
  ],
  DOCUMENTS_PENDING: [
    "UNDER_REVIEW",
    "EXTRACTION_IN_PROGRESS",
    "CANCELLED",
  ],
  EXTRACTION_IN_PROGRESS: [
    "EXTRACTION_COMPLETE",
    "UNDER_REVIEW",
    "CANCELLED",
  ],
  EXTRACTION_COMPLETE: [
    "VALIDATION_IN_PROGRESS",
    "UNDER_REVIEW",
    "CANCELLED",
  ],
  VALIDATION_IN_PROGRESS: [
    "VALIDATION_COMPLETE",
    "UNDER_REVIEW",
    "CANCELLED",
  ],
  VALIDATION_COMPLETE: [
    "RECOMMENDATION_GENERATED",
    "UNDER_REVIEW",
    "CANCELLED",
  ],
  RECOMMENDATION_GENERATED: [
    "ANALYST_REVIEW",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
  ],
  ANALYST_REVIEW: [
    "APPROVED",
    "REJECTED",
    "RETURNED",
    "RECOMMENDATION_GENERATED",
    "CANCELLED",
  ],
  APPROVED: [],
  REJECTED: [],
  RETURNED: ["SUBMITTED", "UNDER_REVIEW", "CANCELLED"],
  CANCELLED: [],
};

// ---------------------------------------------------------------------------
// StatusTracker Service
// ---------------------------------------------------------------------------

class StatusTracker {
  /**
   * Validates whether a status transition is allowed from the current status
   * to the new status.
   */
  isTransitionAllowed(
    currentStatus: ApplicationStatusEnum,
    newStatus: ApplicationStatusEnum
  ): boolean {
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed) {
      return false;
    }
    return allowed.includes(newStatus);
  }

  /**
   * Returns the list of statuses that can be transitioned to from the given status.
   */
  getAllowedTransitions(status: ApplicationStatusEnum): ApplicationStatusEnum[] {
    return [...(ALLOWED_TRANSITIONS[status] ?? [])];
  }

  /**
   * Updates the application status with validation of allowed transitions,
   * records the previous status, updates the application record atomically,
   * and logs the change to the audit trail.
   */
  async updateStatus(input: UpdateStatusInput): Promise<UpdateStatusResult> {
    const { applicationId, newStatus, changedBy, comments, ipAddress } = input;

    // Retrieve the application to validate it exists and get current status
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const previousStatus = application.status;

    // Validate the transition is allowed
    if (!this.isTransitionAllowed(previousStatus, newStatus)) {
      // Log the denied transition attempt
      try {
        await auditLogger.logAction({
          userId: changedBy,
          applicationId,
          action: "STATUS_TRANSITION_DENIED",
          entityType: "Application",
          entityId: applicationId,
          details: {
            previousStatus,
            attemptedStatus: newStatus,
            reason: `Transition from ${previousStatus} to ${newStatus} is not allowed`,
          },
          ipAddress: ipAddress ?? null,
          outcome: "DENIED",
        });
      } catch {
        // Swallow audit log failure for denied transitions — the primary error is the transition denial
      }

      throw new Error(
        `Status transition from ${previousStatus} to ${newStatus} is not allowed`
      );
    }

    // Atomically create the status entry and update the application status
    const statusEntry = await createStatusEntryWithApplicationUpdate({
      applicationId,
      status: newStatus,
      previousStatus,
      changedBy,
      comments,
    });

    // Log the status change to the audit trail
    try {
      await auditLogger.logAction({
        userId: changedBy,
        applicationId,
        action: "STATUS_UPDATE",
        entityType: "Application",
        entityId: applicationId,
        details: {
          previousStatus,
          newStatus,
          comments: comments ?? null,
        },
        ipAddress: ipAddress ?? null,
        outcome: "SUCCESS",
      });
    } catch (error) {
      // Log failure should not roll back the status update
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log status update audit: ${message}`);
    }

    return {
      success: true,
      currentStatus: newStatus,
      previousStatus,
      statusEntry,
    };
  }

  /**
   * Returns the current status of an application.
   */
  async getStatus(applicationId: string): Promise<StatusResult> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Get the latest status entry for the last changed timestamp
    const latestEntry = await getLatestStatus(applicationId);

    return {
      applicationId,
      currentStatus: application.status,
      lastChanged: latestEntry?.createdAt ?? application.updatedAt,
    };
  }

  /**
   * Returns the ordered list of all status changes for an application
   * (oldest first).
   */
  async getHistory(applicationId: string): Promise<StatusHistoryResult> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const history = await getStatusHistory(applicationId);

    return {
      applicationId,
      history,
    };
  }

  /**
   * Returns the status history ordered by newest first.
   */
  async getHistoryDescending(applicationId: string): Promise<StatusEntry[]> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const statuses = await getStatusByApplicationId(applicationId);

    return statuses;
  }

  /**
   * Retrieves a single status entry by its internal UUID.
   */
  async getStatusEntryById(id: string): Promise<StatusEntry | null> {
    const entry = await getStatusEntryById(id);
    return entry;
  }

  /**
   * Returns the total number of status transitions for an application.
   */
  async getTransitionCount(applicationId: string): Promise<number> {
    const count = await getStatusEntryCount(applicationId);
    return count;
  }

  /**
   * Retrieves all status entries matching a specific status value
   * for a given application.
   */
  async getEntriesByStatus(
    applicationId: string,
    status: ApplicationStatusEnum
  ): Promise<StatusEntry[]> {
    const entries = await getStatusEntriesByStatus(applicationId, status);
    return entries;
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

const statusTracker = new StatusTracker();

export default statusTracker;