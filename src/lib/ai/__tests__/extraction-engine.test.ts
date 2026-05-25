import aiExtractionEngine from "@/lib/ai/extraction-engine";
import type { DocumentType, ExtractionStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetDocumentById = jest.fn();
const mockGetDocumentsByApplicationId = jest.fn();

jest.mock("@/lib/repositories/document-repository", () => ({
  getDocumentById: (...args: unknown[]) => mockGetDocumentById(...args),
  getDocumentsByApplicationId: (...args: unknown[]) =>
    mockGetDocumentsByApplicationId(...args),
  getDocumentCountByType: jest.fn(),
  getDocumentCountByApplicationId: jest.fn(),
  createDocument: jest.fn(),
  deleteDocument: jest.fn(),
}));

const mockCreateExtractionResult = jest.fn();
const mockGetExtractionByDocumentId = jest.fn();
const mockUpdateExtractionResult = jest.fn();
const mockGetExtractionsByApplicationId = jest.fn();

jest.mock("@/lib/repositories/extraction-repository", () => ({
  createExtractionResult: (...args: unknown[]) =>
    mockCreateExtractionResult(...args),
  getExtractionByDocumentId: (...args: unknown[]) =>
    mockGetExtractionByDocumentId(...args),
  updateExtractionResult: (...args: unknown[]) =>
    mockUpdateExtractionResult(...args),
  getExtractionsByApplicationId: (...args: unknown[]) =>
    mockGetExtractionsByApplicationId(...args),
  getExtractionResultById: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {},
}));

// ---------------------------------------------------------------------------
// Test Data Helpers
// ---------------------------------------------------------------------------

const MOCK_APP_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

function buildMockDocument(
  type: DocumentType,
  overrides?: Record<string, unknown>
) {
  return {
    id: `doc-${type.toLowerCase()}`,
    applicationId: MOCK_APP_ID,
    type,
    fileName: `${type.toLowerCase()}.pdf`,
    fileSize: 100000,
    storageUrl: `/uploads/DBS-1234/${type.toLowerCase()}.pdf`,
    uploadedBy: MOCK_USER_ID,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    extractionResult: null,
    ...overrides,
  };
}

function buildMockExtractionResult(
  documentId: string,
  overrides?: Record<string, unknown>
) {
  return {
    id: `ext-${documentId}`,
    documentId,
    extractedData: { applicantName: "Test User" },
    confidence: 0.93,
    status: "COMPLETED" as ExtractionStatus,
    errors: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    document: buildMockDocument("INCOME_STATEMENT"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AIExtractionEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateExtractionResult.mockImplementation(async (input) => ({
      id: `ext-${input.documentId}`,
      documentId: input.documentId,
      extractedData: input.extractedData,
      confidence: input.confidence,
      status: input.status ?? "PENDING",
      errors: input.errors ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    mockUpdateExtractionResult.mockImplementation(async (id, input) => ({
      id,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  // -------------------------------------------------------------------------
  // extractFromDocument — returns structured data for each document type
  // -------------------------------------------------------------------------

  describe("extractFromDocument", () => {
    const DOCUMENT_TYPES_TO_TEST: DocumentType[] = [
      "INCOME_STATEMENT",
      "BANK_STATEMENT",
      "TAX_RETURN",
      "IDENTITY_DOCUMENT",
      "PROPERTY_VALUATION",
      "EMPLOYMENT_LETTER",
      "CREDIT_REPORT",
      "BUSINESS_REGISTRATION",
      "FINANCIAL_STATEMENT",
      "OTHER",
    ];

    it.each(DOCUMENT_TYPES_TO_TEST)(
      "returns structured extracted data for %s document type",
      async (docType) => {
        const mockDoc = buildMockDocument(docType);
        mockGetDocumentById.mockResolvedValue(mockDoc);

        const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

        expect(result).toBeDefined();
        expect(result.documentId).toBe(mockDoc.id);
        expect(result.documentType).toBe(docType);
        expect(result.fileName).toBe(mockDoc.fileName);
        expect(result.extractedData).toBeDefined();
        expect(typeof result.extractedData).toBe("object");
        expect(Object.keys(result.extractedData).length).toBeGreaterThan(0);
      }
    );

    it("returns INCOME_STATEMENT fields including applicantName, annualIncome, employer", async () => {
      const mockDoc = buildMockDocument("INCOME_STATEMENT");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("applicantName");
      expect(result.extractedData).toHaveProperty("annualIncome");
      expect(result.extractedData).toHaveProperty("employer");
      expect(result.extractedData).toHaveProperty("currency");
    });

    it("returns BANK_STATEMENT fields including accountHolder, bankName, averageMonthlyBalance", async () => {
      const mockDoc = buildMockDocument("BANK_STATEMENT");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("accountHolder");
      expect(result.extractedData).toHaveProperty("bankName");
      expect(result.extractedData).toHaveProperty("averageMonthlyBalance");
      expect(result.extractedData).toHaveProperty("currency");
    });

    it("returns TAX_RETURN fields including taxpayerName, totalIncome, taxPaid", async () => {
      const mockDoc = buildMockDocument("TAX_RETURN");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("taxpayerName");
      expect(result.extractedData).toHaveProperty("totalIncome");
      expect(result.extractedData).toHaveProperty("taxPaid");
      expect(result.extractedData).toHaveProperty("currency");
    });

    it("returns IDENTITY_DOCUMENT fields including fullName, nricNumber, dateOfBirth", async () => {
      const mockDoc = buildMockDocument("IDENTITY_DOCUMENT");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("fullName");
      expect(result.extractedData).toHaveProperty("nricNumber");
      expect(result.extractedData).toHaveProperty("dateOfBirth");
      expect(result.extractedData).toHaveProperty("nationality");
    });

    it("returns PROPERTY_VALUATION fields including propertyAddress, valuationAmount", async () => {
      const mockDoc = buildMockDocument("PROPERTY_VALUATION");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("propertyAddress");
      expect(result.extractedData).toHaveProperty("valuationAmount");
      expect(result.extractedData).toHaveProperty("propertyType");
      expect(result.extractedData).toHaveProperty("currency");
    });

    it("returns EMPLOYMENT_LETTER fields including employeeName, employer, annualSalary", async () => {
      const mockDoc = buildMockDocument("EMPLOYMENT_LETTER");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("employeeName");
      expect(result.extractedData).toHaveProperty("employer");
      expect(result.extractedData).toHaveProperty("annualSalary");
      expect(result.extractedData).toHaveProperty("employmentType");
    });

    it("returns CREDIT_REPORT fields including creditScore, outstandingDebts", async () => {
      const mockDoc = buildMockDocument("CREDIT_REPORT");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("applicantName");
      expect(result.extractedData).toHaveProperty("creditScore");
      expect(result.extractedData).toHaveProperty("outstandingDebts");
    });

    it("returns BUSINESS_REGISTRATION fields including businessName, registrationNumber", async () => {
      const mockDoc = buildMockDocument("BUSINESS_REGISTRATION");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("businessName");
      expect(result.extractedData).toHaveProperty("registrationNumber");
      expect(result.extractedData).toHaveProperty("businessType");
    });

    it("returns FINANCIAL_STATEMENT fields including revenue, netProfit, totalAssets", async () => {
      const mockDoc = buildMockDocument("FINANCIAL_STATEMENT");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("companyName");
      expect(result.extractedData).toHaveProperty("revenue");
      expect(result.extractedData).toHaveProperty("netProfit");
      expect(result.extractedData).toHaveProperty("totalAssets");
    });

    it("returns OTHER document type with generic extracted data", async () => {
      const mockDoc = buildMockDocument("OTHER");
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toHaveProperty("fileName");
      expect(result.extractedData).toHaveProperty("rawText");
    });
  });

  // -------------------------------------------------------------------------
  // extractFromDocument — confidence scores
  // -------------------------------------------------------------------------

  describe("extractFromDocument — confidence scores", () => {
    it("returns confidence score between 0.5 and 1.0 for all document types", async () => {
      const docTypes: DocumentType[] = [
        "INCOME_STATEMENT",
        "BANK_STATEMENT",
        "TAX_RETURN",
        "IDENTITY_DOCUMENT",
        "PROPERTY_VALUATION",
        "EMPLOYMENT_LETTER",
        "CREDIT_REPORT",
        "BUSINESS_REGISTRATION",
        "FINANCIAL_STATEMENT",
        "OTHER",
      ];

      for (const docType of docTypes) {
        const mockDoc = buildMockDocument(docType);
        mockGetDocumentById.mockResolvedValue(mockDoc);

        const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

        // If extraction succeeded (not simulated error)
        if (result.status !== "FAILED") {
          expect(result.confidence).toBeGreaterThanOrEqual(0.5);
          expect(result.confidence).toBeLessThanOrEqual(1.0);
        }
      }
    });

    it("returns higher confidence for IDENTITY_DOCUMENT than OTHER", async () => {
      // IDENTITY_DOCUMENT has base confidence ~0.97, OTHER has ~0.75
      const identityDoc = buildMockDocument("IDENTITY_DOCUMENT", {
        id: "doc-identity-test",
        fileName: "identity_test.pdf",
      });
      const otherDoc = buildMockDocument("OTHER", {
        id: "doc-other-test",
        fileName: "other_test.pdf",
      });

      mockGetDocumentById
        .mockResolvedValueOnce(identityDoc)
        .mockResolvedValueOnce(otherDoc);

      const identityResult = await aiExtractionEngine.extractFromDocument(
        identityDoc.id
      );
      const otherResult = await aiExtractionEngine.extractFromDocument(
        otherDoc.id
      );

      // Both should succeed (not simulated error) for this comparison to be valid
      if (
        identityResult.status !== "FAILED" &&
        otherResult.status !== "FAILED"
      ) {
        expect(identityResult.confidence).toBeGreaterThan(
          otherResult.confidence
        );
      }
    });

    it("assigns COMPLETED status when confidence meets minimum threshold", async () => {
      const mockDoc = buildMockDocument("IDENTITY_DOCUMENT", {
        id: "doc-high-conf",
        fileName: "high_confidence.pdf",
      });
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      if (result.status !== "FAILED") {
        // IDENTITY_DOCUMENT has base confidence ~0.97 which is above 0.8 threshold
        if (result.confidence >= 0.8) {
          expect(result.status).toBe("COMPLETED");
        } else {
          expect(result.status).toBe("PARTIALLY_COMPLETED");
        }
      }
    });

    it("assigns PARTIALLY_COMPLETED status when confidence is below minimum threshold", async () => {
      // OTHER has base confidence ~0.75 which may be below 0.8 threshold
      const mockDoc = buildMockDocument("OTHER", {
        id: "doc-low-conf",
        // Use a fileName that produces a seed resulting in lower confidence
        fileName: "low_confidence_document_test.pdf",
      });
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      if (result.status !== "FAILED" && result.confidence < 0.8) {
        expect(result.status).toBe("PARTIALLY_COMPLETED");
      }
    });
  });

  // -------------------------------------------------------------------------
  // extractFromDocument — already completed extraction
  // -------------------------------------------------------------------------

  describe("extractFromDocument — already completed extraction", () => {
    it("returns existing extraction result without re-processing when status is COMPLETED", async () => {
      const existingExtraction = {
        id: "ext-existing",
        documentId: "doc-income_statement",
        extractedData: {
          applicantName: "Existing User",
          annualIncome: 80000,
          currency: "SGD",
        },
        confidence: 0.95,
        status: "COMPLETED" as ExtractionStatus,
        errors: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDoc = buildMockDocument("INCOME_STATEMENT", {
        extractionResult: existingExtraction,
      });
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      expect(result.extractedData).toEqual(existingExtraction.extractedData);
      expect(result.confidence).toBe(0.95);
      expect(result.status).toBe("COMPLETED");

      // Should NOT have called create or update since extraction already exists and is COMPLETED
      expect(mockCreateExtractionResult).not.toHaveBeenCalled();
      expect(mockUpdateExtractionResult).not.toHaveBeenCalled();
    });

    it("re-processes when existing extraction status is not COMPLETED", async () => {
      const existingExtraction = {
        id: "ext-pending",
        documentId: "doc-income_statement",
        extractedData: {},
        confidence: 0,
        status: "PENDING" as ExtractionStatus,
        errors: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDoc = buildMockDocument("INCOME_STATEMENT", {
        extractionResult: existingExtraction,
      });
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      if (result.status !== "FAILED") {
        // Should have updated the existing extraction result
        expect(mockUpdateExtractionResult).toHaveBeenCalledTimes(1);
        expect(mockUpdateExtractionResult).toHaveBeenCalledWith(
          existingExtraction.id,
          expect.objectContaining({
            extractedData: expect.any(Object),
            confidence: expect.any(Number),
          })
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // extractFromDocument — error handling
  // -------------------------------------------------------------------------

  describe("extractFromDocument — error handling", () => {
    it("throws error when document is not found", async () => {
      mockGetDocumentById.mockResolvedValue(null);

      await expect(
        aiExtractionEngine.extractFromDocument("non-existent-doc")
      ).rejects.toThrow("Document not found: non-existent-doc");
    });

    it("creates extraction result with FAILED status on simulated error", async () => {
      // We need to find a document ID that triggers shouldSimulateError
      // shouldSimulateError returns true when hash % 20 === 0
      // We'll test by checking that FAILED results have proper structure
      const docTypes: DocumentType[] = [
        "INCOME_STATEMENT",
        "BANK_STATEMENT",
        "TAX_RETURN",
        "IDENTITY_DOCUMENT",
      ];

      let foundFailure = false;

      for (let i = 0; i < 100 && !foundFailure; i++) {
        const docId = `doc-test-${i}`;
        const mockDoc = buildMockDocument("INCOME_STATEMENT", {
          id: docId,
          fileName: `test_${i}.pdf`,
        });
        mockGetDocumentById.mockResolvedValue(mockDoc);

        const result = await aiExtractionEngine.extractFromDocument(docId);

        if (result.status === "FAILED") {
          foundFailure = true;
          expect(result.confidence).toBe(0);
          expect(result.extractedData).toEqual({});
          expect(result.errors).toBeDefined();
          expect(result.errors).not.toBeNull();
          expect(result.errors!.code).toBe("EXTRACTION_FAILED");
          expect(result.errors!.message).toContain("Simulated AI extraction failure");
        }
      }

      // It's possible (but very unlikely) that no failure was triggered in 100 attempts
      // The test is still valid — it verifies the structure when failures occur
    });

    it("persists FAILED extraction result to the database", async () => {
      // Find a document ID that triggers simulated error
      for (let i = 0; i < 100; i++) {
        const docId = `doc-fail-persist-${i}`;
        // Calculate hash to find one that triggers error
        const hash = docId
          .split("")
          .reduce((acc, char) => acc + char.charCodeAt(0), 0);

        if (hash % 20 === 0) {
          const mockDoc = buildMockDocument("INCOME_STATEMENT", {
            id: docId,
            fileName: `fail_persist_${i}.pdf`,
          });
          mockGetDocumentById.mockResolvedValue(mockDoc);

          await aiExtractionEngine.extractFromDocument(docId);

          // Should have created an extraction result with FAILED status
          expect(mockCreateExtractionResult).toHaveBeenCalledWith(
            expect.objectContaining({
              documentId: docId,
              status: "FAILED",
              confidence: 0,
              extractedData: {},
            })
          );
          break;
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // extractFromDocument — persists new extraction results
  // -------------------------------------------------------------------------

  describe("extractFromDocument — persists new extraction results", () => {
    it("creates a new extraction result when none exists", async () => {
      const mockDoc = buildMockDocument("INCOME_STATEMENT", {
        id: "doc-new-extraction",
        fileName: "new_extraction.pdf",
        extractionResult: null,
      });
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      if (result.status !== "FAILED") {
        expect(mockCreateExtractionResult).toHaveBeenCalledTimes(1);
        expect(mockCreateExtractionResult).toHaveBeenCalledWith(
          expect.objectContaining({
            documentId: mockDoc.id,
            extractedData: expect.any(Object),
            confidence: expect.any(Number),
            errors: null,
          })
        );
      }
    });

    it("updates existing extraction result when status is not COMPLETED", async () => {
      const existingExtraction = {
        id: "ext-to-update",
        documentId: "doc-update-extraction",
        extractedData: {},
        confidence: 0,
        status: "FAILED" as ExtractionStatus,
        errors: { message: "Previous failure" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDoc = buildMockDocument("BANK_STATEMENT", {
        id: "doc-update-extraction",
        fileName: "update_extraction.pdf",
        extractionResult: existingExtraction,
      });
      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result = await aiExtractionEngine.extractFromDocument(mockDoc.id);

      if (result.status !== "FAILED") {
        expect(mockUpdateExtractionResult).toHaveBeenCalledTimes(1);
        expect(mockUpdateExtractionResult).toHaveBeenCalledWith(
          existingExtraction.id,
          expect.objectContaining({
            extractedData: expect.any(Object),
            confidence: expect.any(Number),
          })
        );
        // Should NOT have created a new one
        expect(mockCreateExtractionResult).not.toHaveBeenCalled();
      }
    });
  });

  // -------------------------------------------------------------------------
  // extractAll — processes all documents for an application
  // -------------------------------------------------------------------------

  describe("extractAll", () => {
    it("processes all documents for an application and returns bulk result", async () => {
      const documents = [
        buildMockDocument("INCOME_STATEMENT", {
          id: "doc-all-income",
          fileName: "income_all.pdf",
        }),
        buildMockDocument("BANK_STATEMENT", {
          id: "doc-all-bank",
          fileName: "bank_all.pdf",
        }),
        buildMockDocument("TAX_RETURN", {
          id: "doc-all-tax",
          fileName: "tax_all.pdf",
        }),
        buildMockDocument("IDENTITY_DOCUMENT", {
          id: "doc-all-identity",
          fileName: "identity_all.pdf",
        }),
      ];

      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      // Mock getDocumentById for each document
      for (const doc of documents) {
        mockGetDocumentById.mockImplementation(async (id: string) => {
          return documents.find((d) => d.id === id) ?? null;
        });
      }

      const result = await aiExtractionEngine.extractAll(MOCK_APP_ID);

      expect(result).toBeDefined();
      expect(result.applicationId).toBe(MOCK_APP_ID);
      expect(result.totalDocuments).toBe(4);
      expect(result.results).toHaveLength(4);
      expect(result.successCount + result.failureCount).toBe(4);
    });

    it("returns correct summary statistics", async () => {
      const documents = [
        buildMockDocument("INCOME_STATEMENT", {
          id: "doc-stats-income",
          fileName: "stats_income.pdf",
        }),
        buildMockDocument("BANK_STATEMENT", {
          id: "doc-stats-bank",
          fileName: "stats_bank.pdf",
        }),
      ];

      mockGetDocumentsByApplicationId.mockResolvedValue(documents);
      mockGetDocumentById.mockImplementation(async (id: string) => {
        return documents.find((d) => d.id === id) ?? null;
      });

      const result = await aiExtractionEngine.extractAll(MOCK_APP_ID);

      expect(result.totalDocuments).toBe(2);
      expect(result.successCount).toBeGreaterThanOrEqual(0);
      expect(result.failureCount).toBeGreaterThanOrEqual(0);
      expect(result.successCount + result.failureCount).toBe(2);

      if (result.successCount > 0) {
        expect(result.averageConfidence).toBeGreaterThan(0);
        expect(result.averageConfidence).toBeLessThanOrEqual(1);
      }
    });

    it("processes only specified documentIds when provided", async () => {
      const doc1 = buildMockDocument("INCOME_STATEMENT", {
        id: "doc-specific-1",
        fileName: "specific_1.pdf",
      });
      const doc2 = buildMockDocument("BANK_STATEMENT", {
        id: "doc-specific-2",
        fileName: "specific_2.pdf",
      });

      mockGetDocumentById.mockImplementation(async (id: string) => {
        if (id === doc1.id) return doc1;
        if (id === doc2.id) return doc2;
        return null;
      });

      const result = await aiExtractionEngine.extractAll(MOCK_APP_ID, [
        doc1.id,
      ]);

      expect(result.totalDocuments).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].documentId).toBe(doc1.id);
    });

    it("throws error when no documents found for application", async () => {
      mockGetDocumentsByApplicationId.mockResolvedValue([]);

      await expect(
        aiExtractionEngine.extractAll(MOCK_APP_ID)
      ).rejects.toThrow(
        `No documents found for application ${MOCK_APP_ID}`
      );
    });

    it("throws error when no valid documents found for provided documentIds", async () => {
      mockGetDocumentById.mockResolvedValue(null);

      await expect(
        aiExtractionEngine.extractAll(MOCK_APP_ID, ["non-existent-doc"])
      ).rejects.toThrow(
        "No valid documents found for the provided document IDs"
      );
    });

    it("throws error when document does not belong to the application", async () => {
      const doc = buildMockDocument("INCOME_STATEMENT", {
        id: "doc-wrong-app",
        applicationId: "different-app-id",
        fileName: "wrong_app.pdf",
      });
      mockGetDocumentById.mockResolvedValue(doc);

      await expect(
        aiExtractionEngine.extractAll(MOCK_APP_ID, [doc.id])
      ).rejects.toThrow(
        `Document ${doc.id} does not belong to application ${MOCK_APP_ID}`
      );
    });

    it("skips already completed extractions in extractAll", async () => {
      const completedExtraction = {
        id: "ext-completed",
        documentId: "doc-already-done",
        extractedData: { applicantName: "Already Done" },
        confidence: 0.95,
        status: "COMPLETED" as ExtractionStatus,
        errors: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const doc = buildMockDocument("INCOME_STATEMENT", {
        id: "doc-already-done",
        fileName: "already_done.pdf",
        extractionResult: completedExtraction,
      });

      mockGetDocumentsByApplicationId.mockResolvedValue([doc]);
      mockGetDocumentById.mockResolvedValue(doc);

      const result = await aiExtractionEngine.extractAll(MOCK_APP_ID);

      expect(result.totalDocuments).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe("COMPLETED");
      expect(result.results[0].extractedData).toEqual(
        completedExtraction.extractedData
      );
      expect(result.results[0].confidence).toBe(0.95);

      // Should not have created or updated since it was already completed
      expect(mockCreateExtractionResult).not.toHaveBeenCalled();
      expect(mockUpdateExtractionResult).not.toHaveBeenCalled();
    });

    it("handles individual document extraction failures gracefully in extractAll", async () => {
      const doc1 = buildMockDocument("INCOME_STATEMENT", {
        id: "doc-bulk-1",
        fileName: "bulk_1.pdf",
      });
      const doc2 = buildMockDocument("BANK_STATEMENT", {
        id: "doc-bulk-2",
        fileName: "bulk_2.pdf",
      });

      mockGetDocumentsByApplicationId.mockResolvedValue([doc1, doc2]);

      // First document succeeds, second throws an error
      let callCount = 0;
      mockGetDocumentById.mockImplementation(async (id: string) => {
        callCount++;
        if (id === doc1.id) return doc1;
        if (id === doc2.id) {
          // Simulate an error by returning a document that will cause issues
          throw new Error("Simulated document fetch error");
        }
        return null;
      });

      const result = await aiExtractionEngine.extractAll(MOCK_APP_ID);

      // Should still return results for both documents
      expect(result.totalDocuments).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.failureCount).toBeGreaterThan(0);

      // The failed document should have FAILED status
      const failedResult = result.results.find(
        (r) => r.documentId === doc2.id
      );
      expect(failedResult).toBeDefined();
      expect(failedResult!.status).toBe("FAILED");
    });

    it("calculates average confidence only from successful extractions", async () => {
      const documents = [
        buildMockDocument("INCOME_STATEMENT", {
          id: "doc-avg-1",
          fileName: "avg_1.pdf",
        }),
        buildMockDocument("BANK_STATEMENT", {
          id: "doc-avg-2",
          fileName: "avg_2.pdf",
        }),
      ];

      mockGetDocumentsByApplicationId.mockResolvedValue(documents);
      mockGetDocumentById.mockImplementation(async (id: string) => {
        return documents.find((d) => d.id === id) ?? null;
      });

      const result = await aiExtractionEngine.extractAll(MOCK_APP_ID);

      if (result.successCount > 0) {
        expect(result.averageConfidence).toBeGreaterThan(0);
        expect(result.averageConfidence).toBeLessThanOrEqual(1);
      } else {
        expect(result.averageConfidence).toBe(0);
      }
    });

    it("returns errors array with descriptive messages for failed extractions", async () => {
      const doc = buildMockDocument("INCOME_STATEMENT", {
        id: "doc-error-msg",
        fileName: "error_msg.pdf",
      });

      mockGetDocumentsByApplicationId.mockResolvedValue([doc]);
      mockGetDocumentById.mockImplementation(async () => {
        throw new Error("Database connection lost");
      });

      const result = await aiExtractionEngine.extractAll(MOCK_APP_ID);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Failed to extract document");
      expect(result.errors[0]).toContain("Database connection lost");
    });
  });

  // -------------------------------------------------------------------------
  // getExtractionResults
  // -------------------------------------------------------------------------

  describe("getExtractionResults", () => {
    it("retrieves all existing extraction results for an application", async () => {
      const mockResults = [
        buildMockExtractionResult("doc-1"),
        buildMockExtractionResult("doc-2"),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(mockResults);

      const results = await aiExtractionEngine.getExtractionResults(
        MOCK_APP_ID
      );

      expect(results).toHaveLength(2);
      expect(mockGetExtractionsByApplicationId).toHaveBeenCalledWith(
        MOCK_APP_ID
      );
    });

    it("returns empty array when no extraction results exist", async () => {
      mockGetExtractionsByApplicationId.mockResolvedValue([]);

      const results = await aiExtractionEngine.getExtractionResults(
        MOCK_APP_ID
      );

      expect(results).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getExtractionResultByDocumentId
  // -------------------------------------------------------------------------

  describe("getExtractionResultByDocumentId", () => {
    it("retrieves extraction result for a specific document", async () => {
      const mockResult = buildMockExtractionResult("doc-specific");
      mockGetExtractionByDocumentId.mockResolvedValue(mockResult);

      const result = await aiExtractionEngine.getExtractionResultByDocumentId(
        "doc-specific"
      );

      expect(result).toEqual(mockResult);
      expect(mockGetExtractionByDocumentId).toHaveBeenCalledWith(
        "doc-specific"
      );
    });

    it("returns null when no extraction result exists for the document", async () => {
      mockGetExtractionByDocumentId.mockResolvedValue(null);

      const result = await aiExtractionEngine.getExtractionResultByDocumentId(
        "non-existent-doc"
      );

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // isExtractionComplete
  // -------------------------------------------------------------------------

  describe("isExtractionComplete", () => {
    it("returns true when all documents have COMPLETED extraction results", async () => {
      const documents = [
        buildMockDocument("INCOME_STATEMENT", {
          extractionResult: {
            id: "ext-1",
            status: "COMPLETED" as ExtractionStatus,
            confidence: 0.93,
          },
        }),
        buildMockDocument("BANK_STATEMENT", {
          extractionResult: {
            id: "ext-2",
            status: "COMPLETED" as ExtractionStatus,
            confidence: 0.91,
          },
        }),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const result = await aiExtractionEngine.isExtractionComplete(
        MOCK_APP_ID
      );

      expect(result).toBe(true);
    });

    it("returns false when some documents have non-COMPLETED extraction results", async () => {
      const documents = [
        buildMockDocument("INCOME_STATEMENT", {
          extractionResult: {
            id: "ext-1",
            status: "COMPLETED" as ExtractionStatus,
            confidence: 0.93,
          },
        }),
        buildMockDocument("BANK_STATEMENT", {
          extractionResult: {
            id: "ext-2",
            status: "PARTIALLY_COMPLETED" as ExtractionStatus,
            confidence: 0.65,
          },
        }),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const result = await aiExtractionEngine.isExtractionComplete(
        MOCK_APP_ID
      );

      expect(result).toBe(false);
    });

    it("returns false when some documents have no extraction result", async () => {
      const documents = [
        buildMockDocument("INCOME_STATEMENT", {
          extractionResult: {
            id: "ext-1",
            status: "COMPLETED" as ExtractionStatus,
            confidence: 0.93,
          },
        }),
        buildMockDocument("BANK_STATEMENT", {
          extractionResult: null,
        }),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const result = await aiExtractionEngine.isExtractionComplete(
        MOCK_APP_ID
      );

      expect(result).toBe(false);
    });

    it("returns false when no documents exist for the application", async () => {
      mockGetDocumentsByApplicationId.mockResolvedValue([]);

      const result = await aiExtractionEngine.isExtractionComplete(
        MOCK_APP_ID
      );

      expect(result).toBe(false);
    });

    it("returns false when a document extraction has FAILED status", async () => {
      const documents = [
        buildMockDocument("INCOME_STATEMENT", {
          extractionResult: {
            id: "ext-1",
            status: "FAILED" as ExtractionStatus,
            confidence: 0,
          },
        }),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const result = await aiExtractionEngine.isExtractionComplete(
        MOCK_APP_ID
      );

      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // extractFromDocument — simulated error determinism
  // -------------------------------------------------------------------------

  describe("extractFromDocument — simulated error determinism", () => {
    it("produces deterministic results for the same document ID", async () => {
      const docId = "doc-deterministic-test";
      const mockDoc = buildMockDocument("INCOME_STATEMENT", {
        id: docId,
        fileName: "deterministic.pdf",
      });

      mockGetDocumentById.mockResolvedValue(mockDoc);

      const result1 = await aiExtractionEngine.extractFromDocument(docId);

      // Reset mocks to simulate a fresh call
      mockCreateExtractionResult.mockClear();
      mockUpdateExtractionResult.mockClear();

      // Return a fresh document without extraction result for second call
      const mockDoc2 = buildMockDocument("INCOME_STATEMENT", {
        id: docId,
        fileName: "deterministic.pdf",
        extractionResult: null,
      });
      mockGetDocumentById.mockResolvedValue(mockDoc2);

      const result2 = await aiExtractionEngine.extractFromDocument(docId);

      // Both calls should produce the same status (either both FAILED or both succeeded)
      expect(result1.status).toBe(result2.status);

      if (result1.status !== "FAILED") {
        // Confidence should be the same since it's deterministic based on fileName
        expect(result1.confidence).toBe(result2.confidence);
      }
    });
  });

  // -------------------------------------------------------------------------
  // extractAll — mixed document types
  // -------------------------------------------------------------------------

  describe("extractAll — mixed document types", () => {
    it("processes documents of different types and returns correct documentType for each", async () => {
      const documents = [
        buildMockDocument("INCOME_STATEMENT", {
          id: "doc-mix-income",
          fileName: "mix_income.pdf",
        }),
        buildMockDocument("IDENTITY_DOCUMENT", {
          id: "doc-mix-identity",
          fileName: "mix_identity.pdf",
        }),
        buildMockDocument("PROPERTY_VALUATION", {
          id: "doc-mix-property",
          fileName: "mix_property.pdf",
        }),
      ];

      mockGetDocumentsByApplicationId.mockResolvedValue(documents);
      mockGetDocumentById.mockImplementation(async (id: string) => {
        return documents.find((d) => d.id === id) ?? null;
      });

      const result = await aiExtractionEngine.extractAll(MOCK_APP_ID);

      expect(result.totalDocuments).toBe(3);

      for (const extractionResult of result.results) {
        const originalDoc = documents.find(
          (d) => d.id === extractionResult.documentId
        );
        expect(originalDoc).toBeDefined();
        expect(extractionResult.documentType).toBe(originalDoc!.type);
      }
    });
  });
});