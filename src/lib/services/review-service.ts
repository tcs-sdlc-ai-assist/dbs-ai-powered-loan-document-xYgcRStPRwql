import {
  createReview,
  createOverride,
  getReviewById,
  getReviewsByApplicationId,
  getLatestReview,
  getOverridesByApplicationId,
  listReviews,
  getReviewCountByApplicationId,
} from "@/lib/repositories/review-repository";
import type {
  CreateReviewInput,
  CreateOverrideInput,
  ReviewWithReviewer,
  ReviewWithRelations,
  ReviewListFilters,
} from "@/lib/repositories/review-repository";
import { getApplicationById } from "@/lib/repositories/application-repository";
import { getLatestRecommendation } from "@/lib/repositories/recommendation-repository";
import { reviewSubmitSchema, overrideSubmitSchema } from "@/lib/validation-schemas";
import type { ReviewSubmitInput, OverrideSubmitInput } from "@/lib/validation-schemas";
import statusTracker from "@/lib/services/status-service";
import auditLogger from "@/lib/services/audit-service";
import type { RecommendationType } from "@prisma/client";
import type { PaginatedResponse, PaginationParams } from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmitReviewInput {
  applicationId: string;
  comment: string;
  reviewedBy: string;
  ipAddress?: string | null;
}

export interface SubmitOverrideInput {
  applicationId: string;
  comment: string;
  overrideRecommendation: RecommendationType;
  justification: string;
  reviewedBy: string;
  ipAddress?: string | null;
}

export interface SubmitReviewResult {
  success: boolean;
  review: ReviewWithReviewer;
}

export interface SubmitOverrideResult {
  success: boolean;
  review: ReviewWithReviewer;
}

// ---------------------------------------------------------------------------
// AnalystReviewService
// ---------------------------------------------------------------------------

