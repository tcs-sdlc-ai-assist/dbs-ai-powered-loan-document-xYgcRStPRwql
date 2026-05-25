import {
  createApplication,
  getApplicationById,
  getApplicationByApplicationId,
  updateApplicantDetails,
  listApplications,
  getApplicationWithRelations,
} from "@/lib/repositories/application-repository";
import type {
  CreateApplicationInput,
  UpdateApplicantInput,
  ApplicationListFilters,
  ApplicationWithRelations,
} from "@/lib/repositories/application-repository";
import { applicationIntakeSchema, applicantDetailsSchema } from "@/lib/validation-schemas";
import type { ApplicationIntakeInput, ApplicantDetailsInput } from "@/lib/validation-schemas";
import statusTracker from "@/lib/services/status-service";
import auditLogger from "@/lib/services/audit-service";
import type { ApplicationStatusEnum, Prisma } from "@prisma/client";
import type { PaginatedResponse, PaginationParams } from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateApplicationServiceInput {
  applicantName: string;
  loanType: string;
  loanAmount: number;
  createdBy: string;
  ipAddress?: string | null;
}

export interface UpdateApplicantServiceInput {
  applicantName?: string;
  loanType?: string;
  loanAmount?: number;
  status?: ApplicationStatusEnum;
  updatedBy: string;
  ipAddress?: string | null;
}

export interface ApplicationServiceResult {
  success: boolean;
  application: Prisma.ApplicationGetPayload<object>;
}

// ---------------------------------------------------------------------------
// ApplicationService
// ---------------------------------------------------------------------------

class ApplicationService {
  /**
   * Creates a new loan application. Validates input via Zod, generates a
   * unique DBS-XXXX application ID, persists the Application record,
   * sets the initial DRAFT status via StatusService, and logs the action
   * via AuditService.
   */
  async createApplication(
    input: CreateApplicationServiceInput
  ): Promise<ApplicationServiceResult> {
    const { createdBy, ipAddress } = input;

    // Validate input using Zod schema
    const validationResult = applicationIntakeSchema.safeParse({
      applicantName: input.applicantName,
      loanType: input.loanType,
      loanAmount: input.loanAmount,
    });

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((e) => e.message)
        .join("; ");
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    const validated: ApplicationIntakeInput = validationResult.data;

    // Create the application record (generates unique DBS-XXXX ID internally)
    const createInput: CreateApplicationInput = {
      applicantName: validated.applicantName,
      loanType: validated.loanType,
      loanAmount: validated.loanAmount,
    };

    const application = await createApplication(createInput);

    // Set initial DRAFT status via StatusService
    try {
      await statusTracker.updateStatus({
        applicationId: application.id,
        newStatus: "SUBMITTED",
        changedBy: createdBy,
        comments: "Application created and submitted for processing",
        ipAddress: ipAddress ?? null,
      });
    } catch {
      // Application was created with DRAFT status by default in the repository.
      // If status update to SUBMITTED fails, the application remains in DRAFT.
      // We log this but do not fail the creation.
      console.error(
        `Failed to update initial status for application ${application.applicationId}`
      );
    }

    // Log the creation action via AuditService
    try {
      await auditLogger.logAction({
        userId: createdBy,
        applicationId: application.id,
        action: "APPLICATION_CREATED",
        entityType: "Application",
        entityId: application.id,
        details: {
          applicationId: application.applicationId,
          applicantName: validated.applicantName,
          loanType: validated.loanType,
          loanAmount: validated.loanAmount,
        },
        ipAddress: ipAddress ?? null,
        outcome: "SUCCESS",
      });
    } catch (error) {
      // Audit log failure should not block application creation
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log application creation audit: ${message}`);
    }

    // Re-fetch the application to get the latest state (including any status update)
    const updatedApplication = await getApplicationById(application.id);

    return {
      success: true,
      application: updatedApplication ?? application,
    };
  }

  /**
   * Updates applicant details on an existing application. Validates input
   * via Zod, persists the changes, and logs the update via AuditService.
   */
  async updateApplicant(
    applicationId: string,
    input: UpdateApplicantServiceInput
  ): Promise<ApplicationServiceResult> {
    const { updatedBy, ipAddress, ...updateFields } = input;

    // Verify the application exists
    const existingApplication = await getApplicationById(applicationId);

    if (!existingApplication) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Build the validation object using existing values as defaults
    const validationInput = {
      applicantName: updateFields.applicantName ?? existingApplication.applicantName,
      loanType: updateFields.loanType ?? existingApplication.loanType,
      loanAmount: updateFields.loanAmount ?? existingApplication.loanAmount,
      status: updateFields.status,
    };

    // Validate using Zod schema
    const validationResult = applicantDetailsSchema.safeParse(validationInput);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((e) => e.message)
        .join("; ");
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    const validated: ApplicantDetailsInput = validationResult.data;

    // Build the update input with only changed fields
    const updateInput: UpdateApplicantInput = {};

    if (updateFields.applicantName !== undefined) {
      updateInput.applicantName = validated.applicantName;
    }
    if (updateFields.loanType !== undefined) {
      updateInput.loanType = validated.loanType;
    }
    if (updateFields.loanAmount !== undefined) {
      updateInput.loanAmount = validated.loanAmount;
    }
    if (updateFields.status !== undefined) {
      updateInput.status = validated.status;
    }

    // Persist the update
    const updatedApplication = await updateApplicantDetails(
      applicationId,
      updateInput
    );

    // Log the update action via AuditService
    try {
      await auditLogger.logAction({
        userId: updatedBy,
        applicationId,
        action: "APPLICANT_DETAILS_UPDATED",
        entityType: "Application",
        entityId: applicationId,
        details: {
          applicationId: existingApplication.applicationId,
          previousValues: {
            applicantName: existingApplication.applicantName,
            loanType: existingApplication.loanType,
            loanAmount: existingApplication.loanAmount,
          },
          updatedValues: updateInput,
        },
        ipAddress: ipAddress ?? null,
        outcome: "SUCCESS",
      });
    } catch (error) {
      // Audit log failure should not block the update
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log applicant update audit: ${message}`);
    }

    return {
      success: true,
      application: updatedApplication,
    };
  }

  /**
   * Retrieves an application by its internal UUID (primary key).
   * Returns null if not found.
   */
  async getById(id: string) {
    const application = await getApplicationById(id);
    return application;
  }

  /**
   * Retrieves an application by its human-readable application ID (e.g. DBS-1001).
   * Returns null if not found.
   */
  async getByApplicationId(applicationId: string) {
    const application = await getApplicationByApplicationId(applicationId);
    return application;
  }

  /**
   * Retrieves an application with all related entities (documents, extraction
   * results, discrepancies, recommendations, reviews, status history).
   * Returns null if not found.
   */
  async getWithRelations(id: string): Promise<ApplicationWithRelations | null> {
    const application = await getApplicationWithRelations(id);
    return application;
  }

  /**
   * Lists applications with pagination, optional status/loanType filtering,
   * and optional search by applicantName or applicationId.
   */
  async list(
    pagination: PaginationParams,
    filters?: ApplicationListFilters
  ): Promise<PaginatedResponse<Prisma.ApplicationGetPayload<object>>> {
    const result = await listApplications(pagination, filters);
    return result;
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

const applicationService = new ApplicationService();

export default applicationService;