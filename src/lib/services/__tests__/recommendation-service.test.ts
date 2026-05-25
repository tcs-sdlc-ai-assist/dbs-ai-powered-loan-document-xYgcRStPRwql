import recommendationEngine from "@/lib/services/recommendation-service";
import type {
  ApplicationStatusEnum,
  DocumentType,
  DiscrepancySeverity,
  ExtractionStatus,
  RecommendationType,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetApplicationById = jest.fn();
const mockGetApplicationWithRelations = jest.fn();

jest.mock("@/lib/repositories/application-repository", () => ({
  getApplicationById: (...args: unknown[]) => mockGetApplicationById(...args),
  getApplicationWithRelations: (...args: unknown[]) =>
    mockGetApplicationWithRelations(...args),
  updateApplicantDetails: jest.fn(),
}));

const mockGetDocumentsByApplicationId = jest.fn();
const mockGetDocumentCountByType = jest.fn();

jest.mock("@/lib/repositories/document-repository", () => ({
  getDocumentsByApplicationId: (...args: unknown[]) =>
    mockGetDocumentsByApplicationId(...args),
  getDocumentCountByType: (...args: unknown[]) =>
    mockGetDocumentCountByType(...args),
}));

const mockGetExtractionsByApplicationId = jest.fn();

jest.mock("@/lib/repositories/extraction-repository", () => ({
  getExtractionsByApplicationId: (...args: unknown[]) =>
    mockGetExtractionsByApplicationId(...args),
}));

const mockGetDiscrepanciesByApplicationId = jest.fn();
const mockGetUnresolvedDiscrepancies = jest.fn();
const mockGetDiscrepancyCountBySeverity = jest.fn();

jest.mock("@/lib/repositories/discrepancy-repository", () => ({
  getDiscrepanciesByApplicationId: (...args: unknown[]) =>
    mockGetDiscrepanciesByApplicationId(...args),
  getUnresolvedDiscrepancies: (...args: unknown[]) =>
    mockGetUnresolvedDiscrepancies(...args),
  getDiscrepancyCountBySeverity: (...args: unknown[]) =>
    mockGetDiscrepancyCountBySeverity(...args),
}));

const mockCreateRecommendation = jest.fn();
const mockGetRecommendationsByApplicationId = jest.fn();
const mockGetLatestRecommendation = jest.fn();
const mockGetRecommendationById = jest.fn();
const mockListRecommendations = jest.fn();
const mockGetRecommendationCountByType = jest.fn();

jest.mock("@/lib/repositories/recommendation-repository", () => ({
  createRecommendation: (...args: unknown[]) =>
    mockCreateRecommendation(...args),
  getRecommendationsByApplicationId: (...args: unknown[]) =>
    mockGetRecommendationsByApplicationId(...args),
  getLatestRecommendation: (...args: unknown[]) =>
    mockGetLatestRecommendation(...args),
  getRecommendationById: (...args: unknown[]) =>
    mockGetRecommendationById(...args),
  listRecommendations: (...args: unknown[]) =>
    mockListRecommendations(...args),
  getRecommendationCountByType: (...args: unknown[]) =>
    mockGetRecommendationCountByType(...args),
}));

const mockUpdateStatus = jest.fn();
const mockIsTransitionAllowed = jest.fn();

jest.mock("@/lib/services/status-service", () => ({
  __esModule: true,
  default: {
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    isTransitionAllowed: (...args: unknown[]) =>
      mockIsTransitionAllowed(...args),
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
    status: "VALIDATION_COMPLETE" as ApplicationStatusEnum,
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

function buildMockRecommendation(overrides?: Record<string, unknown>) {
  return {
    id: "rec-1",
    applicationId: MOCK_APP_ID,
    recommendation: "APPROVE" as RecommendationType,
    rationale: "All checks passed.",
    confidence: 0.93,
    createdBy: MOCK_USER_ID,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    user: {
      id: MOCK_USER_ID,
      name: "Test User",
      email: "test@dbs.com",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecommendationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogAction.mockResolvedValue({ id: "audit-1" });
    mockIsTransitionAllowed.mockReturnValue(true);
    mockUpdateStatus.mockResolvedValue({
      success: true,
      currentStatus: "RECOMMENDATION_GENERATED",
      previousStatus: "VALIDATION_COMPLETE",
      statusEntry: { id: "status-1" },
    });
  });

  // -------------------------------------------------------------------------
  // generate — APPROVE (all clear)
  // -------------------------------------------------------------------------

  describe("generate — APPROVE when all clear", () => {
    it("produces APPROVE recommendation when all documents present, extractions complete, and no discrepancies", async () => {
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
        buildMockExtraction("BANK_STATEMENT", {
          accountHolder: "Test User",
          bankName: "DBS Bank",
          averageMonthlyBalance: 15000,
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
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "APPROVE",
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.recommendation).toBeDefined();
      expect(result.details.recommendation).toBe("APPROVE");
      expect(result.details.completenessScore).toBe(100);
      expect(result.details.averageExtractionConfidence).toBeGreaterThan(0);
      expect(result.details.discrepancySummary.unresolved).toBe(0);
    });

    it("includes relevant details in the rationale for APPROVE", async () => {
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
          currency: "SGD",
        }),
        buildMockExtraction("BANK_STATEMENT", {
          accountHolder: "Test User",
          currency: "SGD",
        }),
        buildMockExtraction("TAX_RETURN", {
          taxpayerName: "Test User",
          totalIncome: 72000,
          currency: "SGD",
        }),
        buildMockExtraction("IDENTITY_DOCUMENT", {
          fullName: "Test User",
          nricNumber: "SXXXX567A",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "APPROVE",
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      // Verify the rationale passed to createRecommendation contains relevant info
      expect(mockCreateRecommendation).toHaveBeenCalledTimes(1);
      const createCall = mockCreateRecommendation.mock.calls[0][0];
      expect(createCall.rationale).toContain("100%");
      expect(createCall.rationale.toLowerCase()).toContain("approve");
    });

    it("persists the recommendation via createRecommendation", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({ recommendation: "APPROVE" });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockCreateRecommendation).toHaveBeenCalledTimes(1);
      expect(mockCreateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          recommendation: "APPROVE",
          createdBy: MOCK_USER_ID,
        })
      );
    });

    it("updates application status to RECOMMENDATION_GENERATED", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({ recommendation: "APPROVE" });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          newStatus: "RECOMMENDATION_GENERATED",
          changedBy: MOCK_USER_ID,
        })
      );
    });

    it("logs the recommendation generation via AuditService", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({ recommendation: "APPROVE" });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          applicationId: MOCK_APP_ID,
          action: "RECOMMENDATION_GENERATED",
          entityType: "Recommendation",
          entityId: savedRec.id,
          ipAddress: MOCK_IP,
          outcome: "SUCCESS",
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // generate — REFER_TO_ANALYST (discrepancies exist)
  // -------------------------------------------------------------------------

  describe("generate — REFER_TO_ANALYST when discrepancies exist", () => {
    it("produces REFER_TO_ANALYST when unresolved medium discrepancies exist", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 68000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const discrepancies = [
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
      mockGetDiscrepanciesByApplicationId.mockResolvedValue(discrepancies);
      mockGetUnresolvedDiscrepancies.mockResolvedValue(discrepancies);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 1,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REFER_TO_ANALYST",
        confidence: 0.82,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.details.recommendation).toBe("REFER_TO_ANALYST");
      expect(result.details.discrepancySummary.unresolved).toBe(1);
      expect(result.details.discrepancySummary.bySeverity.MEDIUM).toBe(1);
    });

    it("produces REFER_TO_ANALYST when high discrepancies exceed threshold", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const discrepancies = [
        {
          id: "disc-1",
          applicationId: MOCK_APP_ID,
          field: "applicantName",
          sourceDocument: "Income Statement",
          targetDocument: "Identity Document",
          sourceValue: "John Smith",
          targetValue: "John S. Smith",
          severity: "HIGH" as DiscrepancySeverity,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "disc-2",
          applicationId: MOCK_APP_ID,
          field: "applicantName",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "John Smith",
          targetValue: "John S. Smith",
          severity: "HIGH" as DiscrepancySeverity,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "disc-3",
          applicationId: MOCK_APP_ID,
          field: "applicantName",
          sourceDocument: "Income Statement",
          targetDocument: "Bank Statement",
          sourceValue: "John Smith",
          targetValue: "John S. Smith",
          severity: "HIGH" as DiscrepancySeverity,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockGetDiscrepanciesByApplicationId.mockResolvedValue(discrepancies);
      mockGetUnresolvedDiscrepancies.mockResolvedValue(discrepancies);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 3,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REFER_TO_ANALYST",
        confidence: 0.88,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.details.recommendation).toBe("REFER_TO_ANALYST");
      expect(result.details.discrepancySummary.bySeverity.HIGH).toBe(3);
    });

    it("includes discrepancy details in the rationale for REFER_TO_ANALYST", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const discrepancies = [
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
      mockGetDiscrepanciesByApplicationId.mockResolvedValue(discrepancies);
      mockGetUnresolvedDiscrepancies.mockResolvedValue(discrepancies);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 1,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REFER_TO_ANALYST",
        confidence: 0.82,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      const createCall = mockCreateRecommendation.mock.calls[0][0];
      expect(createCall.rationale).toContain("unresolved");
      expect(createCall.rationale.toLowerCase()).toContain("analyst");
    });

    it("transitions to ANALYST_REVIEW when recommendation is REFER_TO_ANALYST", async () => {
      const mockApp = buildMockApplication();
      // First call returns VALIDATION_COMPLETE, second returns RECOMMENDATION_GENERATED
      mockGetApplicationById
        .mockResolvedValueOnce(mockApp)
        .mockResolvedValueOnce(mockApp)
        .mockResolvedValueOnce({
          ...mockApp,
          status: "RECOMMENDATION_GENERATED" as ApplicationStatusEnum,
        });

      const documents = [
        buildMockDocument("INCOME_STATEMENT"),
        buildMockDocument("BANK_STATEMENT"),
        buildMockDocument("TAX_RETURN"),
        buildMockDocument("IDENTITY_DOCUMENT"),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const discrepancies = [
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
      mockGetDiscrepanciesByApplicationId.mockResolvedValue(discrepancies);
      mockGetUnresolvedDiscrepancies.mockResolvedValue(discrepancies);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 1,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REFER_TO_ANALYST",
        confidence: 0.82,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      // Should have called updateStatus for ANALYST_REVIEW
      const statusCalls = mockUpdateStatus.mock.calls;
      const analystReviewCall = statusCalls.find(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).newStatus === "ANALYST_REVIEW"
      );
      expect(analystReviewCall).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // generate — REJECT (critical discrepancies)
  // -------------------------------------------------------------------------

  describe("generate — REJECT when critical discrepancies exist", () => {
    it("produces REJECT when critical discrepancies exceed threshold", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const discrepancies = [
        {
          id: "disc-1",
          applicationId: MOCK_APP_ID,
          field: "annualIncome",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "100000",
          targetValue: "30000",
          severity: "CRITICAL" as DiscrepancySeverity,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockGetDiscrepanciesByApplicationId.mockResolvedValue(discrepancies);
      mockGetUnresolvedDiscrepancies.mockResolvedValue(discrepancies);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 1,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REJECT",
        confidence: 0.93,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.details.recommendation).toBe("REJECT");
      expect(result.details.discrepancySummary.bySeverity.CRITICAL).toBe(1);
    });

    it("includes critical discrepancy details in the rationale for REJECT", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      const discrepancies = [
        {
          id: "disc-1",
          applicationId: MOCK_APP_ID,
          field: "annualIncome",
          sourceDocument: "Income Statement",
          targetDocument: "Tax Return",
          sourceValue: "100000",
          targetValue: "30000",
          severity: "CRITICAL" as DiscrepancySeverity,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockGetDiscrepanciesByApplicationId.mockResolvedValue(discrepancies);
      mockGetUnresolvedDiscrepancies.mockResolvedValue(discrepancies);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 1,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REJECT",
        confidence: 0.93,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      const createCall = mockCreateRecommendation.mock.calls[0][0];
      expect(createCall.rationale.toLowerCase()).toContain("critical");
      expect(createCall.rationale.toLowerCase()).toContain("reject");
    });
  });

  // -------------------------------------------------------------------------
  // generate — REQUEST_MORE_INFO (documents missing)
  // -------------------------------------------------------------------------

  describe("generate — REQUEST_MORE_INFO when documents missing", () => {
    it("produces REQUEST_MORE_INFO when no documents are uploaded", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      mockGetDocumentsByApplicationId.mockResolvedValue([]);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);
      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REQUEST_MORE_INFO",
        confidence: 0.95,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.details.recommendation).toBe("REQUEST_MORE_INFO");
      expect(result.details.completenessScore).toBe(0);
      expect(result.details.extractionSummary.totalDocuments).toBe(0);
    });

    it("produces REQUEST_MORE_INFO when no extractions are completed", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const documents = [
        buildMockDocument("INCOME_STATEMENT"),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);
      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REQUEST_MORE_INFO",
        confidence: 0.95,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.details.recommendation).toBe("REQUEST_MORE_INFO");
    });

    it("produces REQUEST_MORE_INFO when many required documents are missing", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      // Only one optional document uploaded — all required are missing
      const documents = [
        buildMockDocument("PROPERTY_VALUATION"),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const extractions = [
        buildMockExtraction("PROPERTY_VALUATION", {
          propertyAddress: "123 Test St",
          valuationAmount: 500000,
          currency: "SGD",
        }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REQUEST_MORE_INFO",
        confidence: 0.90,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.details.recommendation).toBe("REQUEST_MORE_INFO");
      expect(result.details.completenessScore).toBe(0);
    });

    it("includes missing document details in the rationale for REQUEST_MORE_INFO", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      mockGetDocumentsByApplicationId.mockResolvedValue([]);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);
      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REQUEST_MORE_INFO",
        confidence: 0.95,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      const createCall = mockCreateRecommendation.mock.calls[0][0];
      expect(createCall.rationale.toLowerCase()).toContain("insufficient");
    });
  });

  // -------------------------------------------------------------------------
  // generate — REFER_TO_ANALYST (low extraction confidence)
  // -------------------------------------------------------------------------

  describe("generate — REFER_TO_ANALYST when extraction confidence is low", () => {
    it("produces REFER_TO_ANALYST when some documents have confidence below threshold", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }, { confidence: 0.93 }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }, { confidence: 0.91 }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }, { confidence: 0.65 }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }, { confidence: 0.97 }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REFER_TO_ANALYST",
        confidence: 0.80,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.details.recommendation).toBe("REFER_TO_ANALYST");
      expect(result.details.extractionSummary.belowThreshold).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // generate — error handling
  // -------------------------------------------------------------------------

  describe("generate — error handling", () => {
    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        recommendationEngine.generate({
          applicationId: "non-existent-id",
          createdBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Application not found: non-existent-id");

      expect(mockCreateRecommendation).not.toHaveBeenCalled();
    });

    it("still succeeds if status update fails", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      mockGetDocumentsByApplicationId.mockResolvedValue([]);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);
      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      mockUpdateStatus.mockRejectedValue(new Error("Status update failed"));

      const savedRec = buildMockRecommendation({
        recommendation: "REQUEST_MORE_INFO",
        confidence: 0.95,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });

    it("still succeeds if audit log fails", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      mockGetDocumentsByApplicationId.mockResolvedValue([]);
      mockGetExtractionsByApplicationId.mockResolvedValue([]);
      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      mockLogAction.mockRejectedValue(new Error("Audit log failed"));

      const savedRec = buildMockRecommendation({
        recommendation: "REQUEST_MORE_INFO",
        confidence: 0.95,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // generate — confidence score
  // -------------------------------------------------------------------------

  describe("generate — confidence score", () => {
    it("returns a confidence score between 0 and 1", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({ recommendation: "APPROVE" });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.details.confidence).toBeGreaterThanOrEqual(0);
      expect(result.details.confidence).toBeLessThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // generate — extraction summary
  // -------------------------------------------------------------------------

  describe("generate — extraction summary", () => {
    it("correctly calculates extraction summary metrics", async () => {
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
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }, { confidence: 0.93 }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }, { confidence: 0.91 }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }, { confidence: 0.90 }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }, { confidence: 0.97 }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({ recommendation: "APPROVE" });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.details.extractionSummary.totalDocuments).toBe(4);
      expect(result.details.extractionSummary.completedExtractions).toBe(4);
      expect(result.details.extractionSummary.averageConfidence).toBeGreaterThan(0.9);
      expect(result.details.extractionSummary.belowThreshold).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // get — retrieve latest recommendation
  // -------------------------------------------------------------------------

  describe("get", () => {
    it("returns the latest recommendation for an application", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockRec = buildMockRecommendation();
      mockGetLatestRecommendation.mockResolvedValue(mockRec);

      const result = await recommendationEngine.get(MOCK_APP_ID);

      expect(result).toEqual(mockRec);
      expect(mockGetLatestRecommendation).toHaveBeenCalledWith(MOCK_APP_ID);
    });

    it("returns null when no recommendation exists", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetLatestRecommendation.mockResolvedValue(null);

      const result = await recommendationEngine.get(MOCK_APP_ID);

      expect(result).toBeNull();
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        recommendationEngine.get("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });
  });

  // -------------------------------------------------------------------------
  // isAutoAcceptable
  // -------------------------------------------------------------------------

  describe("isAutoAcceptable", () => {
    it("returns true when confidence meets minimum threshold", () => {
      expect(recommendationEngine.isAutoAcceptable(0.9)).toBe(true);
      expect(recommendationEngine.isAutoAcceptable(0.95)).toBe(true);
      expect(recommendationEngine.isAutoAcceptable(1.0)).toBe(true);
    });

    it("returns false when confidence is below minimum threshold", () => {
      expect(recommendationEngine.isAutoAcceptable(0.89)).toBe(false);
      expect(recommendationEngine.isAutoAcceptable(0.5)).toBe(false);
      expect(recommendationEngine.isAutoAcceptable(0)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getAllByApplicationId
  // -------------------------------------------------------------------------

  describe("getAllByApplicationId", () => {
    it("returns all recommendations for an application", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockRecs = [
        buildMockRecommendation({ id: "rec-1", recommendation: "REFER_TO_ANALYST" }),
        buildMockRecommendation({ id: "rec-2", recommendation: "APPROVE" }),
      ];
      mockGetRecommendationsByApplicationId.mockResolvedValue(mockRecs);

      const result = await recommendationEngine.getAllByApplicationId(MOCK_APP_ID);

      expect(result).toHaveLength(2);
      expect(mockGetRecommendationsByApplicationId).toHaveBeenCalledWith(MOCK_APP_ID);
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        recommendationEngine.getAllByApplicationId("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });
  });

  // -------------------------------------------------------------------------
  // generate — REJECT when extraction confidence is very low
  // -------------------------------------------------------------------------

  describe("generate — REJECT when extraction confidence is very low", () => {
    it("produces REJECT when average extraction confidence is far below threshold", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const documents = [
        buildMockDocument("INCOME_STATEMENT"),
        buildMockDocument("BANK_STATEMENT"),
        buildMockDocument("TAX_RETURN"),
        buildMockDocument("IDENTITY_DOCUMENT"),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      // All extractions have very low confidence (below 0.8 * 0.7 = 0.56)
      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }, { confidence: 0.40 }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }, { confidence: 0.35 }),
        buildMockExtraction("TAX_RETURN", { taxpayerName: "Test User", totalIncome: 72000, currency: "SGD" }, { confidence: 0.30 }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }, { confidence: 0.45 }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REJECT",
        confidence: 0.85,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.details.recommendation).toBe("REJECT");
      expect(result.details.averageExtractionConfidence).toBeLessThan(0.56);
    });
  });

  // -------------------------------------------------------------------------
  // generate — REFER_TO_ANALYST when missing some required documents
  // -------------------------------------------------------------------------

  describe("generate — REFER_TO_ANALYST when missing some required documents but not critically", () => {
    it("produces REFER_TO_ANALYST when completeness is below 100% but not critically low", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      // Missing TAX_RETURN — only 3 of 4 required
      const documents = [
        buildMockDocument("INCOME_STATEMENT"),
        buildMockDocument("BANK_STATEMENT"),
        buildMockDocument("IDENTITY_DOCUMENT"),
      ];
      mockGetDocumentsByApplicationId.mockResolvedValue(documents);

      const extractions = [
        buildMockExtraction("INCOME_STATEMENT", { applicantName: "Test User", annualIncome: 72000, currency: "SGD" }),
        buildMockExtraction("BANK_STATEMENT", { accountHolder: "Test User", currency: "SGD" }),
        buildMockExtraction("IDENTITY_DOCUMENT", { fullName: "Test User", nricNumber: "SXXXX567A" }),
      ];
      mockGetExtractionsByApplicationId.mockResolvedValue(extractions);

      mockGetDiscrepanciesByApplicationId.mockResolvedValue([]);
      mockGetUnresolvedDiscrepancies.mockResolvedValue([]);
      mockGetDiscrepancyCountBySeverity.mockResolvedValue({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });

      const savedRec = buildMockRecommendation({
        recommendation: "REFER_TO_ANALYST",
        confidence: 0.78,
      });
      mockCreateRecommendation.mockResolvedValue(savedRec);

      const result = await recommendationEngine.generate({
        applicationId: MOCK_APP_ID,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.details.recommendation).toBe("REFER_TO_ANALYST");
      expect(result.details.completenessScore).toBeLessThan(100);
    });
  });
});