class AnalystReviewService {
  /**
   * Submits an analyst review (non-override) for an application.
   * Validates input via Zod, creates the AnalystReview record,
   * updates the application status if appropriate, and logs the
   * action via AuditService.
   *
   * @param input - The review submission parameters.
   * @returns A SubmitReviewResult with the created review.
   */
  async review(input: SubmitReviewInput): Promise<SubmitReviewResult> {
    const { applicationId, comment, reviewedBy, ipAddress } = input;

    // Verify the application exists
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Validate input using Zod schema
    const validationResult = reviewSubmitSchema.safeParse({
      applicationId,
      comment,
    });

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((e) => e.message)
        .join("; ");
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    const validated: ReviewSubmitInput = validationResult.data;

    // Create the review record
    const createInput: CreateReviewInput = {
      applicationId: validated.applicationId,
      comment: validated.comment,
      reviewedBy,
    };

    const review = await createReview(createInput);

    // Update application status to ANALYST_REVIEW if transition is allowed
    try {
      const currentApp = await getApplicationById(applicationId);
      if (currentApp) {
        const isAllowed = statusTracker.isTransitionAllowed(
          currentApp.status,
          "ANALYST_REVIEW"
        );
        if (isAllowed) {
          await statusTracker.updateStatus({
            applicationId,
            newStatus: "ANALYST_REVIEW",
            changedBy: reviewedBy,
            comments: `Analyst review submitted`,
            ipAddress: ipAddress ?? null,
          });
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to update status to ANALYST_REVIEW: ${message}`);
    }

    // Log the review action via AuditService
    try {
      await auditLogger.logAction({
        userId: reviewedBy,
        applicationId,
        action: "ANALYST_REVIEW_SUBMITTED",
        entityType: "AnalystReview",
        entityId: review.id,
        details: {
          applicationId: application.applicationId,
          comment: validated.comment,
          isOverride: false,
        },
        ipAddress: ipAddress ?? null,
        outcome: "SUCCESS",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log analyst review audit: ${message}`);
    }

    return {
      success: true,
      review,
    };
  }

  /**
   * Submits an analyst override for an application's recommendation.
   * Validates that justification is provided, creates the override
   * AnalystReview record, updates the application status, and logs
   * the action via AuditService.
   *
   * @param input - The override submission parameters.
   * @returns A SubmitOverrideResult with the created override review.
   */
  async override(input: SubmitOverrideInput): Promise<SubmitOverrideResult> {
    const {
      applicationId,
      comment,
      overrideRecommendation,
      justification,
      reviewedBy,
      ipAddress,
    } = input;

    // Verify the application exists
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Validate input using Zod schema
    const validationResult = overrideSubmitSchema.safeParse({
      applicationId,
      comment,
      overrideRecommendation,
      justification,
    });

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((e) => e.message)
        .join("; ");
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    const validated: OverrideSubmitInput = validationResult.data;

    // Additional explicit check for justification
    if (!validated.justification || validated.justification.trim().length === 0) {
      throw new Error("Justification is required when overriding a recommendation");
    }

    // Fetch the latest recommendation for context
    const latestRecommendation = await getLatestRecommendation(applicationId);

    // Create the override record
    const createInput: CreateOverrideInput = {
      applicationId: validated.applicationId,
      comment: validated.comment,
      overrideRecommendation: validated.overrideRecommendation,
      justification: validated.justification,
      reviewedBy,
    };

    const review = await createOverride(createInput);

    // Determine the target status based on the override recommendation
    let targetStatus: "APPROVED" | "REJECTED" | "ANALYST_REVIEW" | null = null;

    if (validated.overrideRecommendation === "APPROVE") {
      targetStatus = "APPROVED";
    } else if (validated.overrideRecommendation === "REJECT") {
      targetStatus = "REJECTED";
    } else if (
      validated.overrideRecommendation === "REFER_TO_ANALYST" ||
      validated.overrideRecommendation === "REQUEST_MORE_INFO"
    ) {
      targetStatus = "ANALYST_REVIEW";
    }

    // Update application status based on override recommendation
    if (targetStatus) {
      try {
        const currentApp = await getApplicationById(applicationId);
        if (currentApp) {
          const isAllowed = statusTracker.isTransitionAllowed(
            currentApp.status,
            targetStatus
          );
          if (isAllowed) {
            await statusTracker.updateStatus({
              applicationId,
              newStatus: targetStatus,
              changedBy: reviewedBy,
              comments: `Override applied: ${validated.overrideRecommendation}. Justification: ${validated.justification}`,
              ipAddress: ipAddress ?? null,
            });
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `Failed to update status after override to ${targetStatus}: ${message}`
        );
      }
    }

    // Log the override action via AuditService
    try {
      await auditLogger.logAction({
        userId: reviewedBy,
        applicationId,
        action: "RECOMMENDATION_OVERRIDE",
        entityType: "AnalystReview",
        entityId: review.id,
        details: {
          applicationId: application.applicationId,
          comment: validated.comment,
          isOverride: true,
          overrideRecommendation: validated.overrideRecommendation,
          justification: validated.justification,
          previousRecommendation: latestRecommendation?.recommendation ?? null,
          previousConfidence: latestRecommendation?.confidence ?? null,
        },
        ipAddress: ipAddress ?? null,
        outcome: "SUCCESS",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log recommendation override audit: ${message}`);
    }

    return {
      success: true,
      review,
    };
  }

  /**
   * Retrieves a single analyst review by its internal UUID (primary key).
   * Returns null if not found.
   */
  async getById(id: string): Promise<ReviewWithRelations | null> {
    const review = await getReviewById(id);
    return review ?? null;
  }

  /**
   * Retrieves all analyst reviews for a given application,
   * ordered by creation date descending.
   */
  async getByApplicationId(
    applicationId: string
  ): Promise<ReviewWithReviewer[]> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const reviews = await getReviewsByApplicationId(applicationId);
    return reviews;
  }

  /**
   * Retrieves the most recent analyst review for a given application.
   * Returns null if no review exists.
   */
  async getLatest(
    applicationId: string
  ): Promise<ReviewWithReviewer | null> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const review = await getLatestReview(applicationId);
    return review;
  }

  /**
   * Retrieves all override reviews for a given application,
   * ordered by creation date descending.
   */
  async getOverrides(
    applicationId: string
  ): Promise<ReviewWithReviewer[]> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const overrides = await getOverridesByApplicationId(applicationId);
    return overrides;
  }

  /**
   * Lists analyst reviews with pagination and optional filtering
   * by applicationId, reviewedBy user, or override status.
   */
  async list(
    pagination: PaginationParams,
    filters?: ReviewListFilters
  ): Promise<PaginatedResponse<ReviewWithReviewer>> {
    const result = await listReviews(pagination, filters);
    return result;
  }

  /**
   * Returns the count of reviews for a given application,
   * optionally filtered by override status.
   */
  async getCount(
    applicationId: string,
    isOverride?: boolean
  ): Promise<number> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const count = await getReviewCountByApplicationId(applicationId, isOverride);
    return count;
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

const analystReviewService = new AnalystReviewService();

export default analystReviewService;