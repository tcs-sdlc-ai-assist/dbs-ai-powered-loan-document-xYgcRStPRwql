import prisma from "@/lib/db";
import type { DiscrepancySeverity, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateDiscrepancyInput {
  applicationId: string;
  field: string;
  sourceDocument: string;
  targetDocument: string;
  sourceValue: string;
  targetValue: string;
  severity: DiscrepancySeverity;
  resolved?: boolean;
}

export interface UpdateDiscrepancyInput {
  resolved?: boolean;
  severity?: DiscrepancySeverity;
  sourceValue?: string;
  targetValue?: string;
}

// ---------------------------------------------------------------------------
// Repository Methods
// ---------------------------------------------------------------------------

/**
 * Creates a new validation discrepancy linked to an application.
 */
export async function createDiscrepancy(input: CreateDiscrepancyInput) {
  const discrepancy = await prisma.validationDiscrepancy.create({
    data: {
      applicationId: input.applicationId,
      field: input.field,
      sourceDocument: input.sourceDocument,
      targetDocument: input.targetDocument,
      sourceValue: input.sourceValue,
      targetValue: input.targetValue,
      severity: input.severity,
      resolved: input.resolved ?? false,
    },
  });

  return discrepancy;
}

/**
 * Retrieves all validation discrepancies for a given application,
 * ordered by creation date descending.
 */
export async function getDiscrepanciesByApplicationId(applicationId: string) {
  const discrepancies = await prisma.validationDiscrepancy.findMany({
    where: { applicationId },
    orderBy: {
      createdAt: "desc",
    },
  });

  return discrepancies;
}

/**
 * Updates an existing validation discrepancy by its ID.
 * Commonly used to mark a discrepancy as resolved.
 */
export async function updateDiscrepancy(
  id: string,
  input: UpdateDiscrepancyInput
) {
  const data: Prisma.ValidationDiscrepancyUpdateInput = {};

  if (input.resolved !== undefined) {
    data.resolved = input.resolved;
  }
  if (input.severity !== undefined) {
    data.severity = input.severity;
  }
  if (input.sourceValue !== undefined) {
    data.sourceValue = input.sourceValue;
  }
  if (input.targetValue !== undefined) {
    data.targetValue = input.targetValue;
  }

  const discrepancy = await prisma.validationDiscrepancy.update({
    where: { id },
    data,
  });

  return discrepancy;
}

/**
 * Creates multiple validation discrepancies in a single transaction.
 * Returns the count of created records.
 */
export async function bulkCreateDiscrepancies(
  inputs: CreateDiscrepancyInput[]
) {
  const discrepancies = await prisma.$transaction(
    inputs.map((input) =>
      prisma.validationDiscrepancy.create({
        data: {
          applicationId: input.applicationId,
          field: input.field,
          sourceDocument: input.sourceDocument,
          targetDocument: input.targetDocument,
          sourceValue: input.sourceValue,
          targetValue: input.targetValue,
          severity: input.severity,
          resolved: input.resolved ?? false,
        },
      })
    )
  );

  return discrepancies;
}

/**
 * Retrieves all unresolved validation discrepancies for a given application,
 * ordered by severity (CRITICAL first) then creation date descending.
 */
export async function getUnresolvedDiscrepancies(applicationId: string) {
  const discrepancies = await prisma.validationDiscrepancy.findMany({
    where: {
      applicationId,
      resolved: false,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });

  return discrepancies;
}

/**
 * Retrieves a single validation discrepancy by its internal UUID (primary key).
 */
export async function getDiscrepancyById(id: string) {
  const discrepancy = await prisma.validationDiscrepancy.findUnique({
    where: { id },
  });

  return discrepancy;
}

/**
 * Returns the count of discrepancies grouped by severity for a given application.
 * Useful for determining whether auto-rejection or analyst referral thresholds are met.
 */
export async function getDiscrepancyCountBySeverity(
  applicationId: string
): Promise<Record<DiscrepancySeverity, number>> {
  const counts = await prisma.validationDiscrepancy.groupBy({
    by: ["severity"],
    where: {
      applicationId,
      resolved: false,
    },
    _count: {
      severity: true,
    },
  });

  const result: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const entry of counts) {
    result[entry.severity] = entry._count.severity;
  }

  return result as Record<DiscrepancySeverity, number>;
}