import prisma from "@/lib/db";
import { ExtractionStatus, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateExtractionResultInput {
  documentId: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  status?: ExtractionStatus;
  errors?: Record<string, unknown> | null;
}

export interface UpdateExtractionResultInput {
  extractedData?: Record<string, unknown>;
  confidence?: number;
  status?: ExtractionStatus;
  errors?: Record<string, unknown> | null;
}

export type ExtractionResultWithDocument = Prisma.ExtractionResultGetPayload<{
  include: {
    document: true;
  };
}>;

// ---------------------------------------------------------------------------
// Repository Methods
// ---------------------------------------------------------------------------

/**
 * Creates a new extraction result linked to a document.
 */
export async function createExtractionResult(input: CreateExtractionResultInput) {
  const extractionResult = await prisma.extractionResult.create({
    data: {
      documentId: input.documentId,
      extractedData: input.extractedData as Prisma.InputJsonValue,
      confidence: input.confidence,
      status: input.status ?? "PENDING",
      errors: input.errors ? (input.errors as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });

  return extractionResult;
}

/**
 * Retrieves an extraction result by its associated document ID.
 * Each document has at most one extraction result (1:1 relation).
 */
export async function getExtractionByDocumentId(documentId: string) {
  const extractionResult = await prisma.extractionResult.findUnique({
    where: { documentId },
    include: {
      document: true,
    },
  });

  return extractionResult;
}

/**
 * Retrieves all extraction results for a given application by joining
 * through the Document table. Results are ordered by creation date descending.
 */
export async function getExtractionsByApplicationId(
  applicationId: string
): Promise<ExtractionResultWithDocument[]> {
  const extractionResults = await prisma.extractionResult.findMany({
    where: {
      document: {
        applicationId,
      },
    },
    include: {
      document: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return extractionResults;
}

/**
 * Updates an existing extraction result by its ID.
 */
export async function updateExtractionResult(
  id: string,
  input: UpdateExtractionResultInput
) {
  const data: Prisma.ExtractionResultUpdateInput = {};

  if (input.extractedData !== undefined) {
    data.extractedData = input.extractedData as Prisma.InputJsonValue;
  }
  if (input.confidence !== undefined) {
    data.confidence = input.confidence;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }
  if (input.errors !== undefined) {
    data.errors = input.errors ? (input.errors as Prisma.InputJsonValue) : Prisma.JsonNull;
  }

  const extractionResult = await prisma.extractionResult.update({
    where: { id },
    data,
  });

  return extractionResult;
}

/**
 * Retrieves an extraction result by its internal UUID (primary key).
 */
export async function getExtractionResultById(id: string) {
  const extractionResult = await prisma.extractionResult.findUnique({
    where: { id },
    include: {
      document: true,
    },
  });

  return extractionResult;
}