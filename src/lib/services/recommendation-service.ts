import {
  createRecommendation,
  getRecommendationsByApplicationId,
  getLatestRecommendation,
  getRecommendationById,
  listRecommendations,
  getRecommendationCountByType,
} from "@/lib/repositories/recommendation-repository";
import type {
  CreateRecommendationInput,
  RecommendationWithUser,
  RecommendationWithRelations,
  RecommendationListFilters,
} from "@/lib/repositories/recommendation-repository";
import {
  getApplicationById,
  getApplicationWithRelations,
} from "@/lib/repositories/application-repository";
import { getDocumentsByApplicationId } from "@/lib/repositories/document-repository";
import { getExtractionsByApplicationId } from "@/lib/repositories/extraction-repository";
import type { ExtractionResultWithDocument } from "@/lib/repositories/extraction-repository";
import {
  getDiscrepanciesByApplicationId,
  getUnresolvedDiscrepancies,
  getDiscrepancyCountBySeverity,
} from "@/lib/repositories/discrepancy-repository";
import statusTracker from "@/lib/services/status-service";
import auditLogger from "@/lib/services/audit-service";
import { VALIDATION_RULES, DOCUMENT_TYPES } from "@/lib/constants";
import type {
  RecommendationType,
  DiscrepancySeverity,
  DocumentType,
} from "@prisma/client";
import type { PaginatedResponse, PaginationParams } from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerateRecommendationInput {
  applicationId: string;
  createdBy: string;
  ipAddress?: string | null;
}

export interface GenerateRecommendationResult {
  success: boolean;
  recommendation: RecommendationWithUser;
  details: RecommendationDetails;
}

export interface RecommendationDetails {
  applicationId: string;
  recommendation: RecommendationType;
  rationale: string;
  confidence: number;
  completenessScore: number;
  averageExtractionConfidence: number;
  discrepancySummary: DiscrepancySummary;
  extractionSummary: ExtractionSummary;
}

export interface DiscrepancySummary {
  total: number;
  unresolved: number;
  bySeverity: Record<DiscrepancySeverity, number>;
}

