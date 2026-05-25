import analystReviewService from "@/lib/services/review-service";
import type {
  ApplicationStatusEnum,
  RecommendationType,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetApplicationById = jest.fn();

jest.mock("@/lib/repositories/application-repository", () => ({
  getApplicationById: (...args: unknown[]) => mockGetApplicationById(...args),
  getApplicationWithRelations: jest.fn(),
  updateApplicantDetails: jest.fn(),
}));

const mockCreateReview = jest.fn();
const mockCreateOverride = jest.fn();
const mockGetReviewById = jest.fn();
const mockGetReviewsByApplicationId = jest.fn();
const mockGetLatestReview = jest.fn();
const mockGetOverridesByApplicationId = jest.fn();
const mockListReviews = jest.fn();
const mockGetReviewCountByApplicationId = jest.fn();

jest.mock("@/lib/repositories/review-repository", () => ({
  createReview: (...args: unknown[]) => mockCreateReview(...args),
  createOverride: (...args: unknown[]) => mockCreateOverride(...args),
  getReviewById: (...args: unknown[]) => mockGetReviewById(...args),
  getReviewsByApplicationId: (...args: unknown[]) =>
    mockGetReviewsByApplicationId(...args),
  getLatestReview: (...args: unknown[]) => mockGetLatestReview(...args),
  getOverridesByApplicationId: (...args: unknown[]) =>
    mockGetOverridesByApplicationId(...args),
  listReviews: (...args: unknown[]) => mockListReviews(...args),
  getReviewCountByApplicationId: (...args: unknown[]) =>
    mockGetReviewCountByApplicationId(...args),
}));

const mockGetLatestRecommendation = jest.fn();

jest.mock("@/lib/repositories/recommendation-repository", () => ({
  getLatestRecommendation: (...args: unknown[]) =>
    mockGetLatestRecommendation(...args),
  createRecommendation: jest.fn(),
  getRecommendationsByApplicationId: jest.fn(),
  getRecommendationById: jest.fn(),
  listRecommendations: jest.fn(),
  getRecommendationCountByType: jest.fn(),
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
const MOCK_REVIEWER_ID = "00000000-0000-0000-0000-000000000002";
const MOCK_IP = "192.168.1.100";

function buildMockApplication(overrides?: Record<string, unknown>) {
  return {
    id: MOCK_APP_ID,
    applicationId: "DBS-1234",
    applicantName: "Test User",
    loanType: "Personal Loan",
    loanAmount: 50000,
    status: "ANALYST_REVIEW" as ApplicationStatusEnum,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildMockReview(overrides?: Record<string, unknown>) {
  return {
    id: "review-1",
    applicationId: MOCK_APP_ID,
    comment: "All documents verified and cross-validated.",
    isOverride: false,
    overrideRecommendation: null,
    justification: null,
    reviewedBy: MOCK_REVIEWER_ID,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    reviewer: {
      id: MOCK_REVIEWER_ID,
      name: "Sarah Chen",
      email: "analyst@dbs.com",
    },
    ...overrides,
  };
}

function buildMockOverrideReview(overrides?: Record<string, unknown>) {
  return {
    id: "override-1",
    applicationId: MOCK_APP_ID,
    comment: "Override comment for this application.",
    isOverride: true,
    overrideRecommendation: "APPROVE" as RecommendationType,
    justification: "After manual review, all discrepancies are acceptable.",
    reviewedBy: MOCK_REVIEWER_ID,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    reviewer: {
      id: MOCK_REVIEWER_ID,
      name: "Sarah Chen",
      email: "analyst@dbs.com",
    },
    ...overrides,
  };
}

function buildMockRecommendation(overrides?: Record<string, unknown>) {
  return {
    id: "rec-1",
    applicationId: MOCK_APP_ID,
    recommendation: "REFER_TO_ANALYST" as RecommendationType,
    rationale: "Discrepancies found that require analyst review.",
    confidence: 0.82,
    createdBy: MOCK_USER_ID,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    user: {
      id: MOCK_USER_ID,
      name: "Admin User",
      email: "admin@dbs.com",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnalystReviewService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogAction.mockResolvedValue({ id: "audit-1" });
    mockIsTransitionAllowed.mockReturnValue(true);
    mockUpdateStatus.mockResolvedValue({
      success: true,
      currentStatus: "ANALYST_REVIEW",
      previousStatus: "RECOMMENDATION_GENERATED",
      statusEntry: { id: "status-1" },
    });
  });

  // -------------------------------------------------------------------------
  // review — submit analyst comment
  // -------------------------------------------------------------------------

  describe("review", () => {
    it("creates a non-override review comment record", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockReview = buildMockReview();
      mockCreateReview.mockResolvedValue(mockReview);

      const result = await analystReviewService.review({
        applicationId: MOCK_APP_ID,
        comment: "All documents verified and cross-validated.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.review).toBeDefined();
      expect(result.review.isOverride).toBe(false);
      expect(result.review.overrideRecommendation).toBeNull();
      expect(result.review.justification).toBeNull();
      expect(result.review.comment).toBe(
        "All documents verified and cross-validated."
      );

      expect(mockCreateReview).toHaveBeenCalledTimes(1);
      expect(mockCreateReview).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          comment: "All documents verified and cross-validated.",
          reviewedBy: MOCK_REVIEWER_ID,
        })
      );
    });

    it("logs the review action via AuditService", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockReview = buildMockReview();
      mockCreateReview.mockResolvedValue(mockReview);

      await analystReviewService.review({
        applicationId: MOCK_APP_ID,
        comment: "All documents verified and cross-validated.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_REVIEWER_ID,
          applicationId: MOCK_APP_ID,
          action: "ANALYST_REVIEW_SUBMITTED",
          entityType: "AnalystReview",
          entityId: mockReview.id,
          ipAddress: MOCK_IP,
          outcome: "SUCCESS",
        })
      );
    });

    it("updates application status to ANALYST_REVIEW if transition is allowed", async () => {
      const mockApp = buildMockApplication({
        status: "RECOMMENDATION_GENERATED" as ApplicationStatusEnum,
      });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockReview = buildMockReview();
      mockCreateReview.mockResolvedValue(mockReview);

      await analystReviewService.review({
        applicationId: MOCK_APP_ID,
        comment: "Reviewing the application.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockIsTransitionAllowed).toHaveBeenCalledWith(
        "RECOMMENDATION_GENERATED",
        "ANALYST_REVIEW"
      );

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          newStatus: "ANALYST_REVIEW",
          changedBy: MOCK_REVIEWER_ID,
        })
      );
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        analystReviewService.review({
          applicationId: "non-existent-id",
          comment: "Some comment",
          reviewedBy: MOCK_REVIEWER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Application not found: non-existent-id");

      expect(mockCreateReview).not.toHaveBeenCalled();
    });

    it("throws validation error when comment is empty", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        analystReviewService.review({
          applicationId: MOCK_APP_ID,
          comment: "",
          reviewedBy: MOCK_REVIEWER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockCreateReview).not.toHaveBeenCalled();
    });

    it("throws validation error when comment is only whitespace", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        analystReviewService.review({
          applicationId: MOCK_APP_ID,
          comment: "   ",
          reviewedBy: MOCK_REVIEWER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockCreateReview).not.toHaveBeenCalled();
    });

    it("still succeeds if status update fails", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockReview = buildMockReview();
      mockCreateReview.mockResolvedValue(mockReview);
      mockUpdateStatus.mockRejectedValue(new Error("Status update failed"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await analystReviewService.review({
        applicationId: MOCK_APP_ID,
        comment: "All documents verified.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.review).toBeDefined();

      consoleSpy.mockRestore();
    });

    it("still succeeds if audit log fails", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockReview = buildMockReview();
      mockCreateReview.mockResolvedValue(mockReview);
      mockLogAction.mockRejectedValue(new Error("Audit log failed"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await analystReviewService.review({
        applicationId: MOCK_APP_ID,
        comment: "All documents verified.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });

    it("handles null ipAddress gracefully", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockReview = buildMockReview();
      mockCreateReview.mockResolvedValue(mockReview);

      const result = await analystReviewService.review({
        applicationId: MOCK_APP_ID,
        comment: "Review comment.",
        reviewedBy: MOCK_REVIEWER_ID,
      });

      expect(result.success).toBe(true);

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // override — submit analyst override
  // -------------------------------------------------------------------------

  describe("override", () => {
    it("creates an override review record with recommendation and justification", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview();
      mockCreateOverride.mockResolvedValue(mockOverride);
      mockGetLatestRecommendation.mockResolvedValue(
        buildMockRecommendation()
      );

      const result = await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Override comment for this application.",
        overrideRecommendation: "APPROVE",
        justification:
          "After manual review, all discrepancies are acceptable.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.review).toBeDefined();
      expect(result.review.isOverride).toBe(true);
      expect(result.review.overrideRecommendation).toBe("APPROVE");
      expect(result.review.justification).toBe(
        "After manual review, all discrepancies are acceptable."
      );

      expect(mockCreateOverride).toHaveBeenCalledTimes(1);
      expect(mockCreateOverride).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          comment: "Override comment for this application.",
          overrideRecommendation: "APPROVE",
          justification:
            "After manual review, all discrepancies are acceptable.",
          reviewedBy: MOCK_REVIEWER_ID,
        })
      );
    });

    it("rejects override when justification is empty", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        analystReviewService.override({
          applicationId: MOCK_APP_ID,
          comment: "Override comment.",
          overrideRecommendation: "APPROVE",
          justification: "",
          reviewedBy: MOCK_REVIEWER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow();

      expect(mockCreateOverride).not.toHaveBeenCalled();
    });

    it("rejects override when justification is only whitespace", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        analystReviewService.override({
          applicationId: MOCK_APP_ID,
          comment: "Override comment.",
          overrideRecommendation: "REJECT",
          justification: "   ",
          reviewedBy: MOCK_REVIEWER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow();

      expect(mockCreateOverride).not.toHaveBeenCalled();
    });

    it("rejects override when comment is empty", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        analystReviewService.override({
          applicationId: MOCK_APP_ID,
          comment: "",
          overrideRecommendation: "APPROVE",
          justification: "Valid justification.",
          reviewedBy: MOCK_REVIEWER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockCreateOverride).not.toHaveBeenCalled();
    });

    it("updates application status to APPROVED when override recommendation is APPROVE", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview({
        overrideRecommendation: "APPROVE" as RecommendationType,
      });
      mockCreateOverride.mockResolvedValue(mockOverride);
      mockGetLatestRecommendation.mockResolvedValue(
        buildMockRecommendation()
      );

      await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Approving after manual review.",
        overrideRecommendation: "APPROVE",
        justification: "All discrepancies are minor and acceptable.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          newStatus: "APPROVED",
          changedBy: MOCK_REVIEWER_ID,
        })
      );
    });

    it("updates application status to REJECTED when override recommendation is REJECT", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview({
        overrideRecommendation: "REJECT" as RecommendationType,
      });
      mockCreateOverride.mockResolvedValue(mockOverride);
      mockGetLatestRecommendation.mockResolvedValue(
        buildMockRecommendation()
      );

      await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Rejecting after manual review.",
        overrideRecommendation: "REJECT",
        justification: "Critical discrepancies cannot be resolved.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          newStatus: "REJECTED",
          changedBy: MOCK_REVIEWER_ID,
        })
      );
    });

    it("updates application status to ANALYST_REVIEW when override recommendation is REFER_TO_ANALYST", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview({
        overrideRecommendation: "REFER_TO_ANALYST" as RecommendationType,
      });
      mockCreateOverride.mockResolvedValue(mockOverride);
      mockGetLatestRecommendation.mockResolvedValue(
        buildMockRecommendation()
      );

      await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Referring back to analyst.",
        overrideRecommendation: "REFER_TO_ANALYST",
        justification: "Need additional analyst input.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          newStatus: "ANALYST_REVIEW",
          changedBy: MOCK_REVIEWER_ID,
        })
      );
    });

    it("updates application status to ANALYST_REVIEW when override recommendation is REQUEST_MORE_INFO", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview({
        overrideRecommendation: "REQUEST_MORE_INFO" as RecommendationType,
      });
      mockCreateOverride.mockResolvedValue(mockOverride);
      mockGetLatestRecommendation.mockResolvedValue(
        buildMockRecommendation()
      );

      await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Requesting more information.",
        overrideRecommendation: "REQUEST_MORE_INFO",
        justification: "Missing supporting documents.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          newStatus: "ANALYST_REVIEW",
          changedBy: MOCK_REVIEWER_ID,
        })
      );
    });

    it("logs the override action via AuditService", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview();
      mockCreateOverride.mockResolvedValue(mockOverride);

      const mockRec = buildMockRecommendation();
      mockGetLatestRecommendation.mockResolvedValue(mockRec);

      await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Override comment.",
        overrideRecommendation: "APPROVE",
        justification: "Valid justification for override.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_REVIEWER_ID,
          applicationId: MOCK_APP_ID,
          action: "RECOMMENDATION_OVERRIDE",
          entityType: "AnalystReview",
          entityId: mockOverride.id,
          ipAddress: MOCK_IP,
          outcome: "SUCCESS",
        })
      );

      // Verify details include previous recommendation info
      const auditCall = mockLogAction.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).action ===
          "RECOMMENDATION_OVERRIDE"
      );
      expect(auditCall).toBeDefined();
      const details = (auditCall![0] as Record<string, unknown>)
        .details as Record<string, unknown>;
      expect(details.isOverride).toBe(true);
      expect(details.overrideRecommendation).toBe("APPROVE");
      expect(details.justification).toBe(
        "Valid justification for override."
      );
      expect(details.previousRecommendation).toBe("REFER_TO_ANALYST");
      expect(details.previousConfidence).toBe(0.82);
    });

    it("logs override with null previous recommendation when none exists", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview();
      mockCreateOverride.mockResolvedValue(mockOverride);
      mockGetLatestRecommendation.mockResolvedValue(null);

      await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Override comment.",
        overrideRecommendation: "APPROVE",
        justification: "Valid justification.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      const auditCall = mockLogAction.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).action ===
          "RECOMMENDATION_OVERRIDE"
      );
      expect(auditCall).toBeDefined();
      const details = (auditCall![0] as Record<string, unknown>)
        .details as Record<string, unknown>;
      expect(details.previousRecommendation).toBeNull();
      expect(details.previousConfidence).toBeNull();
    });

    it("throws error when application is not found for override", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        analystReviewService.override({
          applicationId: "non-existent-id",
          comment: "Override comment.",
          overrideRecommendation: "APPROVE",
          justification: "Valid justification.",
          reviewedBy: MOCK_REVIEWER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Application not found: non-existent-id");

      expect(mockCreateOverride).not.toHaveBeenCalled();
    });

    it("still succeeds if status update fails during override", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview();
      mockCreateOverride.mockResolvedValue(mockOverride);
      mockGetLatestRecommendation.mockResolvedValue(
        buildMockRecommendation()
      );
      mockUpdateStatus.mockRejectedValue(new Error("Status update failed"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Override comment.",
        overrideRecommendation: "APPROVE",
        justification: "Valid justification.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.review).toBeDefined();

      consoleSpy.mockRestore();
    });

    it("still succeeds if audit log fails during override", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview();
      mockCreateOverride.mockResolvedValue(mockOverride);
      mockGetLatestRecommendation.mockResolvedValue(
        buildMockRecommendation()
      );
      mockLogAction.mockRejectedValue(new Error("Audit log failed"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Override comment.",
        overrideRecommendation: "APPROVE",
        justification: "Valid justification.",
        reviewedBy: MOCK_REVIEWER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });

    it("handles null ipAddress gracefully for override", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverride = buildMockOverrideReview();
      mockCreateOverride.mockResolvedValue(mockOverride);
      mockGetLatestRecommendation.mockResolvedValue(
        buildMockRecommendation()
      );

      const result = await analystReviewService.override({
        applicationId: MOCK_APP_ID,
        comment: "Override comment.",
        overrideRecommendation: "APPROVE",
        justification: "Valid justification.",
        reviewedBy: MOCK_REVIEWER_ID,
      });

      expect(result.success).toBe(true);

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // getByApplicationId
  // -------------------------------------------------------------------------

  describe("getByApplicationId", () => {
    it("returns all reviews for an application", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockReviews = [
        buildMockReview({ id: "review-1" }),
        buildMockOverrideReview({ id: "override-1" }),
      ];
      mockGetReviewsByApplicationId.mockResolvedValue(mockReviews);

      const result = await analystReviewService.getByApplicationId(
        MOCK_APP_ID
      );

      expect(result).toHaveLength(2);
      expect(mockGetReviewsByApplicationId).toHaveBeenCalledWith(MOCK_APP_ID);
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        analystReviewService.getByApplicationId("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });

    it("returns empty array when no reviews exist", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetReviewsByApplicationId.mockResolvedValue([]);

      const result = await analystReviewService.getByApplicationId(
        MOCK_APP_ID
      );

      expect(result).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getLatest
  // -------------------------------------------------------------------------

  describe("getLatest", () => {
    it("returns the most recent review for an application", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockReview = buildMockReview();
      mockGetLatestReview.mockResolvedValue(mockReview);

      const result = await analystReviewService.getLatest(MOCK_APP_ID);

      expect(result).toEqual(mockReview);
      expect(mockGetLatestReview).toHaveBeenCalledWith(MOCK_APP_ID);
    });

    it("returns null when no reviews exist", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetLatestReview.mockResolvedValue(null);

      const result = await analystReviewService.getLatest(MOCK_APP_ID);

      expect(result).toBeNull();
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        analystReviewService.getLatest("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });
  });

  // -------------------------------------------------------------------------
  // getOverrides
  // -------------------------------------------------------------------------

  describe("getOverrides", () => {
    it("returns only override reviews for an application", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockOverrides = [
        buildMockOverrideReview({ id: "override-1" }),
        buildMockOverrideReview({ id: "override-2" }),
      ];
      mockGetOverridesByApplicationId.mockResolvedValue(mockOverrides);

      const result = await analystReviewService.getOverrides(MOCK_APP_ID);

      expect(result).toHaveLength(2);
      expect(result[0].isOverride).toBe(true);
      expect(result[1].isOverride).toBe(true);
      expect(mockGetOverridesByApplicationId).toHaveBeenCalledWith(
        MOCK_APP_ID
      );
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        analystReviewService.getOverrides("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });
  });

  // -------------------------------------------------------------------------
  // getById
  // -------------------------------------------------------------------------

  describe("getById", () => {
    it("returns a review by its UUID", async () => {
      const mockReview = {
        ...buildMockReview(),
        application: buildMockApplication(),
      };
      mockGetReviewById.mockResolvedValue(mockReview);

      const result = await analystReviewService.getById("review-1");

      expect(result).toEqual(mockReview);
      expect(mockGetReviewById).toHaveBeenCalledWith("review-1");
    });

    it("returns null when review is not found", async () => {
      mockGetReviewById.mockResolvedValue(null);

      const result = await analystReviewService.getById("non-existent-id");

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getCount
  // -------------------------------------------------------------------------

  describe("getCount", () => {
    it("returns the total count of reviews for an application", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetReviewCountByApplicationId.mockResolvedValue(5);

      const result = await analystReviewService.getCount(MOCK_APP_ID);

      expect(result).toBe(5);
      expect(mockGetReviewCountByApplicationId).toHaveBeenCalledWith(
        MOCK_APP_ID,
        undefined
      );
    });

    it("returns the count of override reviews when filtered", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetReviewCountByApplicationId.mockResolvedValue(2);

      const result = await analystReviewService.getCount(MOCK_APP_ID, true);

      expect(result).toBe(2);
      expect(mockGetReviewCountByApplicationId).toHaveBeenCalledWith(
        MOCK_APP_ID,
        true
      );
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        analystReviewService.getCount("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe("list", () => {
    it("returns paginated list of reviews", async () => {
      const mockResult = {
        items: [buildMockReview(), buildMockOverrideReview()],
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockListReviews.mockResolvedValue(mockResult);

      const result = await analystReviewService.list(
        { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" },
        { applicationId: MOCK_APP_ID }
      );

      expect(result).toEqual(mockResult);
      expect(result.items).toHaveLength(2);
      expect(mockListReviews).toHaveBeenCalledWith(
        { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" },
        { applicationId: MOCK_APP_ID }
      );
    });

    it("returns empty list when no reviews match filters", async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockListReviews.mockResolvedValue(mockResult);

      const result = await analystReviewService.list(
        { page: 1, pageSize: 20 },
        { isOverride: true }
      );

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});