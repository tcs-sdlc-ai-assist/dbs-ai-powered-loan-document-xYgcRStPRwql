import {
  createExtractionResult,
  getExtractionByDocumentId,
  updateExtractionResult,
  getExtractionsByApplicationId,
} from "@/lib/repositories/extraction-repository";
import type {
  ExtractionResultWithDocument,
} from "@/lib/repositories/extraction-repository";
import {
  getDocumentById,
  getDocumentsByApplicationId,
} from "@/lib/repositories/document-repository";
import type { DocumentWithExtraction } from "@/lib/repositories/document-repository";
import { VALIDATION_RULES } from "@/lib/constants";
import type { DocumentType, ExtractionStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionField {
  key: string;
  value: string | number | boolean | string[] | null;
  confidence: number;
}

export interface SingleExtractionResult {
  documentId: string;
  documentType: DocumentType;
  fileName: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  status: ExtractionStatus;
  errors: Record<string, unknown> | null;
}

export interface BulkExtractionResult {
  applicationId: string;
  results: SingleExtractionResult[];
  totalDocuments: number;
  successCount: number;
  failureCount: number;
  averageConfidence: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Mock Data Generators
// ---------------------------------------------------------------------------

function generateMockDataForDocumentType(
  documentType: DocumentType,
  fileName: string
): { extractedData: Record<string, unknown>; confidence: number } {
  // Simulate occasional lower confidence based on a deterministic seed
  const seed = fileName.length % 10;
  const confidenceJitter = (seed - 5) * 0.01;

  switch (documentType) {
    case "INCOME_STATEMENT":
      return {
        extractedData: {
          applicantName: "Extracted Applicant Name",
          annualIncome: 72000,
          monthlyIncome: 6000,
          employer: "Extracted Employer Pte Ltd",
          employmentDate: "2019-03-15",
          designation: "Senior Engineer",
          currency: "SGD",
          documentDate: "2024-01-15",
        },
        confidence: Math.min(1, Math.max(0.5, 0.93 + confidenceJitter)),
      };

    case "BANK_STATEMENT":
      return {
        extractedData: {
          accountHolder: "Extracted Applicant Name",
          bankName: "DBS Bank",
          accountNumber: "XXXX-XXXX-4521",
          averageMonthlyBalance: 15200,
          totalDeposits: 18500,
          totalWithdrawals: 12300,
          statementPeriod: "October 2024 - December 2024",
          currency: "SGD",
          closingBalance: 21400,
        },
        confidence: Math.min(1, Math.max(0.5, 0.91 + confidenceJitter)),
      };

    case "TAX_RETURN":
      return {
        extractedData: {
          taxpayerName: "Extracted Applicant Name",
          assessmentYear: "2023",
          totalIncome: 68000,
          taxableIncome: 54000,
          taxPaid: 3200,
          employer: "Extracted Employer Pte Ltd",
          currency: "SGD",
          filingDate: "2024-04-15",
        },
        confidence: Math.min(1, Math.max(0.5, 0.90 + confidenceJitter)),
      };

    case "IDENTITY_DOCUMENT":
      return {
        extractedData: {
          fullName: "Extracted Applicant Name",
          nricNumber: "SXXXX567A",
          dateOfBirth: "1990-05-20",
          address: "123 Orchard Road, #08-01, Singapore 238858",
          nationality: "Singaporean",
          gender: "Male",
          issueDate: "2015-06-01",
          expiryDate: "2025-06-01",
        },
        confidence: Math.min(1, Math.max(0.5, 0.97 + confidenceJitter)),
      };

    case "PROPERTY_VALUATION":
      return {
        extractedData: {
          propertyAddress: "456 Marina Bay Drive, #12-05, Singapore 018983",
          valuationAmount: 1200000,
          valuationDate: "2024-10-01",
          propertyType: "Condominium",
          floorArea: "95 sqm",
          tenure: "99-year leasehold",
          currency: "SGD",
          valuer: "Certified Valuations Pte Ltd",
        },
        confidence: Math.min(1, Math.max(0.5, 0.88 + confidenceJitter)),
      };

    case "EMPLOYMENT_LETTER":
      return {
        extractedData: {
          employeeName: "Extracted Applicant Name",
          employer: "Extracted Employer Pte Ltd",
          position: "Senior Manager",
          annualSalary: 120000,
          employmentStartDate: "2017-06-01",
          employmentType: "Permanent",
          currency: "SGD",
          letterDate: "2024-10-20",
          hrContact: "HR Department",
        },
        confidence: Math.min(1, Math.max(0.5, 0.94 + confidenceJitter)),
      };

    case "CREDIT_REPORT":
      return {
        extractedData: {
          applicantName: "Extracted Applicant Name",
          creditScore: 750,
          outstandingDebts: 25000,
          creditUtilization: 0.3,
          reportDate: "2024-10-15",
          totalCreditLines: 5,
          delinquencies: 0,
          currency: "SGD",
        },
        confidence: Math.min(1, Math.max(0.5, 0.89 + confidenceJitter)),
      };

    case "BUSINESS_REGISTRATION":
      return {
        extractedData: {
          businessName: "Extracted Business Pte Ltd",
          registrationNumber: "UEN12345678A",
          registrationDate: "2015-01-10",
          businessType: "Private Limited",
          directors: ["Director A", "Director B"],
          registeredAddress: "789 Business Park, Singapore 123456",
          status: "Active",
        },
        confidence: Math.min(1, Math.max(0.5, 0.92 + confidenceJitter)),
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
          auditor: "Audit Firm Pte Ltd",
        },
        confidence: Math.min(1, Math.max(0.5, 0.87 + confidenceJitter)),
      };

    case "OTHER":
    default:
      return {
        extractedData: {
          fileName,
          rawText: "Extracted content from document",
          extractedAt: new Date().toISOString(),
          documentCategory: "Other",
        },
        confidence: Math.min(1, Math.max(0.5, 0.75 + confidenceJitter)),
      };
  }
}

/**
 * Simulates occasional extraction failures for realism.
 * Returns true if the extraction should fail (approximately 5% of the time).
 */
function shouldSimulateError(documentId: string): boolean {
  // Use a deterministic check based on the document ID to make tests predictable
  const hash = documentId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 20 === 0;
}

// ---------------------------------------------------------------------------
// AIExtractionEngine
// ---------------------------------------------------------------------------

class AIExtractionEngine {
  /**
   * Processes a single document through the mock AI extraction engine.
   * Generates realistic extracted data based on the document type,
   * assigns a confidence score, and persists the result via the
   * extraction repository.
   *
   * If an extraction result already exists and is COMPLETED, it is
   * returned as-is without re-processing.
   *
   * @param documentId - The internal UUID of the document to process.
   * @returns A SingleExtractionResult with extracted fields and metadata.
   */
  async extractFromDocument(documentId: string): Promise<SingleExtractionResult> {
    // Fetch the document
    const document = await getDocumentById(documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Check if extraction result already exists and is completed
    const existingExtraction = document.extractionResult;

    if (existingExtraction && existingExtraction.status === "COMPLETED") {
      return {
        documentId: document.id,
        documentType: document.type,
        fileName: document.fileName,
        extractedData: existingExtraction.extractedData as Record<string, unknown>,
        confidence: existingExtraction.confidence,
        status: existingExtraction.status,
        errors: existingExtraction.errors as Record<string, unknown> | null,
      };
    }

    // Simulate processing delay (mock AI latency)
    await this.simulateProcessingDelay();

    // Check for simulated errors
    if (shouldSimulateError(documentId)) {
      const errorDetails = {
        code: "EXTRACTION_FAILED",
        message: "Simulated AI extraction failure: unable to parse document content",
        documentId,
        timestamp: new Date().toISOString(),
      };

      if (existingExtraction) {
        await updateExtractionResult(existingExtraction.id, {
          status: "FAILED",
          confidence: 0,
          extractedData: {},
          errors: errorDetails,
        });
      } else {
        await createExtractionResult({
          documentId,
          extractedData: {},
          confidence: 0,
          status: "FAILED",
          errors: errorDetails,
        });
      }

      return {
        documentId: document.id,
        documentType: document.type,
        fileName: document.fileName,
        extractedData: {},
        confidence: 0,
        status: "FAILED",
        errors: errorDetails,
      };
    }

    // Generate mock extraction data
    const { extractedData, confidence } = generateMockDataForDocumentType(
      document.type,
      document.fileName
    );

    // Determine extraction status based on confidence threshold
    const extractionStatus: ExtractionStatus =
      confidence >= VALIDATION_RULES.minExtractionConfidence
        ? "COMPLETED"
        : "PARTIALLY_COMPLETED";

    // Persist the extraction result
    if (existingExtraction) {
      await updateExtractionResult(existingExtraction.id, {
        extractedData,
        confidence,
        status: extractionStatus,
        errors: null,
      });
    } else {
      await createExtractionResult({
        documentId,
        extractedData,
        confidence,
        status: extractionStatus,
        errors: null,
      });
    }

    return {
      documentId: document.id,
      documentType: document.type,
      fileName: document.fileName,
      extractedData,
      confidence,
      status: extractionStatus,
      errors: null,
    };
  }

  /**
   * Processes all documents for a given application through the mock AI
   * extraction engine. Iterates over each document, extracts data, and
   * aggregates results.
   *
   * Documents that already have COMPLETED extraction results are returned
   * as-is without re-processing.
   *
   * @param applicationId - The internal UUID of the application.
   * @param documentIds - Optional array of specific document IDs to process.
   *                      If omitted, all documents for the application are processed.
   * @returns A BulkExtractionResult with per-document results and summary statistics.
   */
  async extractAll(
    applicationId: string,
    documentIds?: string[]
  ): Promise<BulkExtractionResult> {
    let documentsToProcess: DocumentWithExtraction[];

    if (documentIds && documentIds.length > 0) {
      // Fetch specific documents and validate they belong to the application
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
      documentsToProcess = await getDocumentsByApplicationId(applicationId);

      if (documentsToProcess.length === 0) {
        throw new Error(
          `No documents found for application ${applicationId}`
        );
      }
    }

    const results: SingleExtractionResult[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const doc of documentsToProcess) {
      try {
        const result = await this.extractFromDocument(doc.id);
        results.push(result);

        if (result.status === "COMPLETED" || result.status === "PARTIALLY_COMPLETED") {
          successCount++;
        } else {
          failureCount++;
          if (result.errors) {
            const errorMsg =
              typeof result.errors.message === "string"
                ? result.errors.message
                : `Extraction failed for document ${doc.id}`;
            errors.push(errorMsg);
          }
        }
      } catch (error) {
        failureCount++;
        const message =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to extract document ${doc.id}: ${message}`);

        results.push({
          documentId: doc.id,
          documentType: doc.type,
          fileName: doc.fileName,
          extractedData: {},
          confidence: 0,
          status: "FAILED",
          errors: { message },
        });
      }
    }

    // Calculate average confidence from successful extractions
    const confidenceScores = results
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

    return {
      applicationId,
      results,
      totalDocuments: documentsToProcess.length,
      successCount,
      failureCount,
      averageConfidence,
      errors,
    };
  }

  /**
   * Retrieves all existing extraction results for an application
   * without triggering new extractions.
   *
   * @param applicationId - The internal UUID of the application.
   * @returns An array of extraction results with their associated documents.
   */
  async getExtractionResults(
    applicationId: string
  ): Promise<ExtractionResultWithDocument[]> {
    const results = await getExtractionsByApplicationId(applicationId);
    return results;
  }

  /**
   * Retrieves the extraction result for a specific document
   * without triggering a new extraction.
   *
   * @param documentId - The internal UUID of the document.
   * @returns The extraction result with its associated document, or null.
   */
  async getExtractionResultByDocumentId(
    documentId: string
  ): Promise<ExtractionResultWithDocument | null> {
    const result = await getExtractionByDocumentId(documentId);
    return result ?? null;
  }

  /**
   * Checks whether all documents for an application have been
   * successfully extracted.
   *
   * @param applicationId - The internal UUID of the application.
   * @returns true if all documents have COMPLETED extraction results.
   */
  async isExtractionComplete(applicationId: string): Promise<boolean> {
    const documents = await getDocumentsByApplicationId(applicationId);

    if (documents.length === 0) {
      return false;
    }

    return documents.every(
      (doc) =>
        doc.extractionResult !== null &&
        doc.extractionResult.status === "COMPLETED"
    );
  }

  /**
   * Simulates AI processing delay for realism.
   * In production, this would be replaced by actual API call latency.
   */
  private async simulateProcessingDelay(): Promise<void> {
    // Minimal delay for the mock engine (10ms) to keep tests fast
    // In production, this method would be removed entirely
    return new Promise((resolve) => setTimeout(resolve, 10));
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

const aiExtractionEngine = new AIExtractionEngine();

export default aiExtractionEngine;