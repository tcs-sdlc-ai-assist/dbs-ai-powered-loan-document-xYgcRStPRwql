import prisma from "@/lib/db";
import type { ApplicationStatusEnum, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateStatusEntryInput {
  applicationId: string;
  status: ApplicationStatusEnum;
  previousStatus?: ApplicationStatusEnum | null;
  changedBy: string;
  comments?: string;
}

export type StatusEntry = Prisma.ApplicationStatusGetPayload<object>;

// ---------------------------------------------------------------------------
// Repository Methods
// ---------------------------------------------------------------------------

/**
 * Creates a new status entry in the application status history.
 * This is an append-only operation that records each status transition.
 */
export async function createStatusEntry(input: CreateStatusEntryInput): Promise<StatusEntry> {
  const statusEntry = await prisma.applicationStatus.create({
    data: {
      applicationId: input.applicationId,
      status: input.status,
      previousStatus: input.previousStatus ?? null,
      changedBy: input.changedBy,
      comments: input.comments ?? null,
    },
  });

  return statusEntry;
}

/**
 * Retrieves the full status history for a given application,
 * ordered by creation timestamp ascending (oldest first).
 */
export async function getStatusHistory(applicationId: string): Promise<StatusEntry[]> {
  const history = await prisma.applicationStatus.findMany({
    where: { applicationId },
    orderBy: {
      createdAt: "asc",
    },
  });

  return history;
}

/**
 * Retrieves the most recent status entry for a given application.
 * Returns null if no status history exists.
 */
export async function getLatestStatus(applicationId: string): Promise<StatusEntry | null> {
  const latestStatus = await prisma.applicationStatus.findFirst({
    where: { applicationId },
    orderBy: {
      createdAt: "desc",
    },
  });

  return latestStatus;
}

/**
 * Retrieves all status entries for a given application,
 * ordered by creation date descending (newest first).
 * Alias for common access pattern where newest entries are needed first.
 */
export async function getStatusByApplicationId(applicationId: string): Promise<StatusEntry[]> {
  const statuses = await prisma.applicationStatus.findMany({
    where: { applicationId },
    orderBy: {
      createdAt: "desc",
    },
  });

  return statuses;
}

/**
 * Retrieves a single status entry by its internal UUID (primary key).
 */
export async function getStatusEntryById(id: string): Promise<StatusEntry | null> {
  const statusEntry = await prisma.applicationStatus.findUnique({
    where: { id },
  });

  return statusEntry;
}

/**
 * Creates a status entry and updates the application's current status
 * in a single transaction, ensuring atomicity.
 */
export async function createStatusEntryWithApplicationUpdate(
  input: CreateStatusEntryInput
): Promise<StatusEntry> {
  const [statusEntry] = await prisma.$transaction([
    prisma.applicationStatus.create({
      data: {
        applicationId: input.applicationId,
        status: input.status,
        previousStatus: input.previousStatus ?? null,
        changedBy: input.changedBy,
        comments: input.comments ?? null,
      },
    }),
    prisma.application.update({
      where: { id: input.applicationId },
      data: {
        status: input.status,
      },
    }),
  ]);

  return statusEntry;
}

/**
 * Returns the count of status entries for a given application.
 * Useful for determining how many transitions an application has undergone.
 */
export async function getStatusEntryCount(applicationId: string): Promise<number> {
  const count = await prisma.applicationStatus.count({
    where: { applicationId },
  });

  return count;
}

/**
 * Retrieves status entries filtered by a specific status value
 * for a given application, ordered by creation date descending.
 */
export async function getStatusEntriesByStatus(
  applicationId: string,
  status: ApplicationStatusEnum
): Promise<StatusEntry[]> {
  const statuses = await prisma.applicationStatus.findMany({
    where: {
      applicationId,
      status,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return statuses;
}