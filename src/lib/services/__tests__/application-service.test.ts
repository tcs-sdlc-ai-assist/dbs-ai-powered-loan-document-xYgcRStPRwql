import applicationService from "@/lib/services/application-service";
import type { ApplicationStatusEnum } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateApplication = jest.fn();
const mockGetApplicationById = jest.fn();
const mockGetApplicationByApplicationId = jest.fn();
const mockUpdateApplicantDetails = jest.fn();
const mockListApplications = jest.fn();
const mockGetApplicationWithRelations = jest.fn();

jest.mock("@/lib/repositories/application-repository", () => ({
  createApplication: (...args: unknown[]) => mockCreateApplication(...args),
  getApplicationById: (...args: unknown[]) => mockGetApplicationById(...args),
  getApplicationByApplicationId: (...args: unknown[]) =>
    mockGetApplicationByApplicationId(...args),
  updateApplicantDetails: (...args: unknown[]) =>
    mockUpdateApplicantDetails(...args),
  listApplications: (...args: unknown[]) => mockListApplications(...args),
  getApplicationWithRelations: (...args: unknown[]) =>
    mockGetApplicationWithRelations(...args),
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
// Test Data
// ---------------------------------------------------------------------------

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_IP = "192.168.1.100";

function buildMockApplication(overrides?: Partial<{
  id: string;
  applicationId: string;
  applicantName: string;
  loanType: string;
  loanAmount: number;
  status: ApplicationStatusEnum;
  createdAt: Date;
  updatedAt: Date;
}>) {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ApplicationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // createApplication
  // -------------------------------------------------------------------------

  describe("createApplication", () => {
    it("creates an application with a unique DBS-XXXX ID and returns it", async () => {
      const mockApp = buildMockApplication();

      mockCreateApplication.mockResolvedValue(mockApp);
      mockUpdateStatus.mockResolvedValue({
        success: true,
        currentStatus: "SUBMITTED",
        previousStatus: "DRAFT",
        statusEntry: {
          id: "status-1",
          applicationId: mockApp.id,
          status: "SUBMITTED",
          previousStatus: "DRAFT",
          changedBy: MOCK_USER_ID,
          comments: "Application created and submitted for processing",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mockLogAction.mockResolvedValue({
        id: "audit-1",
        action: "APPLICATION_CREATED",
      });
      mockGetApplicationById.mockResolvedValue({
        ...mockApp,
        status: "SUBMITTED",
      });

      const result = await applicationService.createApplication({
        applicantName: "Test User",
        loanType: "Personal Loan",
        loanAmount: 50000,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.application).toBeDefined();
      expect(result.application.applicantName).toBe("Test User");
      expect(result.application.loanType).toBe("Personal Loan");
      expect(result.application.loanAmount).toBe(50000);

      expect(mockCreateApplication).toHaveBeenCalledTimes(1);
      expect(mockCreateApplication).toHaveBeenCalledWith({
        applicantName: "Test User",
        loanType: "Personal Loan",
        loanAmount: 50000,
      });
    });

    it("sets initial status to SUBMITTED via StatusService", async () => {
      const mockApp = buildMockApplication();

      mockCreateApplication.mockResolvedValue(mockApp);
      mockUpdateStatus.mockResolvedValue({
        success: true,
        currentStatus: "SUBMITTED",
        previousStatus: "DRAFT",
        statusEntry: {
          id: "status-1",
          applicationId: mockApp.id,
          status: "SUBMITTED",
          previousStatus: "DRAFT",
          changedBy: MOCK_USER_ID,
          comments: "Application created and submitted for processing",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mockLogAction.mockResolvedValue({ id: "audit-1" });
      mockGetApplicationById.mockResolvedValue({
        ...mockApp,
        status: "SUBMITTED",
      });

      await applicationService.createApplication({
        applicantName: "Test User",
        loanType: "Personal Loan",
        loanAmount: 50000,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: mockApp.id,
          newStatus: "SUBMITTED",
          changedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      );
    });

    it("logs the creation action via AuditService", async () => {
      const mockApp = buildMockApplication();

      mockCreateApplication.mockResolvedValue(mockApp);
      mockUpdateStatus.mockResolvedValue({
        success: true,
        currentStatus: "SUBMITTED",
        previousStatus: "DRAFT",
        statusEntry: { id: "status-1" },
      });
      mockLogAction.mockResolvedValue({ id: "audit-1" });
      mockGetApplicationById.mockResolvedValue({
        ...mockApp,
        status: "SUBMITTED",
      });

      await applicationService.createApplication({
        applicantName: "Test User",
        loanType: "Personal Loan",
        loanAmount: 50000,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          applicationId: mockApp.id,
          action: "APPLICATION_CREATED",
          entityType: "Application",
          entityId: mockApp.id,
          ipAddress: MOCK_IP,
          outcome: "SUCCESS",
        })
      );
    });

    it("throws validation error when applicantName is empty", async () => {
      await expect(
        applicationService.createApplication({
          applicantName: "",
          loanType: "Personal Loan",
          loanAmount: 50000,
          createdBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockCreateApplication).not.toHaveBeenCalled();
    });

    it("throws validation error when applicantName is too short", async () => {
      await expect(
        applicationService.createApplication({
          applicantName: "A",
          loanType: "Personal Loan",
          loanAmount: 50000,
          createdBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockCreateApplication).not.toHaveBeenCalled();
    });

    it("throws validation error when loanType is invalid", async () => {
      await expect(
        applicationService.createApplication({
          applicantName: "Test User",
          loanType: "Invalid Loan Type",
          loanAmount: 50000,
          createdBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockCreateApplication).not.toHaveBeenCalled();
    });

    it("throws validation error when loanAmount is below minimum", async () => {
      await expect(
        applicationService.createApplication({
          applicantName: "Test User",
          loanType: "Personal Loan",
          loanAmount: 100,
          createdBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockCreateApplication).not.toHaveBeenCalled();
    });

    it("throws validation error when loanAmount exceeds maximum", async () => {
      await expect(
        applicationService.createApplication({
          applicantName: "Test User",
          loanType: "Personal Loan",
          loanAmount: 99999999,
          createdBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockCreateApplication).not.toHaveBeenCalled();
    });

    it("still succeeds if status update fails (application remains in DRAFT)", async () => {
      const mockApp = buildMockApplication();

      mockCreateApplication.mockResolvedValue(mockApp);
      mockUpdateStatus.mockRejectedValue(new Error("Status update failed"));
      mockLogAction.mockResolvedValue({ id: "audit-1" });
      mockGetApplicationById.mockResolvedValue(mockApp);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await applicationService.createApplication({
        applicantName: "Test User",
        loanType: "Personal Loan",
        loanAmount: 50000,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.application.status).toBe("DRAFT");

      consoleSpy.mockRestore();
    });

    it("still succeeds if audit log fails", async () => {
      const mockApp = buildMockApplication();

      mockCreateApplication.mockResolvedValue(mockApp);
      mockUpdateStatus.mockResolvedValue({
        success: true,
        currentStatus: "SUBMITTED",
        previousStatus: "DRAFT",
        statusEntry: { id: "status-1" },
      });
      mockLogAction.mockRejectedValue(new Error("Audit log failed"));
      mockGetApplicationById.mockResolvedValue({
        ...mockApp,
        status: "SUBMITTED",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await applicationService.createApplication({
        applicantName: "Test User",
        loanType: "Personal Loan",
        loanAmount: 50000,
        createdBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });

    it("handles null ipAddress gracefully", async () => {
      const mockApp = buildMockApplication();

      mockCreateApplication.mockResolvedValue(mockApp);
      mockUpdateStatus.mockResolvedValue({
        success: true,
        currentStatus: "SUBMITTED",
        previousStatus: "DRAFT",
        statusEntry: { id: "status-1" },
      });
      mockLogAction.mockResolvedValue({ id: "audit-1" });
      mockGetApplicationById.mockResolvedValue({
        ...mockApp,
        status: "SUBMITTED",
      });

      const result = await applicationService.createApplication({
        applicantName: "Test User",
        loanType: "Home Loan",
        loanAmount: 500000,
        createdBy: MOCK_USER_ID,
      });

      expect(result.success).toBe(true);

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateApplicant
  // -------------------------------------------------------------------------

  describe("updateApplicant", () => {
    it("validates and persists applicant name change", async () => {
      const existingApp = buildMockApplication();
      const updatedApp = buildMockApplication({
        applicantName: "Updated Name",
      });

      mockGetApplicationById.mockResolvedValue(existingApp);
      mockUpdateApplicantDetails.mockResolvedValue(updatedApp);
      mockLogAction.mockResolvedValue({ id: "audit-1" });

      const result = await applicationService.updateApplicant(existingApp.id, {
        applicantName: "Updated Name",
        updatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.application.applicantName).toBe("Updated Name");

      expect(mockUpdateApplicantDetails).toHaveBeenCalledTimes(1);
      expect(mockUpdateApplicantDetails).toHaveBeenCalledWith(
        existingApp.id,
        expect.objectContaining({
          applicantName: "Updated Name",
        })
      );
    });

    it("validates and persists loan amount change", async () => {
      const existingApp = buildMockApplication();
      const updatedApp = buildMockApplication({ loanAmount: 75000 });

      mockGetApplicationById.mockResolvedValue(existingApp);
      mockUpdateApplicantDetails.mockResolvedValue(updatedApp);
      mockLogAction.mockResolvedValue({ id: "audit-1" });

      const result = await applicationService.updateApplicant(existingApp.id, {
        loanAmount: 75000,
        updatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.application.loanAmount).toBe(75000);
    });

    it("validates and persists loan type change", async () => {
      const existingApp = buildMockApplication();
      const updatedApp = buildMockApplication({ loanType: "Home Loan" });

      mockGetApplicationById.mockResolvedValue(existingApp);
      mockUpdateApplicantDetails.mockResolvedValue(updatedApp);
      mockLogAction.mockResolvedValue({ id: "audit-1" });

      const result = await applicationService.updateApplicant(existingApp.id, {
        loanType: "Home Loan",
        updatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.application.loanType).toBe("Home Loan");
    });

    it("logs the update action via AuditService", async () => {
      const existingApp = buildMockApplication();
      const updatedApp = buildMockApplication({
        applicantName: "Updated Name",
      });

      mockGetApplicationById.mockResolvedValue(existingApp);
      mockUpdateApplicantDetails.mockResolvedValue(updatedApp);
      mockLogAction.mockResolvedValue({ id: "audit-1" });

      await applicationService.updateApplicant(existingApp.id, {
        applicantName: "Updated Name",
        updatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          applicationId: existingApp.id,
          action: "APPLICANT_DETAILS_UPDATED",
          entityType: "Application",
          entityId: existingApp.id,
          ipAddress: MOCK_IP,
          outcome: "SUCCESS",
        })
      );
    });

    it("throws error when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      await expect(
        applicationService.updateApplicant("non-existent-id", {
          applicantName: "Updated Name",
          updatedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Application not found: non-existent-id");

      expect(mockUpdateApplicantDetails).not.toHaveBeenCalled();
    });

    it("throws validation error for invalid loan type on update", async () => {
      const existingApp = buildMockApplication();

      mockGetApplicationById.mockResolvedValue(existingApp);

      await expect(
        applicationService.updateApplicant(existingApp.id, {
          loanType: "Invalid Loan Type",
          updatedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockUpdateApplicantDetails).not.toHaveBeenCalled();
    });

    it("throws validation error for loan amount below minimum on update", async () => {
      const existingApp = buildMockApplication();

      mockGetApplicationById.mockResolvedValue(existingApp);

      await expect(
        applicationService.updateApplicant(existingApp.id, {
          loanAmount: 500,
          updatedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockUpdateApplicantDetails).not.toHaveBeenCalled();
    });

    it("throws validation error for applicant name too short on update", async () => {
      const existingApp = buildMockApplication();

      mockGetApplicationById.mockResolvedValue(existingApp);

      await expect(
        applicationService.updateApplicant(existingApp.id, {
          applicantName: "A",
          updatedBy: MOCK_USER_ID,
          ipAddress: MOCK_IP,
        })
      ).rejects.toThrow("Validation failed");

      expect(mockUpdateApplicantDetails).not.toHaveBeenCalled();
    });

    it("uses existing values as defaults when partial update is provided", async () => {
      const existingApp = buildMockApplication({
        applicantName: "Original Name",
        loanType: "Personal Loan",
        loanAmount: 50000,
      });
      const updatedApp = buildMockApplication({
        applicantName: "Original Name",
        loanType: "Personal Loan",
        loanAmount: 75000,
      });

      mockGetApplicationById.mockResolvedValue(existingApp);
      mockUpdateApplicantDetails.mockResolvedValue(updatedApp);
      mockLogAction.mockResolvedValue({ id: "audit-1" });

      const result = await applicationService.updateApplicant(existingApp.id, {
        loanAmount: 75000,
        updatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);

      // Only loanAmount should be in the update input
      expect(mockUpdateApplicantDetails).toHaveBeenCalledWith(
        existingApp.id,
        expect.objectContaining({
          loanAmount: 75000,
        })
      );

      // applicantName and loanType should NOT be in the update input
      // since they were not provided in the input
      const updateCall = mockUpdateApplicantDetails.mock.calls[0][1];
      expect(updateCall.applicantName).toBeUndefined();
      expect(updateCall.loanType).toBeUndefined();
    });

    it("still succeeds if audit log fails during update", async () => {
      const existingApp = buildMockApplication();
      const updatedApp = buildMockApplication({
        applicantName: "Updated Name",
      });

      mockGetApplicationById.mockResolvedValue(existingApp);
      mockUpdateApplicantDetails.mockResolvedValue(updatedApp);
      mockLogAction.mockRejectedValue(new Error("Audit log failed"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await applicationService.updateApplicant(existingApp.id, {
        applicantName: "Updated Name",
        updatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.application.applicantName).toBe("Updated Name");

      consoleSpy.mockRestore();
    });

    it("can update status field", async () => {
      const existingApp = buildMockApplication();
      const updatedApp = buildMockApplication({
        status: "SUBMITTED" as ApplicationStatusEnum,
      });

      mockGetApplicationById.mockResolvedValue(existingApp);
      mockUpdateApplicantDetails.mockResolvedValue(updatedApp);
      mockLogAction.mockResolvedValue({ id: "audit-1" });

      const result = await applicationService.updateApplicant(existingApp.id, {
        status: "SUBMITTED" as ApplicationStatusEnum,
        updatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(mockUpdateApplicantDetails).toHaveBeenCalledWith(
        existingApp.id,
        expect.objectContaining({
          status: "SUBMITTED",
        })
      );
    });

    it("automatically transitions status to UNDER_REVIEW if currently SUBMITTED", async () => {
      const existingApp = buildMockApplication({ status: "SUBMITTED" });
      const updatedApp = buildMockApplication({
        applicantName: "Updated Name",
        status: "SUBMITTED",
      });
      const refreshedApp = buildMockApplication({
        applicantName: "Updated Name",
        status: "UNDER_REVIEW",
      });

      mockGetApplicationById
        .mockResolvedValueOnce(existingApp) // first call inside service
        .mockResolvedValueOnce(refreshedApp); // second call to refresh
      mockUpdateApplicantDetails.mockResolvedValue(updatedApp);
      mockUpdateStatus.mockResolvedValue({
        success: true,
        currentStatus: "UNDER_REVIEW",
      });
      mockLogAction.mockResolvedValue({ id: "audit-1" });

      const result = await applicationService.updateApplicant(existingApp.id, {
        applicantName: "Updated Name",
        updatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.application.status).toBe("UNDER_REVIEW");
      expect(mockUpdateStatus).toHaveBeenCalledWith({
        applicationId: existingApp.id,
        newStatus: "UNDER_REVIEW",
        changedBy: MOCK_USER_ID,
        comments: "Applicant details completed, transitioning to review",
        ipAddress: MOCK_IP,
      });
    });

    it("automatically transitions status to UNDER_REVIEW if currently RETURNED", async () => {
      const existingApp = buildMockApplication({ status: "RETURNED" });
      const updatedApp = buildMockApplication({
        applicantName: "Updated Name",
        status: "RETURNED",
      });
      const refreshedApp = buildMockApplication({
        applicantName: "Updated Name",
        status: "UNDER_REVIEW",
      });

      mockGetApplicationById
        .mockResolvedValueOnce(existingApp)
        .mockResolvedValueOnce(refreshedApp);
      mockUpdateApplicantDetails.mockResolvedValue(updatedApp);
      mockUpdateStatus.mockResolvedValue({
        success: true,
        currentStatus: "UNDER_REVIEW",
      });
      mockLogAction.mockResolvedValue({ id: "audit-1" });

      const result = await applicationService.updateApplicant(existingApp.id, {
        applicantName: "Updated Name",
        updatedBy: MOCK_USER_ID,
        ipAddress: MOCK_IP,
      });

      expect(result.success).toBe(true);
      expect(result.application.status).toBe("UNDER_REVIEW");
    });
  });

  // -------------------------------------------------------------------------
  // getById
  // -------------------------------------------------------------------------

  describe("getById", () => {
    it("returns application when found by UUID", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationById.mockResolvedValue(mockApp);

      const result = await applicationService.getById(mockApp.id);

      expect(result).toEqual(mockApp);
      expect(mockGetApplicationById).toHaveBeenCalledWith(mockApp.id);
    });

    it("returns null when application is not found", async () => {
      mockGetApplicationById.mockResolvedValue(null);

      const result = await applicationService.getById("non-existent-id");

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getByApplicationId
  // -------------------------------------------------------------------------

  describe("getByApplicationId", () => {
    it("returns application when found by human-readable ID", async () => {
      const mockApp = buildMockApplication();
      mockGetApplicationByApplicationId.mockResolvedValue(mockApp);

      const result = await applicationService.getByApplicationId("DBS-1234");

      expect(result).toEqual(mockApp);
      expect(mockGetApplicationByApplicationId).toHaveBeenCalledWith(
        "DBS-1234"
      );
    });

    it("returns null when application is not found by human-readable ID", async () => {
      mockGetApplicationByApplicationId.mockResolvedValue(null);

      const result =
        await applicationService.getByApplicationId("DBS-9999");

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getWithRelations
  // -------------------------------------------------------------------------

  describe("getWithRelations", () => {
    it("returns application with all relations", async () => {
      const mockApp = {
        ...buildMockApplication(),
        documents: [],
        validationDiscrepancies: [],
        recommendations: [],
        analystReviews: [],
        applicationStatusHistory: [],
      };
      mockGetApplicationWithRelations.mockResolvedValue(mockApp);

      const result = await applicationService.getWithRelations(mockApp.id);

      expect(result).toEqual(mockApp);
      expect(mockGetApplicationWithRelations).toHaveBeenCalledWith(mockApp.id);
    });

    it("returns null when application with relations is not found", async () => {
      mockGetApplicationWithRelations.mockResolvedValue(null);

      const result =
        await applicationService.getWithRelations("non-existent-id");

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe("list", () => {
    it("returns paginated list of applications", async () => {
      const mockResult = {
        items: [buildMockApplication()],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockListApplications.mockResolvedValue(mockResult);

      const result = await applicationService.list(
        { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" },
        { status: "DRAFT" as ApplicationStatusEnum }
      );

      expect(result).toEqual(mockResult);
      expect(mockListApplications).toHaveBeenCalledWith(
        { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" },
        { status: "DRAFT" }
      );
    });

    it("returns empty list when no applications match filters", async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockListApplications.mockResolvedValue(mockResult);

      const result = await applicationService.list(
        { page: 1, pageSize: 20 },
        { search: "nonexistent" }
      );

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});