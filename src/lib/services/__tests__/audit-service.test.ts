import auditLogger from "@/lib/services/audit-service";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateAuditLog = jest.fn();
const mockGetAuditLogById = jest.fn();
const mockQueryAuditLogs = jest.fn();
const mockGetAuditLogsByApplicationId = jest.fn();
const mockGetAuditLogsByUserId = jest.fn();
const mockGetAuditLogCountByApplicationId = jest.fn();
const mockGetAuditLogCountByAction = jest.fn();

jest.mock("@/lib/repositories/audit-repository", () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
  getAuditLogById: (...args: unknown[]) => mockGetAuditLogById(...args),
  queryAuditLogs: (...args: unknown[]) => mockQueryAuditLogs(...args),
  getAuditLogsByApplicationId: (...args: unknown[]) =>
    mockGetAuditLogsByApplicationId(...args),
  getAuditLogsByUserId: (...args: unknown[]) =>
    mockGetAuditLogsByUserId(...args),
  getAuditLogCountByApplicationId: (...args: unknown[]) =>
    mockGetAuditLogCountByApplicationId(...args),
  getAuditLogCountByAction: (...args: unknown[]) =>
    mockGetAuditLogCountByAction(...args),
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

function buildMockAuditLog(overrides?: Record<string, unknown>) {
  return {
    id: "audit-1",
    applicationId: MOCK_APP_ID,
    userId: MOCK_USER_ID,
    action: "APPLICATION_CREATED",
    entityType: "Application",
    entityId: MOCK_APP_ID,
    details: { applicantName: "Test User", loanType: "Personal Loan" },
    ipAddress: MOCK_IP,
    outcome: "SUCCESS",
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

describe("AuditService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // logAction
  // -------------------------------------------------------------------------

  describe("logAction", () => {
    it("creates an immutable audit log record with all required fields", async () => {
      const mockLog = buildMockAuditLog();
      mockCreateAuditLog.mockResolvedValue(mockLog);

      const result = await auditLogger.logAction({
        userId: MOCK_USER_ID,
        applicationId: MOCK_APP_ID,
        action: "APPLICATION_CREATED",
        entityType: "Application",
        entityId: MOCK_APP_ID,
        details: { applicantName: "Test User", loanType: "Personal Loan" },
        ipAddress: MOCK_IP,
        outcome: "SUCCESS",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("audit-1");
      expect(result.applicationId).toBe(MOCK_APP_ID);
      expect(result.userId).toBe(MOCK_USER_ID);
      expect(result.action).toBe("APPLICATION_CREATED");
      expect(result.entityType).toBe("Application");
      expect(result.entityId).toBe(MOCK_APP_ID);
      expect(result.ipAddress).toBe(MOCK_IP);
      expect(result.outcome).toBe("SUCCESS");
      expect(result.user).toBeDefined();
      expect(result.user?.name).toBe("Admin User");

      expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        applicationId: MOCK_APP_ID,
        userId: MOCK_USER_ID,
        action: "APPLICATION_CREATED",
        entityType: "Application",
        entityId: MOCK_APP_ID,
        details: { applicantName: "Test User", loanType: "Personal Loan" },
        ipAddress: MOCK_IP,
        outcome: "SUCCESS",
      });
    });

    it("handles null userId gracefully", async () => {
      const mockLog = buildMockAuditLog({ userId: null, user: null });
      mockCreateAuditLog.mockResolvedValue(mockLog);

      const result = await auditLogger.logAction({
        userId: null,
        applicationId: MOCK_APP_ID,
        action: "EXTRACTION_COMPLETED",
        entityType: "ExtractionResult",
        entityId: MOCK_APP_ID,
        details: { documentsProcessed: 4 },
        ipAddress: null,
        outcome: "SUCCESS",
      });

      expect(result).toBeDefined();
      expect(result.userId).toBeNull();

      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          ipAddress: null,
        })
      );
    });

    it("handles null applicationId gracefully", async () => {
      const mockLog = buildMockAuditLog({ applicationId: null });
      mockCreateAuditLog.mockResolvedValue(mockLog);

      const result = await auditLogger.logAction({
        userId: MOCK_USER_ID,
        applicationId: null,
        action: "USER_LOGIN",
        entityType: "User",
        entityId: MOCK_USER_ID,
        details: { method: "credentials" },
        ipAddress: MOCK_IP,
        outcome: "SUCCESS",
      });

      expect(result).toBeDefined();

      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: null,
        })
      );
    });

    it("handles null details gracefully", async () => {
      const mockLog = buildMockAuditLog({ details: null });
      mockCreateAuditLog.mockResolvedValue(mockLog);

      const result = await auditLogger.logAction({
        userId: MOCK_USER_ID,
        applicationId: MOCK_APP_ID,
        action: "STATUS_UPDATE",
        entityType: "Application",
        entityId: MOCK_APP_ID,
        details: null,
        ipAddress: MOCK_IP,
        outcome: "SUCCESS",
      });

      expect(result).toBeDefined();

      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: null,
        })
      );
    });

    it("handles undefined details by converting to null", async () => {
      const mockLog = buildMockAuditLog({ details: null });
      mockCreateAuditLog.mockResolvedValue(mockLog);

      const result = await auditLogger.logAction({
        userId: MOCK_USER_ID,
        applicationId: MOCK_APP_ID,
        action: "STATUS_UPDATE",
        entityType: "Application",
        entityId: MOCK_APP_ID,
        ipAddress: MOCK_IP,
        outcome: "SUCCESS",
      });

      expect(result).toBeDefined();

      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: null,
        })
      );
    });

    it("throws error when createAuditLog fails", async () => {
      mockCreateAuditLog.mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(
        auditLogger.logAction({
          userId: MOCK_USER_ID,
          applicationId: MOCK_APP_ID,
          action: "APPLICATION_CREATED",
          entityType: "Application",
          entityId: MOCK_APP_ID,
          ipAddress: MOCK_IP,
          outcome: "SUCCESS",
        })
      ).rejects.toThrow("Failed to create audit log: Database connection failed");

      expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
    });

    it("records different action types correctly", async () => {
      const actions = [
        "APPLICATION_CREATED",
        "DOCUMENT_UPLOAD",
        "EXTRACTION_COMPLETED",
        "VALIDATION_COMPLETED",
        "RECOMMENDATION_GENERATED",
        "ANALYST_REVIEW_SUBMITTED",
        "RECOMMENDATION_OVERRIDE",
        "STATUS_UPDATE",
        "ACCESS_DENIED",
        "USER_LOGIN",
      ];

      for (const action of actions) {
        const mockLog = buildMockAuditLog({ id: `audit-${action}`, action });
        mockCreateAuditLog.mockResolvedValue(mockLog);

        const result = await auditLogger.logAction({
          userId: MOCK_USER_ID,
          applicationId: MOCK_APP_ID,
          action,
          entityType: "Application",
          entityId: MOCK_APP_ID,
          ipAddress: MOCK_IP,
          outcome: "SUCCESS",
        });

        expect(result.action).toBe(action);
      }

      expect(mockCreateAuditLog).toHaveBeenCalledTimes(actions.length);
    });

    it("records different outcome types correctly", async () => {
      const outcomes = [
        "SUCCESS",
        "DENIED",
        "PARTIAL_SUCCESS",
        "INCOMPLETE",
        "DISCREPANCIES_FOUND",
      ];

      for (const outcome of outcomes) {
        const mockLog = buildMockAuditLog({ id: `audit-${outcome}`, outcome });
        mockCreateAuditLog.mockResolvedValue(mockLog);

        const result = await auditLogger.logAction({
          userId: MOCK_USER_ID,
          applicationId: MOCK_APP_ID,
          action: "APPLICATION_CREATED",
          entityType: "Application",
          entityId: MOCK_APP_ID,
          ipAddress: MOCK_IP,
          outcome,
        });

        expect(result.outcome).toBe(outcome);
      }

      expect(mockCreateAuditLog).toHaveBeenCalledTimes(outcomes.length);
    });

    it("preserves complex details object", async () => {
      const complexDetails = {
        previousStatus: "DRAFT",
        newStatus: "SUBMITTED",
        documentsProcessed: 4,
        averageConfidence: 0.94,
        discrepanciesFound: 2,
        nestedObject: {
          key1: "value1",
          key2: 42,
        },
      };

      const mockLog = buildMockAuditLog({ details: complexDetails });
      mockCreateAuditLog.mockResolvedValue(mockLog);

      await auditLogger.logAction({
        userId: MOCK_USER_ID,
        applicationId: MOCK_APP_ID,
        action: "STATUS_UPDATE",
        entityType: "Application",
        entityId: MOCK_APP_ID,
        details: complexDetails,
        ipAddress: MOCK_IP,
        outcome: "SUCCESS",
      });

      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: complexDetails,
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // queryLogs
  // -------------------------------------------------------------------------

  describe("queryLogs", () => {
    it("returns paginated audit logs with default pagination", async () => {
      const mockResult = {
        items: [buildMockAuditLog(), buildMockAuditLog({ id: "audit-2" })],
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs();

      expect(result).toEqual(mockResult);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);

      expect(mockQueryAuditLogs).toHaveBeenCalledTimes(1);
      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        {
          page: 1,
          pageSize: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        {}
      );
    });

    it("filters by applicationId correctly", async () => {
      const mockResult = {
        items: [buildMockAuditLog()],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs({
        applicationId: MOCK_APP_ID,
      });

      expect(result.items).toHaveLength(1);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          applicationId: MOCK_APP_ID,
        })
      );
    });

    it("filters by userId correctly", async () => {
      const mockResult = {
        items: [buildMockAuditLog()],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs({
        userId: MOCK_USER_ID,
      });

      expect(result.items).toHaveLength(1);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userId: MOCK_USER_ID,
        })
      );
    });

    it("filters by action correctly", async () => {
      const mockResult = {
        items: [buildMockAuditLog()],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs({
        action: "APPLICATION_CREATED",
      });

      expect(result.items).toHaveLength(1);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          action: "APPLICATION_CREATED",
        })
      );
    });

    it("filters by entityType correctly", async () => {
      const mockResult = {
        items: [buildMockAuditLog()],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs({
        entityType: "Application",
      });

      expect(result.items).toHaveLength(1);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          entityType: "Application",
        })
      );
    });

    it("filters by outcome correctly", async () => {
      const mockResult = {
        items: [buildMockAuditLog({ outcome: "DENIED" })],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs({
        outcome: "DENIED",
      });

      expect(result.items).toHaveLength(1);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          outcome: "DENIED",
        })
      );
    });

    it("filters by date range correctly", async () => {
      const startDate = "2024-01-01T00:00:00.000Z";
      const endDate = "2024-12-31T23:59:59.999Z";

      const mockResult = {
        items: [buildMockAuditLog()],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs({
        startDate,
        endDate,
      });

      expect(result.items).toHaveLength(1);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          startDate,
          endDate,
        })
      );
    });

    it("applies multiple filters simultaneously", async () => {
      const mockResult = {
        items: [buildMockAuditLog()],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs({
        applicationId: MOCK_APP_ID,
        userId: MOCK_USER_ID,
        action: "APPLICATION_CREATED",
        entityType: "Application",
        outcome: "SUCCESS",
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-12-31T23:59:59.999Z",
      });

      expect(result.items).toHaveLength(1);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        {
          applicationId: MOCK_APP_ID,
          userId: MOCK_USER_ID,
          action: "APPLICATION_CREATED",
          entityType: "Application",
          outcome: "SUCCESS",
          startDate: "2024-01-01T00:00:00.000Z",
          endDate: "2024-12-31T23:59:59.999Z",
        }
      );
    });

    it("returns empty list when no logs match filters", async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs({
        applicationId: "non-existent-id",
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("does not pass undefined filter values to the repository", async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      await auditLogger.queryLogs({
        applicationId: undefined,
        userId: undefined,
        action: undefined,
      });

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        {}
      );
    });

    it("throws error when queryAuditLogs fails", async () => {
      mockQueryAuditLogs.mockRejectedValue(
        new Error("Database query failed")
      );

      await expect(
        auditLogger.queryLogs()
      ).rejects.toThrow("Failed to query audit logs: Database query failed");
    });
  });

  // -------------------------------------------------------------------------
  // queryLogs — pagination
  // -------------------------------------------------------------------------

  describe("queryLogs — pagination", () => {
    it("uses custom page and pageSize", async () => {
      const mockResult = {
        items: [buildMockAuditLog()],
        total: 50,
        page: 3,
        pageSize: 10,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs(
        {},
        { page: 3, pageSize: 10 }
      );

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          pageSize: 10,
        }),
        expect.any(Object)
      );
    });

    it("uses custom sortBy and sortOrder", async () => {
      const mockResult = {
        items: [buildMockAuditLog()],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      await auditLogger.queryLogs(
        {},
        { sortBy: "action", sortOrder: "asc" }
      );

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "action",
          sortOrder: "asc",
        }),
        expect.any(Object)
      );
    });

    it("defaults to page 1, pageSize 20, sortBy createdAt, sortOrder desc", async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      await auditLogger.queryLogs({}, {});

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        {
          page: 1,
          pageSize: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        {}
      );
    });

    it("correctly reports hasNextPage when more pages exist", async () => {
      const mockResult = {
        items: Array.from({ length: 10 }, (_, i) =>
          buildMockAuditLog({ id: `audit-${i}` })
        ),
        total: 25,
        page: 1,
        pageSize: 10,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs(
        {},
        { page: 1, pageSize: 10 }
      );

      expect(result.items).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it("correctly reports hasPreviousPage when on a later page", async () => {
      const mockResult = {
        items: [buildMockAuditLog()],
        total: 25,
        page: 2,
        pageSize: 10,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs(
        {},
        { page: 2, pageSize: 10 }
      );

      expect(result.page).toBe(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
    });

    it("correctly reports no next page on the last page", async () => {
      const mockResult = {
        items: [buildMockAuditLog()],
        total: 25,
        page: 3,
        pageSize: 10,
        totalPages: 3,
        hasNextPage: false,
        hasPreviousPage: true,
      };
      mockQueryAuditLogs.mockResolvedValue(mockResult);

      const result = await auditLogger.queryLogs(
        {},
        { page: 3, pageSize: 10 }
      );

      expect(result.page).toBe(3);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getById
  // -------------------------------------------------------------------------

  describe("getById", () => {
    it("returns an audit log entry by its UUID", async () => {
      const mockLog = buildMockAuditLog();
      mockGetAuditLogById.mockResolvedValue(mockLog);

      const result = await auditLogger.getById("audit-1");

      expect(result).toEqual(mockLog);
      expect(mockGetAuditLogById).toHaveBeenCalledWith("audit-1");
    });

    it("returns null when audit log is not found", async () => {
      mockGetAuditLogById.mockResolvedValue(null);

      const result = await auditLogger.getById("non-existent-id");

      expect(result).toBeNull();
    });

    it("throws error when getAuditLogById fails", async () => {
      mockGetAuditLogById.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        auditLogger.getById("audit-1")
      ).rejects.toThrow("Failed to retrieve audit log: Database error");
    });
  });

  // -------------------------------------------------------------------------
  // getByApplicationId
  // -------------------------------------------------------------------------

  describe("getByApplicationId", () => {
    it("returns all audit logs for an application", async () => {
      const mockLogs = [
        buildMockAuditLog({ id: "audit-1", action: "APPLICATION_CREATED" }),
        buildMockAuditLog({ id: "audit-2", action: "DOCUMENT_UPLOAD" }),
        buildMockAuditLog({ id: "audit-3", action: "EXTRACTION_COMPLETED" }),
      ];
      mockGetAuditLogsByApplicationId.mockResolvedValue(mockLogs);

      const result = await auditLogger.getByApplicationId(MOCK_APP_ID);

      expect(result).toHaveLength(3);
      expect(result[0].action).toBe("APPLICATION_CREATED");
      expect(result[1].action).toBe("DOCUMENT_UPLOAD");
      expect(result[2].action).toBe("EXTRACTION_COMPLETED");
      expect(mockGetAuditLogsByApplicationId).toHaveBeenCalledWith(MOCK_APP_ID);
    });

    it("returns empty array when no logs exist for the application", async () => {
      mockGetAuditLogsByApplicationId.mockResolvedValue([]);

      const result = await auditLogger.getByApplicationId("non-existent-id");

      expect(result).toHaveLength(0);
    });

    it("throws error when getAuditLogsByApplicationId fails", async () => {
      mockGetAuditLogsByApplicationId.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        auditLogger.getByApplicationId(MOCK_APP_ID)
      ).rejects.toThrow(
        `Failed to retrieve audit logs for application ${MOCK_APP_ID}: Database error`
      );
    });
  });

  // -------------------------------------------------------------------------
  // getByUserId
  // -------------------------------------------------------------------------

  describe("getByUserId", () => {
    it("returns all audit logs for a user", async () => {
      const mockLogs = [
        buildMockAuditLog({ id: "audit-1", action: "USER_LOGIN" }),
        buildMockAuditLog({ id: "audit-2", action: "APPLICATION_CREATED" }),
      ];
      mockGetAuditLogsByUserId.mockResolvedValue(mockLogs);

      const result = await auditLogger.getByUserId(MOCK_USER_ID);

      expect(result).toHaveLength(2);
      expect(mockGetAuditLogsByUserId).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it("returns empty array when no logs exist for the user", async () => {
      mockGetAuditLogsByUserId.mockResolvedValue([]);

      const result = await auditLogger.getByUserId("non-existent-user");

      expect(result).toHaveLength(0);
    });

    it("throws error when getAuditLogsByUserId fails", async () => {
      mockGetAuditLogsByUserId.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        auditLogger.getByUserId(MOCK_USER_ID)
      ).rejects.toThrow(
        `Failed to retrieve audit logs for user ${MOCK_USER_ID}: Database error`
      );
    });
  });

  // -------------------------------------------------------------------------
  // getCountByApplicationId
  // -------------------------------------------------------------------------

  describe("getCountByApplicationId", () => {
    it("returns the count of audit logs for an application", async () => {
      mockGetAuditLogCountByApplicationId.mockResolvedValue(15);

      const result = await auditLogger.getCountByApplicationId(MOCK_APP_ID);

      expect(result).toBe(15);
      expect(mockGetAuditLogCountByApplicationId).toHaveBeenCalledWith(
        MOCK_APP_ID
      );
    });

    it("returns 0 when no logs exist for the application", async () => {
      mockGetAuditLogCountByApplicationId.mockResolvedValue(0);

      const result = await auditLogger.getCountByApplicationId(
        "non-existent-id"
      );

      expect(result).toBe(0);
    });

    it("throws error when getAuditLogCountByApplicationId fails", async () => {
      mockGetAuditLogCountByApplicationId.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        auditLogger.getCountByApplicationId(MOCK_APP_ID)
      ).rejects.toThrow(
        `Failed to count audit logs for application ${MOCK_APP_ID}: Database error`
      );
    });
  });

  // -------------------------------------------------------------------------
  // getCountByAction
  // -------------------------------------------------------------------------

  describe("getCountByAction", () => {
    it("returns audit log counts grouped by action", async () => {
      const mockCounts = {
        APPLICATION_CREATED: 1,
        DOCUMENT_UPLOAD: 4,
        EXTRACTION_COMPLETED: 1,
        VALIDATION_COMPLETED: 1,
        RECOMMENDATION_GENERATED: 1,
      };
      mockGetAuditLogCountByAction.mockResolvedValue(mockCounts);

      const result = await auditLogger.getCountByAction(MOCK_APP_ID);

      expect(result).toEqual(mockCounts);
      expect(result.APPLICATION_CREATED).toBe(1);
      expect(result.DOCUMENT_UPLOAD).toBe(4);
      expect(mockGetAuditLogCountByAction).toHaveBeenCalledWith(MOCK_APP_ID);
    });

    it("returns empty object when no logs exist for the application", async () => {
      mockGetAuditLogCountByAction.mockResolvedValue({});

      const result = await auditLogger.getCountByAction("non-existent-id");

      expect(result).toEqual({});
    });

    it("throws error when getAuditLogCountByAction fails", async () => {
      mockGetAuditLogCountByAction.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        auditLogger.getCountByAction(MOCK_APP_ID)
      ).rejects.toThrow(
        `Failed to count audit logs by action for application ${MOCK_APP_ID}: Database error`
      );
    });
  });
});