import validationService from "@/lib/services/validation-service";
import type { DocumentType, DiscrepancySeverity, ExtractionStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetApplicationById = jest.fn();
const mockGetDocumentsByApplicationId = jest.fn();
const mockGetDocumentCountByType = jest.fn();
const mockGetExtractionsByApplicationId = jest.fn();
const mockCreateDiscrepancy = jest.fn();
const mockBulkCreateDiscrepancies = jest.fn();
const mockGetDiscrepanciesByApplicationId = jest.fn();
const mockGetUnresolvedDiscrepancies = jest.fn();
const mockGetDiscrepancyCountBySeverity = jest.fn();

jest.mock("@/lib/repositories/application-repository", () => ({
  getApplicationById: (...args: unknown[]) => mockGetApplicationById(...args),
  getApplicationWithRelations: jest.fn(),
  updateApplicantDetails: jest.fn(),
}));

jest.mock("@/lib/repositories/document-repository", () => ({
  getDocumentsByApplicationId: (...args: unknown[]) =>
    mockGetDocumentsByApplicationId(...args),
  getDocumentCountByType: (...args: unknown[]) =>
    mockGetDocumentCountByType(...args),
}));

jest.mock("@/lib/repositories/extraction-repository", () => ({
  getExtractionsByApplicationId: (...args: unknown[]) =>
    mockGetExtractionsByApplicationId(...args),
}));

jest.mock("@/lib/repositories/discrepancy-repository", () => ({
  createDiscrepancy: (...args: unknown[]) => mockCreateDiscrepancy(...args),
  bulkCreateDiscrepancies: (...args: unknown[]) =>
    mockBulkCreateDiscrepancies(...args),
  getDiscrepanciesByApplicationId: (...args: unknown[]) =>
    mockGetDiscrepanciesByApplicationId(...args),
  getUnresolvedDiscrepancies: (...args: unknown[]) =>
    mockGetUnresolvedDiscrepancies(...args),
  getDiscrepancyCountBySeverity: (...args: unknown[]) =>
    mockGetDiscrepancyCountBySeverity(...args),
}));

const mockUpdateStatus = jest.fn();
const mockIsTransitionAllowed = jest.fn();

jest.mock("@/lib/services/status-service", () => ({
  __esModule: true,
  default: {
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    isTransitionAllowed: (...args: unknown[]) => mockIsTransitionAllowed(...args),
  },
}));

const mockLogAction = jest.fn();

jest.mock("@/lib/services/audit-service", () => ({
  __esModule: true,
  default: {
    logAction: (...args: unknown[]) => mockLogAction(...args),
  },
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
const MOCK_IP = "192.168.1.100";

function buildMockApplication(overrides?: Record<string, unknown>) {
  return {
    id: MOCK_APP_ID,
    applicationId: "DBS-1234",
    applicantName: "Test User",
    loanType: "Personal Loan",
    loanAmount: 50000,
    status: "EXTRACTION_COMPLETE" as const,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

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

function buildMockExtraction(
  documentType: DocumentType,
  extractedData: Record<string, unknown>,
  overrides?: Record<string, unknown>
) {
  return {
    id: `ext-${documentType.toLowerCase()}`,
    documentId: `doc-${documentType.toLowerCase()}`,
    extractedData,
    confidence: 0.93,
    status: "COMPLETED" as ExtractionStatus,
    errors: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    document: {
      id: `doc-${documentType.toLowerCase()}`,
      applicationId: MOCK_APP_ID,
      type: documentType,
      fileName: `${documentType.toLowerCase()}.pdf`,
      fileSize: 100000,
      storageUrl: `/uploads/DBS-1234/${documentType.toLowerCase()}.pdf`,
      uploadedBy: MOCK_USER_ID,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ValidationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogAction.mockResolvedValue({ id: "audit-1" });
    mockIsTransitionAllowed.mockReturnValue(true);
    mockUpdateStatus.mockResolvedValue({
      success: true,
      currentStatus: "VALIDATION_COMPLETE",
      previousStatus: "EXTRACTION_COMPLETE",
      statusEntry: { id: "status-1" },
    });
  });

  // -------------------------------------------------------------------------
  // checkCompleteness
  // -------------------------------------------------------------------------

  describe("checkCompleteness", () => {
    it("returns isComplete true when all required documents are uploaded", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const documents = [
        buildMockDocument("INCOME_STATEMENT"),
        buildMockDocument("BANK_STATEMENT"),
        buildMockDocument("TAX_RETURN"),
        buildMockDocument("IDENTITY_DOCUMENT"),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);

      const result = await validationService.checkCompleteness({
        applicationId: MOCK_APP_ID,
        checkedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isComplete).toBe(true);
      expect(result.missingDocuments).toHaveLength(0);
      expect(result.completenessPercentage).toBe(100);
      expect(result.totalDocuments).toBe(4);
    });

    it("identifies missing required documents", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      // Only upload INCOME_STATEMENT — missing BANK_STATEMENT, TAX_RETURN, IDENTITY_DOCUMENT
      const documents = [buildMockDocument("INCOME_STATEMENT")];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const result = await validationService.checkCompleteness({
        applicationId: MOCK_APP_ID,
        checkedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isComplete).toBe(false);
      expect(result.missingDocuments).toContain("BANK_STATEMENT");
      expect(result.missingDocuments).toContain("TAX_RETURN");
      expect(result.missingDocuments).toContain("IDENTITY_DOCUMENT");
      expect(result.missingDocuments).toHaveLength(3);
      expect(result.completenessPercentage).toBe(25);
    });

    it("returns completenessPercentage of 0 when no documents are uploaded", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetDocumentsByApplicationId.mockResolvedValue([]);

      const result = await validationService.checkCompleteness({
        applicationId: MOCK_APP_ID,
        checkedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isComplete).toBe(false);
      expect(result.totalDocuments).toBe(0);
      expect(result.completenessPercentage).toBe(0);
      expect(result.missingDocuments.length).toBeGreaterThan(0);
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        validationService.checkCompleteness({
          applicationId: "non-existent-id",
          checkedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Application not found: non-existent-id");
    });

    it("logs the completeness check via AuditService", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const documents = [
        buildMockDocument("INCOME_STATEMENT"),
        buildMockDocument("BANK_STATEMENT"),
        buildMockDocument("TAX_RETURN"),
        buildMockDocument("IDENTITY_DOCUMENT"),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);

      await validationService.checkCompleteness({
        applicationId: MOCK_APP_ID,
        checkedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          applicationId: MOCK_APP_ID,
          action: "COMPLETENESS_CHECK",
          entityType: "Application",
          entityId: MOCK_APP_ID,
          ipAddress: MOCK_IP,
          outcome: "SUCCESS",
        })
      );
    });

    it("logs INCOMPLETE outcome when documents are missing", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetDocumentsByApplicationId.mockResolvedValue([]);

      await validationService.checkCompleteness({
        applicationId: MOCK_APP_ID,
        checkedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: "INCOMPLETE",
        })
      );
    });

    it("does not log when checkedBy is not provided", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetDocumentsByApplicationId.mockResolvedValue([]);

      await validationService.checkCompleteness({
        applicationId: MOCK_APP_ID,
      });

      expect(mockLogAction).not.toHaveBeenCalled();
    });

    it("includes optional documents in totalDocuments count", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const documents = [
        buildMockDocument("INCOME_STATEMENT"),
        buildMockDocument("BANK_STATEMENT"),
        buildMockDocument("TAX_RETURN"),
        buildMockDocument("IDENTITY_DOCUMENT"),
        buildMockDocument("PROPERTY_VALUATION"),
        buildMockDocument("EMPLOYMENT_LETTER"),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);

      const result = await validationService.checkCompleteness({
        applicationId: MOCK_APP_ID,
        checkedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isComplete).toBe(true);
      expect(result.totalDocuments).toBe(6);
      expect(result.completenessPercentage).toBe(100);
    });

    it("still succeeds if audit log fails", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetDocumentsByApplicationId.mockResolvedValue([]);
      mockLogAction.mockRejectedValue(new Error("Audit log failed"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await validationService.checkCompleteness({
        applicationId: MOCK_APP_ID,
        checkedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isComplete).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // crossValidate
  // -------------------------------------------------------------------------

  describe("crossValidate", () => {
    it("returns isConsistent true when all cross-validation checks pass", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Test User",
          totalIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("IDENTITY_DOCUMENT", {
          fullName: "Test User",
          nricNumber: "SXXXX567A",
          dateOfBirth: "1990-05-20",
          nationality: "Singaporean",
        }),
        buildMockExtraction("BANK_STATEMENT", {
          accountHolder: "Test User",
          bankName: "DBS Bank",
          averageMonthlyBalance: 15000,
          totalDeposits: 18000,
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);
      mockBulkCreateDiscrepancies.mockResolvedValue([]);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isConsistent).toBe(true);
      expect(result.failedChecks).toBe(0);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.totalChecks).toBeGreaterThan(0);
    });

    it("detects name mismatches between documents", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "John Smith",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("IDENTITY_DOCUMENT", {
          fullName: "Jane Smith",
          nricNumber: "SXXXX567A",
          dateOfBirth: "1990-05-20",
          nationality: "Singaporean",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const mockCreatedDiscrepancies = [
        {
          id: "disc-1",
          applicationId: MOCK_APP_ID,
          field: "applicantName",
          sourceDocument: "Income Statement",
          targetDocument: "Identity Document",
          sourceValue: "John Smith",
          targetValue: "Jane Smith",
          severity: "HIGH" as DiscrepancySeverity,
          resolved: false,
        },
      ];
      mockBulkCreateDiscrepancies.mockResolvedValue(mockCreatedDiscrepancies);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isConsistent).toBe(false);
      expect(result.failedChecks).toBeGreaterThan(0);
      expect(result.discrepancies.length).toBeGreaterThan(0);

      const nameDiscrepancy = result.discrepancies.find(
        (d) => d.field === "applicantName"
      );
      expect(nameDiscrepancy).toBeDefined();
      expect(nameDiscrepancy?.sourceValue).toBe("John Smith");
      expect(nameDiscrepancy?.targetValue).toBe("Jane Smith");
    });

    it("detects income inconsistencies beyond tolerance threshold", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      // Income statement says 72000, tax return says 60000 — variance > 5%
      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Test User",
          totalIncome: 60000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const mockCreatedDiscrepancies = [
        {
          id: "disc-income-1",
          applicationId: MOCK_APP_ID,
          field: "annualIncome",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "72000",
          targetValue: "60000",
          severity: "HIGH" as DiscrepancySeverity,
          resolved: false,
        },
      ];
      mockBulkCreateDiscrepancies.mockResolvedValue(mockCreatedDiscrepancies);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isConsistent).toBe(false);

      const incomeDiscrepancy = result.discrepancies.find(
        (d) => d.field === "annualIncome"
      );
      expect(incomeDiscrepancy).toBeDefined();
      expect(incomeDiscrepancy?.sourceValue).toBe("72000");
      expect(incomeDiscrepancy?.targetValue).toBe("60000");
    });

    it("passes income check when variance is within tolerance", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      // Income statement says 72000, tax return says 71000 — variance ~1.4%, within 5%
      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Test User",
          totalIncome: 71000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);
      mockBulkCreateDiscrepancies.mockResolvedValue([]);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      const incomeDiscrepancy = result.discrepancies.find(
        (d) => d.field === "annualIncome"
      );
      expect(incomeDiscrepancy).toBeUndefined();
    });

    it("handles edge case with no documents / no extractions", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isConsistent).toBe(true);
      expect(result.totalChecks).toBe(0);
      expect(result.passedChecks).toBe(0);
      expect(result.failedChecks).toBe(0);
      expect(result.discrepancies).toHaveLength(0);
    });

    it("handles partial extractions (only some documents extracted)", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      // Only one document type extracted — no cross-validation possible
      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      // With only one document type, no cross-validation rules can fire
      expect(result.isConsistent).toBe(true);
      expect(result.totalChecks).toBe(0);
      expect(result.discrepancies).toHaveLength(0);
    });

    it("skips extractions that are not COMPLETED or PARTIALLY_COMPLETED", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction(
          "TAX_RETURN",
          {},
          {
            status: "FAILED" as ExtractionStatus,
            confidence: 0,
          }
        ),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      // TAX_RETURN is FAILED, so no cross-validation rules can fire against it
      expect(result.totalChecks).toBe(0);
      expect(result.isConsistent).toBe(true);
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        validationService.crossValidate({
          applicationId: "non-existent-id",
          validatedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Application not found: non-existent-id");
    });

    it("updates application status to VALIDATION_IN_PROGRESS and then VALIDATION_COMPLETE", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);

      await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockIsTransitionAllowed).toHaveBeenCalledWith(
        "EXTRACTION_COMPLETE",
        "VALIDATION_IN_PROGRESS"
      );

      // Should have called updateStatus at least for VALIDATION_IN_PROGRESS
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          newStatus: "VALIDATION_IN_PROGRESS",
          changedBy: MOCK_USER_ID,
        })
      );
    });

    it("logs the cross-validation action via AuditService", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);

      await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          applicationId: MOCK_APP_ID,
          action: "VALIDATION_COMPLETED",
          entityType: "Application",
          entityId: MOCK_APP_ID,
          ipAddress: MOCK_IP,
        })
      );
    });

    it("logs DISCREPANCIES_FOUND outcome when discrepancies exist", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "John Smith",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("IDENTITY_DOCUMENT", {
          fullName: "Jane Smith",
          nricNumber: "SXXXX567A",
          dateOfBirth: "1990-05-20",
          nationality: "Singaporean",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const mockCreatedDiscrepancies = [
        {
          id: "disc-1",
          applicationId: MOCK_APP_ID,
          field: "applicantName",
          sourceDocument: "Income Statement",
          targetDocument: "Identity Document",
          sourceValue: "John Smith",
          targetValue: "Jane Smith",
          severity: "HIGH" as DiscrepancySeverity,
          resolved: false,
        },
      ];
      mockBulkCreateDiscrepancies.mockResolvedValue(mockCreatedDiscrepancies);

      await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: "DISCREPANCIES_FOUND",
        })
      );
    });

    it("persists discrepancies via bulkCreateDiscrepancies", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "John Smith",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("IDENTITY_DOCUMENT", {
          fullName: "Jane Smith",
          nricNumber: "SXXXX567A",
          dateOfBirth: "1990-05-20",
          nationality: "Singaporean",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const mockCreatedDiscrepancies = [
        {
          id: "disc-1",
          applicationId: MOCK_APP_ID,
          field: "applicantName",
          sourceDocument: "Income Statement",
          targetDocument: "Identity Document",
          sourceValue: "John Smith",
          targetValue: "Jane Smith",
          severity: "HIGH" as DiscrepancySeverity,
          resolved: false,
        },
      ];
      mockBulkCreateDiscrepancies.mockResolvedValue(mockCreatedDiscrepancies);

      await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockBulkCreateDiscrepancies).toHaveBeenCalledTimes(1);
      expect(mockBulkCreateDiscrepancies).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            applicationId: MOCK_APP_ID,
            field: "applicantName",
            resolved: false,
          }),
        ])
      );
    });

    it("does not call bulkCreateDiscrepancies when no discrepancies found", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Test User",
          totalIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockBulkCreateDiscrepancies).not.toHaveBeenCalled();
    });

    it("handles employer name comparison using contains logic", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      // "Tech Solutions" contains within "Tech Solutions Pte Ltd" — should pass
      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "Tech Solutions",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Test User",
          totalIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);
      mockBulkCreateDiscrepancies.mockResolvedValue([]);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      const employerDiscrepancy = result.discrepancies.find(
        (d) => d.field === "employer"
      );
      expect(employerDiscrepancy).toBeUndefined();
    });

    it("detects employer name mismatch when names are completely different", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "Alpha Corp",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Test User",
          totalIncome: 72000,
          employer: "Beta Industries",
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const mockCreatedDiscrepancies = [
        {
          id: "disc-emp-1",
          applicationId: MOCK_APP_ID,
          field: "employer",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "Alpha Corp",
          targetValue: "Beta Industries",
          severity: "LOW" as DiscrepancySeverity,
          resolved: false,
        },
      ];
      mockBulkCreateDiscrepancies.mockResolvedValue(mockCreatedDiscrepancies);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      const employerDiscrepancy = result.discrepancies.find(
        (d) => d.field === "employer"
      );
      expect(employerDiscrepancy).toBeDefined();
    });

    it("still succeeds if status update fails during cross-validation", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);
      mockUpdateStatus.mockRejectedValue(new Error("Status update failed"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isConsistent).toBe(true);

      consoleSpy.mockRestore();
    });

    it("still succeeds if audit log fails during cross-validation", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);
      mockLogAction.mockRejectedValue(new Error("Audit log failed"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isConsistent).toBe(true);

      consoleSpy.mockRestore();
    });

    it("skips cross-validation rules when source or target value is empty", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Test User",
          totalIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);
      mockBulkCreateDiscrepancies.mockResolvedValue([]);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      // Employer check should be skipped because source employer is empty
      const employerDiscrepancy = result.discrepancies.find(
        (d) => d.field === "employer"
      );
      expect(employerDiscrepancy).toBeUndefined();
    });

    it("handles multiple discrepancies across different fields", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "John Smith",
          annualIncome: 100000,
          employer: "Alpha Corp",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Jane Doe",
          totalIncome: 60000,
          employer: "Beta Industries",
          currency: "SGD",
        }),
        buildMockExtraction("IDENTITY_DOCUMENT", {
          fullName: "John Smith Jr",
          nricNumber: "SXXXX567A",
          dateOfBirth: "1990-05-20",
          nationality: "Singaporean",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const mockCreatedDiscrepancies = [
        {
          id: "disc-1",
          applicationId: MOCK_APP_ID,
          field: "applicantName",
          sourceDocument: "Income Statement",
          targetDocument: "Identity Document",
          sourceValue: "John Smith",
          targetValue: "John Smith Jr",
          severity: "HIGH" as DiscrepancySeverity,
          resolved: false,
        },
        {
          id: "disc-2",
          applicationId: MOCK_APP_ID,
          field: "applicantName",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "John Smith",
          targetValue: "Jane Doe",
          severity: "HIGH" as DiscrepancySeverity,
          resolved: false,
        },
        {
          id: "disc-3",
          applicationId: MOCK_APP_ID,
          field: "annualIncome",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "100000",
          targetValue: "60000",
          severity: "CRITICAL" as DiscrepancySeverity,
          resolved: false,
        },
        {
          id: "disc-4",
          applicationId: MOCK_APP_ID,
          field: "employer",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "Alpha Corp",
          targetValue: "Beta Industries",
          severity: "LOW" as DiscrepancySeverity,
          resolved: false,
        },
      ];
      mockBulkCreateDiscrepancies.mockResolvedValue(mockCreatedDiscrepancies);

      const result = await validationService.crossValidate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isConsistent).toBe(false);
      expect(result.failedChecks).toBeGreaterThanOrEqual(3);
      expect(result.discrepancies.length).toBeGreaterThanOrEqual(3);
    });
  });

  // -------------------------------------------------------------------------
  // validate (full validation)
  // -------------------------------------------------------------------------

  describe("validate", () => {
    it("returns isValid true when completeness and cross-validation both pass", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const documents = [
        buildMockDocument("INCOME_STATEMENT"),
        buildMockDocument("BANK_STATEMENT"),
        buildMockDocument("TAX_RETURN"),
        buildMockDocument("IDENTITY_DOCUMENT"),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", {
          applicantName: "Test User",
          annualIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Test User",
          totalIncome: 72000,
          employer: "Tech Solutions Pte Ltd",
          currency: "SGD",
        }),
        buildMockExtraction("IDENTITY_DOCUMENT", {
          fullName: "Test User",
          nricNumber: "SXXXX567A",
          dateOfBirth: "1990-05-20",
          nationality: "Singaporean",
        }),
        buildMockExtraction("BANK_STATEMENT", {
          accountHolder: "Test User",
          bankName: "DBS Bank",
          averageMonthlyBalance: 15000,
          totalDeposits: 18000,
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);
      mockBulkCreateDiscrepancies.mockResolvedValue([]);

      const result = await validationService.validate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isValid).toBe(true);
      expect(result.completeness.isComplete).toBe(true);
      expect(result.crossValidation.isConsistent).toBe(true);
    });

    it("returns isValid false when documents are missing", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetDocumentsByApplicationId.mockResolvedValue([]);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);

      const result = await validationService.validate({
        applicationId: MOCK_APP_ID,
        validatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.isValid).toBe(false);
      expect(result.completeness.isComplete).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getDiscrepancies
  // -------------------------------------------------------------------------

  describe("getDiscrepancies", () => {
    it("returns all discrepancies for an application", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockDiscrepancies = [
        {
          id: "disc-1",
          applicationId: MOCK_APP_ID,
          field: "annualIncome",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "72000",
          targetValue: "68000",
          severity: "MEDIUM" as DiscrepancySeverity,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockGetDiscrepanciesByApplicationId.mockResolvedValue(mockDiscrepancies);

      const result = await validationService.getDiscrepancies(MOCK_APP_ID);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("annualIncome");
      expect(result[0].resolved).toBe(false);
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        validationService.getDiscrepancies("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });
  });

  // -------------------------------------------------------------------------
  // getUnresolvedDiscrepancies
  // -------------------------------------------------------------------------

  describe("getUnresolvedDiscrepancies", () => {
    it("returns only unresolved discrepancies", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockDiscrepancies = [
        {
          id: "disc-1",
          applicationId: MOCK_APP_ID,
          field: "annualIncome",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "72000",
          targetValue: "68000",
          severity: "MEDIUM" as DiscrepancySeverity,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockGetUnresolvedDiscrepancies.mockResolvedValue(mockDiscrepancies);

      const result = await validationService.getUnresolvedDiscrepancies(MOCK_APP_ID);

      expect(result).toHaveLength(1);
      expect(result[0].resolved).toBe(false);
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        validationService.getUnresolvedDiscrepancies("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });
  });

  // -------------------------------------------------------------------------
  // evaluateDiscrepancyThresholds
  // -------------------------------------------------------------------------

  describe("evaluateDiscrepancyThresholds", () => {
    it("returns APPROVE when no unresolved discrepancies exist", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const result = await validationService.evaluateDiscrepancyThresholds(MOCK_APP_ID);

      expect(result).toBe("APPROVE");
    });

    it("returns REJECT when critical discrepancies exceed threshold", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 1,
      });

      const result = await validationService.evaluateDiscrepancyThresholds(MOCK_APP_ID);

      expect(result).toBe("REJECT");
    });

    it("returns REFER_TO_ANALYST when high discrepancies exceed threshold", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 3,
        CRITICAL: 0,
      });

      const result = await validationService.evaluateDiscrepancyThresholds(MOCK_APP_ID);

      expect(result).toBe("REFER_TO_ANALYST");
    });

    it("returns REFER_TO_ANALYST when medium discrepancies exist", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 2,
        MEDIUM: 1,
        HIGH: 0,
        CRITICAL: 0,
      });

      const result = await validationService.evaluateDiscrepancyThresholds(MOCK_APP_ID);

      expect(result).toBe("REFER_TO_ANALYST");
    });
  });

  // -------------------------------------------------------------------------
  // isExtractionSufficient
  // -------------------------------------------------------------------------

  describe("isExtractionSufficient", () => {
    it("returns true when all documents have completed extractions above threshold", async () => {
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

      const result = await validationService.isExtractionSufficient(MOCK_APP_ID);

      expect(result).toBe(true);
    });

    it("returns false when no documents exist", async () => {
      mockGetDocumentsByApplicationId.mockResolvedValue([]);

      const result = await validationService.isExtractionSufficient(MOCK_APP_ID);

      expect(result).toBe(false);
    });

    it("returns false when a document has no extraction result", async () => {
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

      const result = await validationService.isExtractionSufficient(MOCK_APP_ID);

      expect(result).toBe(false);
    });

    it("returns false when a document has confidence below threshold", async () => {
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
            confidence: 0.5,
          },
        }),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const result = await validationService.isExtractionSufficient(MOCK_APP_ID);

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

      const result = await validationService.isExtractionSufficient(MOCK_APP_ID);

      expect(result).toBe(false);
    });
  });
});