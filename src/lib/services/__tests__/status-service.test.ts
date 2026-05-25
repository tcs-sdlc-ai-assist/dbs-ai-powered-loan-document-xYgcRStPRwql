import statusTracker from "@/lib/services/status-service";
import type { ApplicationStatusEnum } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetApplicationById = jest.fn();
const mockUpdateApplicantDetails = jest.fn();

jest.mock("@/lib/repositories/application-repository", () => ({
  getApplicationById: (...args: unknown[]) => mockGetApplicationById(...args),
  updateApplicantDetails: (...args: unknown[]) =>
    mockUpdateApplicantDetails(...args),
  getApplicationWithRelations: jest.fn(),
}));

const mockCreateStatusEntry = jest.fn();
const mockCreateStatusEntryWithApplicationUpdate = jest.fn();
const mockGetStatusHistory = jest.fn();
const mockGetLatestStatus = jest.fn();
const mockGetStatusByApplicationId = jest.fn();
const mockGetStatusEntryById = jest.fn();
const mockGetStatusEntryCount = jest.fn();
const mockGetStatusEntriesByStatus = jest.fn();

jest.mock("@/lib/repositories/status-repository", () => ({
  createStatusEntry: (...args: unknown[]) => mockCreateStatusEntry(...args),
  createStatusEntryWithApplicationUpdate: (...args: unknown[]) =>
    mockCreateStatusEntryWithApplicationUpdate(...args),
  getStatusHistory: (...args: unknown[]) => mockGetStatusHistory(...args),
  getLatestStatus: (...args: unknown[]) => mockGetLatestStatus(...args),
  getStatusByApplicationId: (...args: unknown[]) =>
    mockGetStatusByApplicationId(...args),
  getStatusEntryById: (...args: unknown[]) =>
    mockGetStatusEntryById(...args),
  getStatusEntryCount: (...args: unknown[]) =>
    mockGetStatusEntryCount(...args),
  getStatusEntriesByStatus: (...args: unknown[]) =>
    mockGetStatusEntriesByStatus(...args),
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
    status: "DRAFT" as ApplicationStatusEnum,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildMockStatusEntry(overrides?: Record<string, unknown>) {
  return {
    id: "status-1",
    applicationId: MOCK_APP_ID,
    status: "SUBMITTED" as ApplicationStatusEnum,
    previousStatus: "DRAFT" as ApplicationStatusEnum | null,
    changedBy: MOCK_USER_ID,
    comments: "Application submitted",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StatusService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogAction.mockResolvedValue({ id: "audit-1" });
  });

  // -------------------------------------------------------------------------
  // isTransitionAllowed
  // -------------------------------------------------------------------------

  describe("isTransitionAllowed", () => {
    it("allows DRAFT -> SUBMITTED", () => {
      expect(statusTracker.isTransitionAllowed("DRAFT", "SUBMITTED")).toBe(true);
    });

    it("allows DRAFT -> CANCELLED", () => {
      expect(statusTracker.isTransitionAllowed("DRAFT", "CANCELLED")).toBe(true);
    });

    it("disallows DRAFT -> APPROVED", () => {
      expect(statusTracker.isTransitionAllowed("DRAFT", "APPROVED")).toBe(false);
    });

    it("disallows DRAFT -> REJECTED", () => {
      expect(statusTracker.isTransitionAllowed("DRAFT", "REJECTED")).toBe(false);
    });

    it("allows SUBMITTED -> UNDER_REVIEW", () => {
      expect(
        statusTracker.isTransitionAllowed("SUBMITTED", "UNDER_REVIEW")
      ).toBe(true);
    });

    it("allows SUBMITTED -> CANCELLED", () => {
      expect(
        statusTracker.isTransitionAllowed("SUBMITTED", "CANCELLED")
      ).toBe(true);
    });

    it("disallows SUBMITTED -> APPROVED", () => {
      expect(
        statusTracker.isTransitionAllowed("SUBMITTED", "APPROVED")
      ).toBe(false);
    });

    it("allows UNDER_REVIEW -> DOCUMENTS_PENDING", () => {
      expect(
        statusTracker.isTransitionAllowed("UNDER_REVIEW", "DOCUMENTS_PENDING")
      ).toBe(true);
    });

    it("allows UNDER_REVIEW -> EXTRACTION_IN_PROGRESS", () => {
      expect(
        statusTracker.isTransitionAllowed(
          "UNDER_REVIEW",
          "EXTRACTION_IN_PROGRESS"
        )
      ).toBe(true);
    });

    it("allows EXTRACTION_IN_PROGRESS -> EXTRACTION_COMPLETE", () => {
      expect(
        statusTracker.isTransitionAllowed(
          "EXTRACTION_IN_PROGRESS",
          "EXTRACTION_COMPLETE"
        )
      ).toBe(true);
    });

    it("allows EXTRACTION_COMPLETE -> VALIDATION_IN_PROGRESS", () => {
      expect(
        statusTracker.isTransitionAllowed(
          "EXTRACTION_COMPLETE",
          "VALIDATION_IN_PROGRESS"
        )
      ).toBe(true);
    });

    it("allows VALIDATION_COMPLETE -> RECOMMENDATION_GENERATED", () => {
      expect(
        statusTracker.isTransitionAllowed(
          "VALIDATION_COMPLETE",
          "RECOMMENDATION_GENERATED"
        )
      ).toBe(true);
    });

    it("allows RECOMMENDATION_GENERATED -> ANALYST_REVIEW", () => {
      expect(
        statusTracker.isTransitionAllowed(
          "RECOMMENDATION_GENERATED",
          "ANALYST_REVIEW"
        )
      ).toBe(true);
    });

    it("allows RECOMMENDATION_GENERATED -> APPROVED", () => {
      expect(
        statusTracker.isTransitionAllowed(
          "RECOMMENDATION_GENERATED",
          "APPROVED"
        )
      ).toBe(true);
    });

    it("allows RECOMMENDATION_GENERATED -> REJECTED", () => {
      expect(
        statusTracker.isTransitionAllowed(
          "RECOMMENDATION_GENERATED",
          "REJECTED"
        )
      ).toBe(true);
    });

    it("allows ANALYST_REVIEW -> APPROVED", () => {
      expect(
        statusTracker.isTransitionAllowed("ANALYST_REVIEW", "APPROVED")
      ).toBe(true);
    });

    it("allows ANALYST_REVIEW -> REJECTED", () => {
      expect(
        statusTracker.isTransitionAllowed("ANALYST_REVIEW", "REJECTED")
      ).toBe(true);
    });

    it("allows ANALYST_REVIEW -> RETURNED", () => {
      expect(
        statusTracker.isTransitionAllowed("ANALYST_REVIEW", "RETURNED")
      ).toBe(true);
    });

    it("allows ANALYST_REVIEW -> RECOMMENDATION_GENERATED", () => {
      expect(
        statusTracker.isTransitionAllowed(
          "ANALYST_REVIEW",
          "RECOMMENDATION_GENERATED"
        )
      ).toBe(true);
    });

    it("disallows transitions from APPROVED (terminal state)", () => {
      expect(
        statusTracker.isTransitionAllowed("APPROVED", "DRAFT")
      ).toBe(false);
      expect(
        statusTracker.isTransitionAllowed("APPROVED", "SUBMITTED")
      ).toBe(false);
      expect(
        statusTracker.isTransitionAllowed("APPROVED", "REJECTED")
      ).toBe(false);
      expect(
        statusTracker.isTransitionAllowed("APPROVED", "CANCELLED")
      ).toBe(false);
    });

    it("disallows transitions from REJECTED (terminal state)", () => {
      expect(
        statusTracker.isTransitionAllowed("REJECTED", "DRAFT")
      ).toBe(false);
      expect(
        statusTracker.isTransitionAllowed("REJECTED", "APPROVED")
      ).toBe(false);
      expect(
        statusTracker.isTransitionAllowed("REJECTED", "CANCELLED")
      ).toBe(false);
    });

    it("disallows transitions from CANCELLED (terminal state)", () => {
      expect(
        statusTracker.isTransitionAllowed("CANCELLED", "DRAFT")
      ).toBe(false);
      expect(
        statusTracker.isTransitionAllowed("CANCELLED", "SUBMITTED")
      ).toBe(false);
      expect(
        statusTracker.isTransitionAllowed("CANCELLED", "APPROVED")
      ).toBe(false);
    });

    it("allows RETURNED -> SUBMITTED", () => {
      expect(
        statusTracker.isTransitionAllowed("RETURNED", "SUBMITTED")
      ).toBe(true);
    });

    it("allows RETURNED -> UNDER_REVIEW", () => {
      expect(
        statusTracker.isTransitionAllowed("RETURNED", "UNDER_REVIEW")
      ).toBe(true);
    });

    it("allows RETURNED -> CANCELLED", () => {
      expect(
        statusTracker.isTransitionAllowed("RETURNED", "CANCELLED")
      ).toBe(true);
    });

    it("disallows RETURNED -> APPROVED", () => {
      expect(
        statusTracker.isTransitionAllowed("RETURNED", "APPROVED")
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getAllowedTransitions
  // -------------------------------------------------------------------------

  describe("getAllowedTransitions", () => {
    it("returns allowed transitions for DRAFT", () => {
      const transitions = statusTracker.getAllowedTransitions("DRAFT");
      expect(transitions).toContain("SUBMITTED");
      expect(transitions).toContain("CANCELLED");
      expect(transitions).not.toContain("APPROVED");
    });

    it("returns empty array for APPROVED (terminal state)", () => {
      const transitions = statusTracker.getAllowedTransitions("APPROVED");
      expect(transitions).toHaveLength(0);
    });

    it("returns empty array for REJECTED (terminal state)", () => {
      const transitions = statusTracker.getAllowedTransitions("REJECTED");
      expect(transitions).toHaveLength(0);
    });

    it("returns empty array for CANCELLED (terminal state)", () => {
      const transitions = statusTracker.getAllowedTransitions("CANCELLED");
      expect(transitions).toHaveLength(0);
    });

    it("returns multiple transitions for ANALYST_REVIEW", () => {
      const transitions = statusTracker.getAllowedTransitions("ANALYST_REVIEW");
      expect(transitions).toContain("APPROVED");
      expect(transitions).toContain("REJECTED");
      expect(transitions).toContain("RETURNED");
      expect(transitions).toContain("RECOMMENDATION_GENERATED");
      expect(transitions).toContain("CANCELLED");
    });

    it("returns a copy of the transitions array (not a reference)", () => {
      const transitions1 = statusTracker.getAllowedTransitions("DRAFT");
      const transitions2 = statusTracker.getAllowedTransitions("DRAFT");
      expect(transitions1).toEqual(transitions2);
      expect(transitions1).not.toBe(transitions2);
    });
  });

  // -------------------------------------------------------------------------
  // updateStatus
  // -------------------------------------------------------------------------

  describe("updateStatus", () => {
    it("updates status when transition is allowed", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockEntry = buildMockStatusEntry({
        status: "SUBMITTED",
        previousStatus: "DRAFT",
      });
      mockCreateStatusEntryWithApplicationUpdate.mockResolvedValue(mockEntry);

      const result = await statusTracker.updateStatus({
        applicationId: MOCK_APP_ID,
        newStatus: "SUBMITTED",
        changedBy: MOCK_USER_ID,
        comments: "Application submitted",
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.currentStatus).toBe("SUBMITTED");
      expect(result.previousStatus).toBe("DRAFT");
      expect(result.statusEntry).toBeDefined();
      expect(result.statusEntry.status).toBe("SUBMITTED");
      expect(result.statusEntry.previousStatus).toBe("DRAFT");
    });

    it("records the previous status in the status entry", async () => {
      const mockApp = buildMockApplication({ status: "UNDER_REVIEW" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockEntry = buildMockStatusEntry({
        status: "EXTRACTION_IN_PROGRESS",
        previousStatus: "UNDER_REVIEW",
      });
      mockCreateStatusEntryWithApplicationUpdate.mockResolvedValue(mockEntry);

      const result = await statusTracker.updateStatus({
        applicationId: MOCK_APP_ID,
        newStatus: "EXTRACTION_IN_PROGRESS",
        changedBy: MOCK_USER_ID,
        comments: "Extraction started",
        ipAddress: MOCK_IP,
      });

      expect(result.previousStatus).toBe("UNDER_REVIEW");
      expect(result.currentStatus).toBe("EXTRACTION_IN_PROGRESS");

      expect(mockCreateStatusEntryWithApplicationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
          status: "EXTRACTION_IN_PROGRESS",
          previousStatus: "UNDER_REVIEW",
          changedBy: MOCK_USER_ID,
          comments: "Extraction started",
        })
      );
    });

    it("logs the status update via AuditService", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockEntry = buildMockStatusEntry({
        status: "SUBMITTED",
        previousStatus: "DRAFT",
      });
      mockCreateStatusEntryWithApplicationUpdate.mockResolvedValue(mockEntry);

      await statusTracker.updateStatus({
        applicationId: MOCK_APP_ID,
        newStatus: "SUBMITTED",
        changedBy: MOCK_USER_ID,
        comments: "Application submitted",
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          applicationId: MOCK_APP_ID,
          action: "STATUS_UPDATE",
          entityType: "Application",
          entityId: MOCK_APP_ID,
          ipAddress: MOCK_IP,
          outcome: "SUCCESS",
          details: expect.objectContaining({
            previousStatus: "DRAFT",
            newStatus: "SUBMITTED",
            comments: "Application submitted",
          }),
        })
      );
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        statusTracker.updateStatus({
          applicationId: "non-existent-id",
          newStatus: "SUBMITTED",
          changedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Application not found: non-existent-id");

      expect(
        mockCreateStatusEntryWithApplicationUpdate
      ).not.toHaveBeenCalled();
    });

    it("throws error when transition is not allowed", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        statusTracker.updateStatus({
          applicationId: MOCK_APP_ID,
          newStatus: "APPROVED",
          changedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow(
        "Status transition from DRAFT to APPROVED is not allowed"
      );

      expect(
        mockCreateStatusEntryWithApplicationUpdate
      ).not.toHaveBeenCalled();
    });

    it("logs STATUS_TRANSITION_DENIED when transition is not allowed", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        statusTracker.updateStatus({
          applicationId: MOCK_APP_ID,
          newStatus: "APPROVED",
          changedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow();

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          applicationId: MOCK_APP_ID,
          action: "STATUS_TRANSITION_DENIED",
          entityType: "Application",
          entityId: MOCK_APP_ID,
          ipAddress: MOCK_IP,
          outcome: "DENIED",
          details: expect.objectContaining({
            previousStatus: "DRAFT",
            attemptedStatus: "APPROVED",
          }),
        })
      );
    });

    it("still succeeds if audit log fails after successful status update", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockEntry = buildMockStatusEntry({
        status: "SUBMITTED",
        previousStatus: "DRAFT",
      });
      mockCreateStatusEntryWithApplicationUpdate.mockResolvedValue(mockEntry);
      mockLogAction.mockRejectedValue(new Error("Audit log failed"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await statusTracker.updateStatus({
        applicationId: MOCK_APP_ID,
        newStatus: "SUBMITTED",
        changedBy: MOCK_USER_ID,
        comments: "Application submitted",
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.currentStatus).toBe("SUBMITTED");

      consoleSpy.mockRestore();
    });

    it("handles null ipAddress gracefully", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockEntry = buildMockStatusEntry({
        status: "SUBMITTED",
        previousStatus: "DRAFT",
      });
      mockCreateStatusEntryWithApplicationUpdate.mockResolvedValue(mockEntry);

      const result = await statusTracker.updateStatus({
        applicationId: MOCK_APP_ID,
        newStatus: "SUBMITTED",
        changedBy: MOCK_USER_ID,
        comments: "Application submitted",
      });

      expect(result.success).toBe(true);

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
        })
      );
    });

    it("handles undefined comments gracefully", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockEntry = buildMockStatusEntry({
        status: "SUBMITTED",
        previousStatus: "DRAFT",
        comments: null,
      });
      mockCreateStatusEntryWithApplicationUpdate.mockResolvedValue(mockEntry);

      const result = await statusTracker.updateStatus({
        applicationId: MOCK_APP_ID,
        newStatus: "SUBMITTED",
        changedBy: MOCK_USER_ID,
      });

      expect(result.success).toBe(true);

      expect(mockCreateStatusEntryWithApplicationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          comments: undefined,
        })
      );
    });

    it("uses createStatusEntryWithApplicationUpdate for atomic update", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockEntry = buildMockStatusEntry({
        status: "SUBMITTED",
        previousStatus: "DRAFT",
      });
      mockCreateStatusEntryWithApplicationUpdate.mockResolvedValue(mockEntry);

      await statusTracker.updateStatus({
        applicationId: MOCK_APP_ID,
        newStatus: "SUBMITTED",
        changedBy: MOCK_USER_ID,
        comments: "Submitted",
        ipAddress: MOCK_IP,
      });

      expect(
        mockCreateStatusEntryWithApplicationUpdate
      ).toHaveBeenCalledTimes(1);
      expect(
        mockCreateStatusEntryWithApplicationUpdate
      ).toHaveBeenCalledWith({
        applicationId: MOCK_APP_ID,
        status: "SUBMITTED",
        previousStatus: "DRAFT",
        changedBy: MOCK_USER_ID,
        comments: "Submitted",
      });
    });

    it("supports full workflow transition chain", async () => {
      const statuses: ApplicationStatusEnum[] = [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "EXTRACTION_IN_PROGRESS",
        "EXTRACTION_COMPLETE",
        "VALIDATION_IN_PROGRESS",
        "VALIDATION_COMPLETE",
        "RECOMMENDATION_GENERATED",
        "ANALYST_REVIEW",
        "APPROVED",
      ];

      for (let i = 0; i < statuses.length - 1; i++) {
        const currentStatus = statuses[i];
        const nextStatus = statuses[i + 1];

        const mockApp = buildMockApplication({ status: currentStatus });
        mockGetApplicationById.mockResolvedValue(mockApp);

        const mockEntry = buildMockStatusEntry({
          id: `status-${i}`,
          status: nextStatus,
          previousStatus: currentStatus,
        });
        mockCreateStatusEntryWithApplicationUpdate.mockResolvedValue(
          mockEntry
        );

        const result = await statusTracker.updateStatus({
          applicationId: MOCK_APP_ID,
          newStatus: nextStatus,
          changedBy: MOCK_USER_ID,
          comments: `Transition from ${currentStatus} to ${nextStatus}`,
          ipAddress: MOCK_IP,
        });

        expect(result.success).toBe(true);
        expect(result.currentStatus).toBe(nextStatus);
        expect(result.previousStatus).toBe(currentStatus);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getStatus
  // -------------------------------------------------------------------------

  describe("getStatus", () => {
    it("returns the current status of an application", async () => {
      const mockApp = buildMockApplication({ status: "UNDER_REVIEW" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockEntry = buildMockStatusEntry({
        status: "UNDER_REVIEW",
        createdAt: new Date("2024-06-15T10:00:00.000Z"),
      });
      mockGetLatestStatus.mockResolvedValue(mockEntry);

      const result = await statusTracker.getStatus(MOCK_APP_ID);

      expect(result.applicationId).toBe(MOCK_APP_ID);
      expect(result.currentStatus).toBe("UNDER_REVIEW");
      expect(result.lastChanged).toEqual(
        new Date("2024-06-15T10:00:00.000Z")
      );
    });

    it("uses application updatedAt when no status entry exists", async () => {
      const mockApp = buildMockApplication({
        status: "DRAFT",
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      });
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetLatestStatus.mockResolvedValue(null);

      const result = await statusTracker.getStatus(MOCK_APP_ID);

      expect(result.currentStatus).toBe("DRAFT");
      expect(result.lastChanged).toEqual(
        new Date("2024-01-01T00:00:00.000Z")
      );
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        statusTracker.getStatus("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });
  });

  // -------------------------------------------------------------------------
  // getHistory
  // -------------------------------------------------------------------------

  describe("getHistory", () => {
    it("returns ordered status history entries (oldest first)", async () => {
      const mockApp = buildMockApplication({ status: "ANALYST_REVIEW" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockHistory = [
        buildMockStatusEntry({
          id: "status-1",
          status: "DRAFT",
          previousStatus: null,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
        }),
        buildMockStatusEntry({
          id: "status-2",
          status: "SUBMITTED",
          previousStatus: "DRAFT",
          createdAt: new Date("2024-01-02T00:00:00.000Z"),
        }),
        buildMockStatusEntry({
          id: "status-3",
          status: "UNDER_REVIEW",
          previousStatus: "SUBMITTED",
          createdAt: new Date("2024-01-03T00:00:00.000Z"),
        }),
        buildMockStatusEntry({
          id: "status-4",
          status: "ANALYST_REVIEW",
          previousStatus: "UNDER_REVIEW",
          createdAt: new Date("2024-01-04T00:00:00.000Z"),
        }),
      ];
      mockGetStatusHistory.mockResolvedValue(mockHistory);

      const result = await statusTracker.getHistory(MOCK_APP_ID);

      expect(result.applicationId).toBe(MOCK_APP_ID);
      expect(result.history).toHaveLength(4);
      expect(result.history[0].status).toBe("DRAFT");
      expect(result.history[1].status).toBe("SUBMITTED");
      expect(result.history[2].status).toBe("UNDER_REVIEW");
      expect(result.history[3].status).toBe("ANALYST_REVIEW");

      expect(mockGetStatusHistory).toHaveBeenCalledWith(MOCK_APP_ID);
    });

    it("returns empty history when no status entries exist", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockGetStatusHistory.mockResolvedValue([]);

      const result = await statusTracker.getHistory(MOCK_APP_ID);

      expect(result.applicationId).toBe(MOCK_APP_ID);
      expect(result.history).toHaveLength(0);
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        statusTracker.getHistory("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });

    it("returns history with correct previousStatus chain", async () => {
      const mockApp = buildMockApplication({ status: "EXTRACTION_COMPLETE" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockHistory = [
        buildMockStatusEntry({
          id: "status-1",
          status: "DRAFT",
          previousStatus: null,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
        }),
        buildMockStatusEntry({
          id: "status-2",
          status: "SUBMITTED",
          previousStatus: "DRAFT",
          createdAt: new Date("2024-01-02T00:00:00.000Z"),
        }),
        buildMockStatusEntry({
          id: "status-3",
          status: "UNDER_REVIEW",
          previousStatus: "SUBMITTED",
          createdAt: new Date("2024-01-03T00:00:00.000Z"),
        }),
      ];
      mockGetStatusHistory.mockResolvedValue(mockHistory);

      const result = await statusTracker.getHistory(MOCK_APP_ID);

      expect(result.history[0].previousStatus).toBeNull();
      expect(result.history[1].previousStatus).toBe("DRAFT");
      expect(result.history[2].previousStatus).toBe("SUBMITTED");
    });
  });

  // -------------------------------------------------------------------------
  // getHistoryDescending
  // -------------------------------------------------------------------------

  describe("getHistoryDescending", () => {
    it("returns status history ordered newest first", async () => {
      const mockApp = buildMockApplication({ status: "UNDER_REVIEW" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockStatuses = [
        buildMockStatusEntry({
          id: "status-3",
          status: "UNDER_REVIEW",
          previousStatus: "SUBMITTED",
          createdAt: new Date("2024-01-03T00:00:00.000Z"),
        }),
        buildMockStatusEntry({
          id: "status-2",
          status: "SUBMITTED",
          previousStatus: "DRAFT",
          createdAt: new Date("2024-01-02T00:00:00.000Z"),
        }),
        buildMockStatusEntry({
          id: "status-1",
          status: "DRAFT",
          previousStatus: null,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
        }),
      ];
      mockGetStatusByApplicationId.mockResolvedValue(mockStatuses);

      const result = await statusTracker.getHistoryDescending(MOCK_APP_ID);

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe("UNDER_REVIEW");
      expect(result[1].status).toBe("SUBMITTED");
      expect(result[2].status).toBe("DRAFT");

      expect(mockGetStatusByApplicationId).toHaveBeenCalledWith(MOCK_APP_ID);
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        statusTracker.getHistoryDescending("non-existent-id")
      ).rejects.toThrow("Application not found: non-existent-id");
    });
  });

  // -------------------------------------------------------------------------
  // getStatusEntryById
  // -------------------------------------------------------------------------

  describe("getStatusEntryById", () => {
    it("returns a status entry by its UUID", async () => {
      const mockEntry = buildMockStatusEntry();
      mockGetStatusEntryById.mockResolvedValue(mockEntry);

      const result = await statusTracker.getStatusEntryById("status-1");

      expect(result).toEqual(mockEntry);
      expect(mockGetStatusEntryById).toHaveBeenCalledWith("status-1");
    });

    it("returns null when status entry is not found", async () => {
      mockGetStatusEntryById.mockResolvedValue(null);

      const result = await statusTracker.getStatusEntryById(
        "non-existent-id"
      );

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getTransitionCount
  // -------------------------------------------------------------------------

  describe("getTransitionCount", () => {
    it("returns the total number of status transitions", async () => {
      mockGetStatusEntryCount.mockResolvedValue(9);

      const result = await statusTracker.getTransitionCount(MOCK_APP_ID);

      expect(result).toBe(9);
      expect(mockGetStatusEntryCount).toHaveBeenCalledWith(MOCK_APP_ID);
    });

    it("returns 0 when no transitions exist", async () => {
      mockGetStatusEntryCount.mockResolvedValue(0);

      const result = await statusTracker.getTransitionCount(MOCK_APP_ID);

      expect(result).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getEntriesByStatus
  // -------------------------------------------------------------------------

  describe("getEntriesByStatus", () => {
    it("returns all entries matching a specific status", async () => {
      const mockEntries = [
        buildMockStatusEntry({
          id: "status-1",
          status: "UNDER_REVIEW",
          createdAt: new Date("2024-01-03T00:00:00.000Z"),
        }),
        buildMockStatusEntry({
          id: "status-2",
          status: "UNDER_REVIEW",
          createdAt: new Date("2024-01-10T00:00:00.000Z"),
        }),
      ];
      mockGetStatusEntriesByStatus.mockResolvedValue(mockEntries);

      const result = await statusTracker.getEntriesByStatus(
        MOCK_APP_ID,
        "UNDER_REVIEW"
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("UNDER_REVIEW");
      expect(result[1].status).toBe("UNDER_REVIEW");
      expect(mockGetStatusEntriesByStatus).toHaveBeenCalledWith(
        MOCK_APP_ID,
        "UNDER_REVIEW"
      );
    });

    it("returns empty array when no entries match the status", async () => {
      mockGetStatusEntriesByStatus.mockResolvedValue([]);

      const result = await statusTracker.getEntriesByStatus(
        MOCK_APP_ID,
        "APPROVED"
      );

      expect(result).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // updateStatus — edge cases
  // -------------------------------------------------------------------------

  describe("updateStatus — edge cases", () => {
    it("throws error when transitioning from terminal APPROVED state", async () => {
      const mockApp = buildMockApplication({ status: "APPROVED" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        statusTracker.updateStatus({
          applicationId: MOCK_APP_ID,
          newStatus: "REJECTED",
          changedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow(
        "Status transition from APPROVED to REJECTED is not allowed"
      );
    });

    it("throws error when transitioning from terminal REJECTED state", async () => {
      const mockApp = buildMockApplication({ status: "REJECTED" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        statusTracker.updateStatus({
          applicationId: MOCK_APP_ID,
          newStatus: "APPROVED",
          changedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow(
        "Status transition from REJECTED to APPROVED is not allowed"
      );
    });

    it("throws error when transitioning from terminal CANCELLED state", async () => {
      const mockApp = buildMockApplication({ status: "CANCELLED" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      await expect(
        statusTracker.updateStatus({
          applicationId: MOCK_APP_ID,
          newStatus: "DRAFT",
          changedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow(
        "Status transition from CANCELLED to DRAFT is not allowed"
      );
    });

    it("handles createStatusEntryWithApplicationUpdate failure", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockCreateStatusEntryWithApplicationUpdate.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        statusTracker.updateStatus({
          applicationId: MOCK_APP_ID,
          newStatus: "SUBMITTED",
          changedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Database error");
    });

    it("swallows audit log failure for denied transitions", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);
      mockLogAction.mockRejectedValue(new Error("Audit log failed"));

      await expect(
        statusTracker.updateStatus({
          applicationId: MOCK_APP_ID,
          newStatus: "APPROVED",
          changedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow(
        "Status transition from DRAFT to APPROVED is not allowed"
      );
    });

    it("logs null comments when comments are not provided", async () => {
      const mockApp = buildMockApplication({ status: "DRAFT" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const mockEntry = buildMockStatusEntry({
        status: "SUBMITTED",
        previousStatus: "DRAFT",
        comments: null,
      });
      mockCreateStatusEntryWithApplicationUpdate.mockResolvedValue(mockEntry);

      await statusTracker.updateStatus({
        applicationId: MOCK_APP_ID,
        newStatus: "SUBMITTED",
        changedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            comments: null,
          }),
        })
      );
    });
  });
});