import prisma from "@/lib/db";
import type { DocumentType, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateDocumentInput {
  applicationId: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  storageUrl: string;
  uploadedBy: string;
}

export type DocumentWithExtraction = Prisma.DocumentGetPayload<{
  include: {
    extractionResult: true;
  };
}>;

// ---------------------------------------------------------------------------
// Repository Methods
// ---------------------------------------------------------------------------

/**
 * Creates a new document linked to an application.
 */
export async function createDocument(input: CreateDocumentInput) {
  const document = await prisma.document.create({
    data: {
      applicationId: input.applicationId,
      type: input.type,
      fileName: input.fileName,
      fileSize: input.fileSize,
      storageUrl: input.storageUrl,
      uploadedBy: input.uploadedBy,
    },
  });

  return document;
}

/**
 * Retrieves a document by its internal UUID (primary key).
 */
export async function getDocumentById(id: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      extractionResult: true,
    },
  });

  return document;
}

/**
 * Retrieves all documents for a given application, ordered by creation date descending.
 */
export async function getDocumentsByApplicationId(
  applicationId: string
): Promise<DocumentWithExtraction[]> {
  const documents = await prisma.document.findMany({
    where: { applicationId },
    include: {
      extractionResult: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return documents;
}

/**
 * Deletes a document by its internal UUID (primary key).
 * Cascading deletes will remove the associated extraction result.
 */
export async function deleteDocument(id: string) {
  const document = await prisma.document.delete({
    where: { id },
  });

  return document;
}

/**
 * Returns a count of documents grouped by document type for a given application.
 * Useful for completeness checks to determine which document types have been uploaded.
 */
export async function getDocumentCountByType(
  applicationId: string
): Promise<Record<DocumentType, number>> {
  const counts = await prisma.document.groupBy({
    by: ["type"],
    where: { applicationId },
    _count: {
      type: true,
    },
  });

  const result: Record<string, number> = {};

  for (const entry of counts) {
    result[entry.type] = entry._count.type;
  }

  return result as Record<DocumentType, number>;
}

/**
 * Returns the total number of documents for a given application.
 */
export async function getDocumentCountByApplicationId(
  applicationId: string
): Promise<number> {
  const count = await prisma.document.count({
    where: { applicationId },
  });

  return count;
}