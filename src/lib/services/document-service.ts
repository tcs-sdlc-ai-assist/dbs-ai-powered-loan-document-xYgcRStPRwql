import {
  createDocument,
  getDocumentById,
  getDocumentsByApplicationId,
  deleteDocument,
  getDocumentCountByApplicationId,
  getDocumentCountByType,
} from "@/lib/repositories/document-repository";
import type {
  CreateDocumentInput,
  DocumentWithExtraction,
} from "@/lib/repositories/document-repository";
import {
  createExtractionResult,
  getExtractionByDocumentId,
  getExtractionsByApplicationId,
  updateExtractionResult,
} from "@/lib/repositories/extraction-repository";
import type {
  ExtractionResultWithDocument,
} from "@/lib/repositories/extraction-repository";
import { getApplicationById } from "@/lib/repositories/application-repository";
import { documentUploadSchema } from "@/lib/validation-schemas";
import type { DocumentUploadInput } from "@/lib/validation-schemas";
import statusTracker from "@/lib/services/status-service";
import auditLogger from "@/lib/services/audit-service";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  VALIDATION_RULES,
  DOCUMENT_TYPES,
} from "@/lib/constants";
import type { DocumentType, ExtractionStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadDocumentInput {
  applicationId: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  ipAddress?: string | null;
}

export interface UploadDocumentResult {
  success: boolean;
  document: DocumentWithExtraction | null;
}

export interface TriggerExtractionInput {
  applicationId: string;
  documentIds?: string[];
  triggeredBy: string;
  ipAddress?: string | null;
}

export interface ExtractionResultItem {
  documentId: string;
  fields: Record<string, unknown>;
  confidence: number;
  status: ExtractionStatus;
  errors: Record<string, unknown> | null;
}

export interface TriggerExtractionResult {
  success: boolean;
  extractionResults: ExtractionResultItem[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Mock AI Extraction Engine
// ---------------------------------------------------------------------------

function generateMockExtractionData(
  documentType: DocumentType,
  fileName: string
): { extractedData: Record<string, unknown>; confidence: number } {
  switch (documentType) {
    case "INCOME_STATEMENT":
      return {
        extractedData: {
          applicantName: "Extracted Name",
          annualIncome: 72000,
          monthlyIncome: 6000,
          employer: "Extracted Employer Pte Ltd",
          employmentDate: "2019-03-15",
          currency: "SGD",
        },
        confidence: 0.93,
      };
    case "BANK_STATEMENT":
      return {
        extractedData: {
          accountHolder: "Extracted Name",
          bankName: "DBS Bank",
          accountNumber: "XXXX-XXXX-1234",
          averageMonthlyBalance: 15000,
          totalDeposits: 18000,
          totalWithdrawals: 12000,
          statementPeriod: "Q4 2024",
          currency: "SGD",
        },
        confidence: 0.91,
      };
    case "TAX_RETURN":
      return {
        extractedData: {
          taxpayerName: "Extracted Name",
          assessmentYear: "2023",
          totalIncome: 68000,
          taxableIncome: 54000,
          taxPaid: 3200,
          employer: "Extracted Employer Pte Ltd",
          currency: "SGD",
        },
        confidence: 0.90,
      };
    case "IDENTITY_DOCUMENT":
      return {
        extractedData: {
          fullName: "Extracted Name",
          nricNumber: "SXXXX567A",
          dateOfBirth: "1990-05-20",
          address: "123 Orchard Road, Singapore",
          nationality: "Singaporean",
        },
        confidence: 0.97,
      };
    case "PROPERTY_VALUATION":
      return {
        extractedData: {
          propertyAddress: "456 Marina Bay Drive, Singapore",
          valuationAmount: 1200000,
          valuationDate: "2024-10-01",
          propertyType: "Condominium",
          floorArea: "95 sqm",
          currency: "SGD",
        },
        confidence: 0.88,
      };
    case "EMPLOYMENT_LETTER":
      return {
        extractedData: {
          employeeName: "Extracted Name",
          employer: "Extracted Employer Pte Ltd",
          position: "Senior Manager",
          annualSalary: 120000,
          employmentStartDate: "2017-06-01",
          employmentType: "Permanent",
          currency: "SGD",
        },
        confidence: 0.94,
      };
    case "CREDIT_REPORT":
      return {
        extractedData: {
          applicantName: "Extracted Name",
          creditScore: 750,
          outstandingDebts: 25000,
          creditUtilization: 0.3,
          reportDate: "2024-10-15",
          currency: "SGD",
        },
        confidence: 0.89,
      };
    case "BUSINESS_REGISTRATION":
      return {
        extractedData: {
          businessName: "Extracted Business Pte Ltd",
          registrationNumber: "UEN12345678A",
          registrationDate: "2015-01-10",
          businessType: "Private Limited",
          directors: ["Director A", "Director B"],
        },
        confidence: 0.92,
      };
    case "FINANCIAL_STATEMENT":
      return {
        extractedData: {
          companyName: "Extracted Business Pte Ltd",
          revenue: 500000,
          netProfit: 120000,
          totalAssets: 800000,
          totalLiabilities: 300000,
          financialYear: "2023",
          currency: "SGD",
        },
        confidence: 0.87,
      };
    default:
      return {
        extractedData: {
          fileName,
          rawText: "Extracted content from document",
          extractedAt: new Date().toISOString(),
        },
        confidence: 0.75,
      };
  }
}

// ---------------------------------------------------------------------------
// DocumentService
// ---------------------------------------------------------------------------

class DocumentService {
  /**
   * Uploads a document for an application. Validates file type and size,
   * stores document metadata (simulates cloud storage with a local URL),
   * links the document to the application, and logs the action via AuditService.
   */
  async uploadDocument(
    input: UploadDocumentInput
  ): Promise<UploadDocumentResult> {
    const {
      applicationId,
      type,
      fileName,
      fileSize,
      mimeType,
      uploadedBy,
      ipAddress,
    } = input;

    // Verify the application exists
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Validate file type
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new Error(
        `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      throw new Error(
        `File size ${fileSize} bytes exceeds maximum allowed size of ${maxSizeMB} MB`
      );
    }

    if (fileSize <= 0) {
      throw new Error("File size must be positive");
    }

    // Check document count limit
    const currentDocCount = await getDocumentCountByApplicationId(applicationId);

    if (currentDocCount >= VALIDATION_RULES.maxDocumentsPerApplication) {
      throw new Error(
        `Maximum number of documents (${VALIDATION_RULES.maxDocumentsPerApplication}) reached for this application`
      );
    }

    // Simulate cloud storage URL (local path for pilot)
    const storageUrl = `/uploads/${application.applicationId}/${uuidv4()}_${fileName}`;

    // Validate via Zod schema
    const validationResult = documentUploadSchema.safeParse({
      applicationId,
      type,
      fileName,
      fileSize,
      storageUrl,
      uploadedBy,
    });

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((e) => e.message)
        .join("; ");
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    const validated: DocumentUploadInput = validationResult.data;

    // Create the document record
    const createInput: CreateDocumentInput = {
      applicationId: validated.applicationId,
      type: validated.type,
      fileName: validated.fileName,
      fileSize: validated.fileSize,
      storageUrl: validated.storageUrl,
      uploadedBy: validated.uploadedBy,
    };

    const document = await createDocument(createInput);

    // Log the upload action via AuditService
    try {
      await auditLogger.logAction({
        userId: uploadedBy,
        applicationId,
        action: "DOCUMENT_UPLOAD",
        entityType: "Document",
        entityId: document.id,
        details: {
          fileName: validated.fileName,
          documentType: validated.type,
          fileSize: validated.fileSize,
          storageUrl: validated.storageUrl,
        },
        ipAddress: ipAddress ?? null,
        outcome: "SUCCESS",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log document upload audit: ${message}`);
    }

    // Update application status to DOCUMENTS_PENDING if currently in a state that allows it
    try {
      const allowedSourceStatuses = ["SUBMITTED", "UNDER_REVIEW", "DOCUMENTS_PENDING"];
      if (allowedSourceStatuses.includes(application.status)) {
        // Only transition to DOCUMENTS_PENDING if not already there
        if (application.status !== "DOCUMENTS_PENDING") {
          const isAllowed = statusTracker.isTransitionAllowed(
            application.status,
            "DOCUMENTS_PENDING"
          );
          if (isAllowed) {
            await statusTracker.updateStatus({
              applicationId,
              newStatus: "DOCUMENTS_PENDING",
              changedBy: uploadedBy,
              comments: `Document uploaded: ${fileName}`,
              ipAddress: ipAddress ?? null,
            });
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to update application status after document upload: ${message}`);
    }

    // Retrieve the document with extraction result (will be null at this point)
    const documentWithExtraction = await getDocumentById(document.id);

    return {
      success: true,
      document: documentWithExtraction ?? null,
    };
  }

  /**
   * Triggers AI extraction for documents belonging to an application.
   * If documentIds are provided, only those documents are processed;
   * otherwise, all documents for the application are processed.
   * Updates application status and logs actions via AuditService.
   */
  async triggerExtraction(
    input: TriggerExtractionInput
  ): Promise<TriggerExtractionResult> {
    const { applicationId, documentIds, triggeredBy, ipAddress } = input;

    // Verify the application exists
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Get documents to process
    let documentsToProcess: DocumentWithExtraction[];

    if (documentIds && documentIds.length > 0) {
      // Fetch specific documents
      const fetchedDocs = await Promise.all(
        documentIds.map((docId) => getDocumentById(docId))
      );

      documentsToProcess = [];
      for (const doc of fetchedDocs) {
        if (!doc) {
          continue;
        }
        if (doc.applicationId !== applicationId) {
          throw new Error(
            `Document ${doc.id} does not belong to application ${applicationId}`
          );
        }
        documentsToProcess.push(doc);
      }

      if (documentsToProcess.length === 0) {
        throw new Error("No valid documents found for the provided document IDs");
      }
    } else {
      // Fetch all documents for the application
      documentsToProcess = await getDocumentsByApplicationId(applicationId);

      if (documentsToProcess.length === 0) {
        throw new Error(
          `No documents found for application ${applicationId}`
        );
      }
    }

    // Update application status to EXTRACTION_IN_PROGRESS
    try {
      const isAllowed = statusTracker.isTransitionAllowed(
        application.status,
        "EXTRACTION_IN_PROGRESS"
      );
      if (isAllowed) {
        await statusTracker.updateStatus({
          applicationId,
          newStatus: "EXTRACTION_IN_PROGRESS",
          changedBy: triggeredBy,
          comments: `Extraction triggered for ${documentsToProcess.length} document(s)`,
          ipAddress: ipAddress ?? null,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to update status to EXTRACTION_IN_PROGRESS: ${message}`);
    }

    const extractionResults: ExtractionResultItem[] = [];
    const errors: string[] = [];

    // Process each document through the mock AI extraction engine
    for (const doc of documentsToProcess) {
      try {
        // Check if extraction result already exists
        const existingExtraction = doc.extractionResult;

        if (
          existingExtraction &&
          existingExtraction.status === "COMPLETED"
        ) {
          // Skip already completed extractions
          extractionResults.push({
            documentId: doc.id,
            fields: existingExtraction.extractedData as Record<string, unknown>,
            confidence: existingExtraction.confidence,
            status: existingExtraction.status,
            errors: existingExtraction.errors as Record<string, unknown> | null,
          });
          continue;
        }

        // Generate mock extraction data
        const { extractedData, confidence } = generateMockExtractionData(
          doc.type,
          doc.fileName
        );

        // Determine extraction status based on confidence
        const extractionStatus: ExtractionStatus =
          confidence >= VALIDATION_RULES.minExtractionConfidence
            ? "COMPLETED"
            : "PARTIALLY_COMPLETED";

        if (existingExtraction) {
          // Update existing extraction result
          const updated = await updateExtractionResult(existingExtraction.id, {
            extractedData,
            confidence,
            status: extractionStatus,
            errors: null,
          });

          extractionResults.push({
            documentId: doc.id,
            fields: extractedData,
            confidence: updated.confidence,
            status: updated.status,
            errors: null,
          });
        } else {
          // Create new extraction result
          const created = await createExtractionResult({
            documentId: doc.id,
            extractedData,
            confidence,
            status: extractionStatus,
            errors: null,
          });

          extractionResults.push({
            documentId: doc.id,
            fields: extractedData,
            confidence: created.confidence,
            status: created.status,
            errors: null,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to extract document ${doc.id}: ${message}`);

        // Try to record the failure in the extraction result
        try {
          const existingExtraction = doc.extractionResult;
          if (existingExtraction) {
            await updateExtractionResult(existingExtraction.id, {
              status: "FAILED",
              errors: { message },
            });
          } else {
            await createExtractionResult({
              documentId: doc.id,
              extractedData: {},
              confidence: 0,
              status: "FAILED",
              errors: { message },
            });
          }
        } catch {
          // Swallow nested error — the primary error is already recorded
        }

        extractionResults.push({
          documentId: doc.id,
          fields: {},
          confidence: 0,
          status: "FAILED",
          errors: { message },
        });
      }
    }

    // Determine overall success
    const allSucceeded = errors.length === 0;
    const someSucceeded = extractionResults.some(
      (r) => r.status === "COMPLETED" || r.status === "PARTIALLY_COMPLETED"
    );

    // Update application status to EXTRACTION_COMPLETE if at least some succeeded
    if (someSucceeded) {
      try {
        // Re-fetch application to get current status after potential earlier update
        const currentApp = await getApplicationById(applicationId);
        if (currentApp && currentApp.status === "EXTRACTION_IN_PROGRESS") {
          await statusTracker.updateStatus({
            applicationId,
            newStatus: "EXTRACTION_COMPLETE",
            changedBy: triggeredBy,
            comments: allSucceeded
              ? `Extraction completed for all ${documentsToProcess.length} document(s)`
              : `Extraction completed with ${errors.length} error(s) out of ${documentsToProcess.length} document(s)`,
            ipAddress: ipAddress ?? null,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to update status to EXTRACTION_COMPLETE: ${message}`);
      }
    }

    // Log the extraction action via AuditService
    try {
      const confidenceScores = extractionResults
        .filter((r) => r.confidence > 0)
        .map((r) => r.confidence);
      const averageConfidence =
        confidenceScores.length > 0
          ? Math.round(
              (confidenceScores.reduce((sum, c) => sum + c, 0) /
                confidenceScores.length) *
                100
            ) / 100
          : 0;

      await auditLogger.logAction({
        userId: triggeredBy,
        applicationId,
        action: "EXTRACTION_COMPLETED",
        entityType: "ExtractionResult",
        entityId: applicationId,
        details: {
          documentsProcessed: documentsToProcess.length,
          successCount: extractionResults.filter(
            (r) => r.status === "COMPLETED" || r.status === "PARTIALLY_COMPLETED"
          ).length,
          failureCount: errors.length,
          averageConfidence,
          errors: errors.length > 0 ? errors : undefined,
        },
        ipAddress: ipAddress ?? null,
        outcome: allSucceeded ? "SUCCESS" : "PARTIAL_SUCCESS",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log extraction audit: ${message}`);
    }

    return {
      success: someSucceeded,
      extractionResults,
      errors,
    };
  }

  /**
   * Retrieves a document by its internal UUID (primary key).
   * Returns null if not found.
   */
  async getById(id: string): Promise<DocumentWithExtraction | null> {
    const document = await getDocumentById(id);
    return document ?? null;
  }

  /**
   * Retrieves all documents for a given application,
   * ordered by creation date descending.
   */
  async getByApplicationId(
    applicationId: string
  ): Promise<DocumentWithExtraction[]> {
    const documents = await getDocumentsByApplicationId(applicationId);
    return documents;
  }

  /**
   * Deletes a document by its internal UUID. Cascading deletes will
   * remove the associated extraction result. Logs the deletion via AuditService.
   */
  async removeDocument(
    documentId: string,
    deletedBy: string,
    ipAddress?: string | null
  ): Promise<void> {
    const document = await getDocumentById(documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    await deleteDocument(documentId);

    try {
      await auditLogger.logAction({
        userId: deletedBy,
        applicationId: document.applicationId,
        action: "DOCUMENT_DELETED",
        entityType: "Document",
        entityId: documentId,
        details: {
          fileName: document.fileName,
          documentType: document.type,
        },
        ipAddress: ipAddress ?? null,
        outcome: "SUCCESS",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log document deletion audit: ${message}`);
    }
  }

  /**
   * Returns the count of documents for a given application.
   */
  async getDocumentCount(applicationId: string): Promise<number> {
    const count = await getDocumentCountByApplicationId(applicationId);
    return count;
  }

  /**
   * Returns a count of documents grouped by document type for a given application.
   */
  async getDocumentCountByType(
    applicationId: string
  ): Promise<Record<DocumentType, number>> {
    const counts = await getDocumentCountByType(applicationId);
    return counts;
  }

  /**
   * Retrieves all extraction results for a given application.
   */
  async getExtractionsByApplicationId(
    applicationId: string
  ): Promise<ExtractionResultWithDocument[]> {
    const extractions = await getExtractionsByApplicationId(applicationId);
    return extractions;
  }

  /**
   * Retrieves the extraction result for a specific document.
   * Returns null if no extraction result exists.
   */
  async getExtractionByDocumentId(
    documentId: string
  ): Promise<ExtractionResultWithDocument | null> {
    const extraction = await getExtractionByDocumentId(documentId);
    return extraction ?? null;
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

const documentService = new DocumentService();

export default documentService;