export interface ExtractionSummary {
  totalDocuments: number;
  completedExtractions: number;
  averageConfidence: number;
  belowThreshold: number;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function getRequiredDocumentTypes(): DocumentType[] {
  const required: DocumentType[] = [];
  for (const [key, config] of Object.entries(DOCUMENT_TYPES)) {
    if (config.required) {
      required.push(key as DocumentType);
    }
  }
  return required;
}

function calculateCompletenessScore(
  uploadedTypes: Set<DocumentType>,
  requiredTypes: DocumentType[]
): number {
  if (requiredTypes.length === 0) return 100;
  const uploadedRequired = requiredTypes.filter((t) => uploadedTypes.has(t)).length;
  return Math.round((uploadedRequired / requiredTypes.length) * 100);
}

function buildRationale(
  recommendation: RecommendationType,
  completenessScore: number,
  averageConfidence: number,
  discrepancySummary: DiscrepancySummary,
  extractionSummary: ExtractionSummary,
  missingDocTypes: DocumentType[]
): string {
  const parts: string[] = [];

  switch (recommendation) {
    case "APPROVE": {
      parts.push(
        "All document validations passed within acceptable thresholds."
      );
      parts.push(
        `Document completeness: ${completenessScore}%. Average extraction confidence: ${(averageConfidence * 100).toFixed(1)}%.`
      );
      if (discrepancySummary.total === 0) {
        parts.push("No discrepancies were found during cross-validation.");
      } else {
        parts.push(
          `${discrepancySummary.total} discrepancy(ies) found, all resolved or within acceptable limits.`
        );
      }
      parts.push(
        "Recommendation: Approve. All checks passed and data is consistent across documents."
      );
      break;
    }
    case "REJECT": {
      parts.push(
        "Critical issues detected that prevent approval of this application."
      );
      if (discrepancySummary.bySeverity.CRITICAL > 0) {
        parts.push(
          `${discrepancySummary.bySeverity.CRITICAL} critical discrepancy(ies) found, exceeding the maximum threshold of ${VALIDATION_RULES.maxCriticalDiscrepancies}.`
        );
      }
      if (completenessScore < 100 && missingDocTypes.length > 0) {
        const labels = missingDocTypes.map(
          (t) => DOCUMENT_TYPES[t]?.label ?? t
        );
        parts.push(
          `Missing required documents: ${labels.join(", ")}. Completeness: ${completenessScore}%.`
        );
      }
      if (averageConfidence < VALIDATION_RULES.minExtractionConfidence) {
        parts.push(
          `Average extraction confidence (${(averageConfidence * 100).toFixed(1)}%) is below the minimum threshold of ${(VALIDATION_RULES.minExtractionConfidence * 100).toFixed(1)}%.`
        );
      }
      parts.push(
        "Recommendation: Reject. Critical issues must be resolved before this application can proceed."
      );
      break;
    }
    case "REFER_TO_ANALYST": {
      parts.push(
        "Issues detected that require analyst review before a final decision can be made."
      );
      if (discrepancySummary.unresolved > 0) {
        parts.push(
          `${discrepancySummary.unresolved} unresolved discrepancy(ies) found.`
        );
        if (discrepancySummary.bySeverity.HIGH > 0) {
          parts.push(
            `${discrepancySummary.bySeverity.HIGH} high-severity discrepancy(ies) detected.`
          );
        }
        if (discrepancySummary.bySeverity.MEDIUM > 0) {
          parts.push(
            `${discrepancySummary.bySeverity.MEDIUM} medium-severity discrepancy(ies) detected.`
          );
        }
      }
      if (extractionSummary.belowThreshold > 0) {
        parts.push(
          `${extractionSummary.belowThreshold} document(s) have extraction confidence below the ${(VALIDATION_RULES.minExtractionConfidence * 100).toFixed(1)}% threshold.`
        );
      }
      parts.push(
        `Average extraction confidence: ${(averageConfidence * 100).toFixed(1)}%. Document completeness: ${completenessScore}%.`
      );
      parts.push(
        "Recommendation: Refer to analyst for manual review and verification."
      );
      break;
    }
    case "REQUEST_MORE_INFO": {
      parts.push(
        "Insufficient information to make a recommendation. Additional documents or data are required."
      );
      if (missingDocTypes.length > 0) {
        const labels = missingDocTypes.map(
          (t) => DOCUMENT_TYPES[t]?.label ?? t
        );
        parts.push(
          `Missing required documents: ${labels.join(", ")}.`
        );
      }
      parts.push(
        `Document completeness: ${completenessScore}%. ${extractionSummary.completedExtractions} of ${extractionSummary.totalDocuments} document(s) have completed extraction.`
      );
      parts.push(
        "Recommendation: Request more information from the applicant before proceeding."
      );
      break;
    }
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// RecommendationEngine
// ---------------------------------------------------------------------------

class RecommendationEngine {
  /**
   * Generates a recommendation for a loan application based on extraction
   * results, validation discrepancies, and business rules. The recommendation
   * is one of: APPROVE, REJECT, REFER_TO_ANALYST, or REQUEST_MORE_INFO.
   *
   * Business rules applied:
   * - Completeness: all required document types must be uploaded.
   * - Extraction confidence: average confidence must meet the minimum threshold.
   * - Discrepancy severity: critical discrepancies trigger rejection,
   *   high/medium discrepancies trigger analyst referral.
   * - If insufficient data is available, requests more information.
   *
   * Integrates with StatusService (updates to RECOMMENDATION_GENERATED)
   * and AuditService (logs the generation action).
   */
  async generate(
    input: GenerateRecommendationInput
  ): Promise<GenerateRecommendationResult> {
    const { applicationId, createdBy, ipAddress } = input;

    // Verify the application exists
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Fetch documents
    const documents = await getDocumentsByApplicationId(applicationId);

    // Fetch extraction results
    const extractions = await getExtractionsByApplicationId(applicationId);

    // Fetch all discrepancies
    const allDiscrepancies = await getDiscrepanciesByApplicationId(applicationId);

    // Fetch unresolved discrepancies
    const unresolvedDiscrepancies = await getUnresolvedDiscrepancies(applicationId);

    // Fetch discrepancy counts by severity (unresolved only)
    const severityCounts = await getDiscrepancyCountBySeverity(applicationId);

    // ---------------------------------------------------------------------------
    // Calculate metrics
    // ---------------------------------------------------------------------------

    // Completeness
    const requiredDocTypes = getRequiredDocumentTypes();
    const uploadedDocTypes = new Set<DocumentType>(documents.map((d) => d.type));
    const completenessScore = calculateCompletenessScore(
      uploadedDocTypes,
      requiredDocTypes
    );
    const missingDocTypes = requiredDocTypes.filter(
      (t) => !uploadedDocTypes.has(t)
    );

    // Extraction summary
    const completedExtractions = extractions.filter(
      (e) => e.status === "COMPLETED" || e.status === "PARTIALLY_COMPLETED"
    );
    const confidenceScores = completedExtractions.map((e) => e.confidence);
    const averageConfidence =
      confidenceScores.length > 0
        ? Math.round(
            (confidenceScores.reduce((sum, c) => sum + c, 0) /
              confidenceScores.length) *
              100
          ) / 100
        : 0;
    const belowThreshold = completedExtractions.filter(
      (e) => e.confidence < VALIDATION_RULES.minExtractionConfidence
    ).length;

    const extractionSummary: ExtractionSummary = {
      totalDocuments: documents.length,
      completedExtractions: completedExtractions.length,
      averageConfidence,
      belowThreshold,
    };

    const discrepancySummary: DiscrepancySummary = {
      total: allDiscrepancies.length,
      unresolved: unresolvedDiscrepancies.length,
      bySeverity: severityCounts,
    };

    // ---------------------------------------------------------------------------
    // Apply business rules to determine recommendation
    // ---------------------------------------------------------------------------

    let recommendation: RecommendationType;
    let confidence: number;

    // Rule 1: Insufficient data — request more info
    if (documents.length === 0 || completedExtractions.length === 0) {
      recommendation = "REQUEST_MORE_INFO";
      confidence = 0.95;
    }
    // Rule 2: Missing required documents and low completeness
    else if (
      completenessScore < 100 &&
      missingDocTypes.length >= VALIDATION_RULES.minRequiredDocuments
    ) {
      recommendation = "REQUEST_MORE_INFO";
      confidence = 0.90;
    }
    // Rule 3: Critical discrepancies exceed threshold — reject
    else if (severityCounts.CRITICAL > VALIDATION_RULES.maxCriticalDiscrepancies) {
      recommendation = "REJECT";
      confidence = 0.93;
    }
    // Rule 4: Average extraction confidence too low — reject
    else if (
      averageConfidence > 0 &&
      averageConfidence < VALIDATION_RULES.minExtractionConfidence * 0.7
    ) {
      recommendation = "REJECT";
      confidence = 0.85;
    }
    // Rule 5: High discrepancies exceed threshold — refer to analyst
    else if (severityCounts.HIGH > VALIDATION_RULES.maxHighDiscrepancies) {
      recommendation = "REFER_TO_ANALYST";
      confidence = 0.88;
    }
    // Rule 6: Any unresolved medium or high discrepancies — refer to analyst
    else if (severityCounts.MEDIUM > 0 || severityCounts.HIGH > 0) {
      recommendation = "REFER_TO_ANALYST";
      confidence = 0.82;
    }
    // Rule 7: Some documents below extraction confidence threshold — refer to analyst
    else if (belowThreshold > 0) {
      recommendation = "REFER_TO_ANALYST";
      confidence = 0.80;
    }
    // Rule 8: Missing some required documents but not critically — refer to analyst
    else if (completenessScore < 100) {
      recommendation = "REFER_TO_ANALYST";
      confidence = 0.78;
    }
    // Rule 9: All checks passed — approve
    else {
      recommendation = "APPROVE";
      // Confidence based on average extraction confidence and discrepancy profile
      const baseConfidence = averageConfidence;
      const discrepancyPenalty =
        allDiscrepancies.length > 0
          ? Math.min(0.05 * allDiscrepancies.length, 0.15)
          : 0;
      confidence = Math.round(Math.max(0.7, baseConfidence - discrepancyPenalty) * 100) / 100;

      // If confidence is below auto-accept threshold, refer to analyst instead
      if (confidence < VALIDATION_RULES.minRecommendationConfidence) {
        recommendation = "REFER_TO_ANALYST";
      }
    }

    // Build rationale
    const rationale = buildRationale(
      recommendation,
      completenessScore,
      averageConfidence,
      discrepancySummary,
      extractionSummary,
      missingDocTypes
    );

    // ---------------------------------------------------------------------------
    // Persist the recommendation
    // ---------------------------------------------------------------------------

    const createInput: CreateRecommendationInput = {
      applicationId,
      recommendation,
      rationale,
      confidence,
      createdBy,
    };

    const savedRecommendation = await createRecommendation(createInput);

    // ---------------------------------------------------------------------------
    // Update application status to RECOMMENDATION_GENERATED
    // ---------------------------------------------------------------------------

    try {
      const currentApp = await getApplicationById(applicationId);
      if (currentApp) {
        const isAllowed = statusTracker.isTransitionAllowed(
          currentApp.status,
          "RECOMMENDATION_GENERATED"
        );
        if (isAllowed) {
          await statusTracker.updateStatus({
            applicationId,
            newStatus: "RECOMMENDATION_GENERATED",
            changedBy: createdBy,
            comments: `AI recommendation generated: ${recommendation} (confidence: ${(confidence * 100).toFixed(1)}%)`,
            ipAddress: ipAddress ?? null,
          });
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to update status to RECOMMENDATION_GENERATED: ${message}`
      );
    }

    // If recommendation is REFER_TO_ANALYST, also transition to ANALYST_REVIEW
    if (recommendation === "REFER_TO_ANALYST") {
      try {
        const currentApp = await getApplicationById(applicationId);
        if (currentApp && currentApp.status === "RECOMMENDATION_GENERATED") {
          const isAllowed = statusTracker.isTransitionAllowed(
            currentApp.status,
            "ANALYST_REVIEW"
          );
          if (isAllowed) {
            await statusTracker.updateStatus({
              applicationId,
              newStatus: "ANALYST_REVIEW",
              changedBy: createdBy,
              comments: "Referred to analyst for manual review",
              ipAddress: ipAddress ?? null,
            });
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `Failed to update status to ANALYST_REVIEW: ${message}`
        );
      }
    }

    // ---------------------------------------------------------------------------
    // Log the recommendation generation via AuditService
    // ---------------------------------------------------------------------------

    try {
      await auditLogger.logAction({
        userId: createdBy,
        applicationId,
        action: "RECOMMENDATION_GENERATED",
        entityType: "Recommendation",
        entityId: savedRecommendation.id,
        details: {
          recommendation,
          confidence,
          completenessScore,
          averageExtractionConfidence: averageConfidence,
          totalDiscrepancies: allDiscrepancies.length,
          unresolvedDiscrepancies: unresolvedDiscrepancies.length,
          criticalDiscrepancies: severityCounts.CRITICAL,
          highDiscrepancies: severityCounts.HIGH,
          mediumDiscrepancies: severityCounts.MEDIUM,
          lowDiscrepancies: severityCounts.LOW,
        },
        ipAddress: ipAddress ?? null,
        outcome: "SUCCESS",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to log recommendation generation audit: ${message}`
      );
    }

    const details: RecommendationDetails = {
      applicationId,
      recommendation,
      rationale,
      confidence,
      completenessScore,
      averageExtractionConfidence: averageConfidence,
      discrepancySummary,
      extractionSummary,
    };

    return {
      success: true,
      recommendation: savedRecommendation,
      details,
    };
  }

  /**
   * Retrieves the latest recommendation for a given application.
   * Returns null if no recommendation exists.
   */
  async get(applicationId: string): Promise<RecommendationWithUser | null> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const recommendation = await getLatestRecommendation(applicationId);
    return recommendation;
  }

  /**
   * Retrieves all recommendations for a given application,
   * ordered by creation date descending.
   */
  async getAllByApplicationId(
    applicationId: string
  ): Promise<RecommendationWithUser[]> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const recommendations = await getRecommendationsByApplicationId(applicationId);
    return recommendations;
  }

  /**
   * Retrieves a recommendation by its internal UUID (primary key).
   * Returns null if not found.
   */
  async getById(id: string): Promise<RecommendationWithRelations | null> {
    const recommendation = await getRecommendationById(id);
    return recommendation ?? null;
  }

  /**
   * Lists recommendations with pagination and optional filtering.
   */
  async list(
    pagination: PaginationParams,
    filters?: RecommendationListFilters
  ): Promise<PaginatedResponse<RecommendationWithUser>> {
    const result = await listRecommendations(pagination, filters);
    return result;
  }

  /**
   * Returns the count of recommendations grouped by type for a given application.
   */
  async getCountByType(
    applicationId: string
  ): Promise<Record<RecommendationType, number>> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const counts = await getRecommendationCountByType(applicationId);
    return counts;
  }

  /**
   * Evaluates whether a recommendation should be auto-accepted based on
   * the confidence score threshold. Returns true if the confidence meets
   * or exceeds the minimum recommendation confidence threshold.
   */
  isAutoAcceptable(confidence: number): boolean {
    return confidence >= VALIDATION_RULES.minRecommendationConfidence;
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

const recommendationEngine = new RecommendationEngine();

export default recommendationEngine;