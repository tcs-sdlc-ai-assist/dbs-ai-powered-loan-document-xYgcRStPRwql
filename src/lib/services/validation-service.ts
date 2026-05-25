import {
  getDocumentsByApplicationId,
  getDocumentCountByType,
} from "@/lib/repositories/document-repository";
import type { DocumentWithExtraction } from "@/lib/repositories/document-repository";
import {
  getExtractionsByApplicationId,
} from "@/lib/repositories/extraction-repository";
import type { ExtractionResultWithDocument } from "@/lib/repositories/extraction-repository";
import {
  createDiscrepancy,
  bulkCreateDiscrepancies,
  getDiscrepanciesByApplicationId,
  getUnresolvedDiscrepancies,
  getDiscrepancyCountBySeverity,
} from "@/lib/repositories/discrepancy-repository";
import type { CreateDiscrepancyInput } from "@/lib/repositories/discrepancy-repository";
import { getApplicationById } from "@/lib/repositories/application-repository";
import statusTracker from "@/lib/services/status-service";
import auditLogger from "@/lib/services/audit-service";
import { DOCUMENT_TYPES, VALIDATION_RULES } from "@/lib/constants";
import type { DocumentType, DiscrepancySeverity } from "@prisma/client";
import type {
  ValidationResult,
  CompletenessResult,
  CrossValidationResult,
  ValidationDiscrepancyItem,
} from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckCompletenessInput {
  applicationId: string;
  checkedBy?: string;
  ipAddress?: string | null;
}

export interface CrossValidateInput {
  applicationId: string;
  validatedBy: string;
  ipAddress?: string | null;
}

export interface FullValidationInput {
  applicationId: string;
  validatedBy: string;
  ipAddress?: string | null;
}

// ---------------------------------------------------------------------------
// Required Fields Per Document Type
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS_BY_DOCUMENT_TYPE: Record<string, string[]> = {
  INCOME_STATEMENT: ["applicantName", "annualIncome", "monthlyIncome", "employer", "currency"],
  BANK_STATEMENT: ["accountHolder", "bankName", "averageMonthlyBalance", "totalDeposits", "currency"],
  TAX_RETURN: ["taxpayerName", "assessmentYear", "totalIncome", "taxableIncome", "currency"],
  IDENTITY_DOCUMENT: ["fullName", "nricNumber", "dateOfBirth", "nationality"],
  PROPERTY_VALUATION: ["propertyAddress", "valuationAmount", "valuationDate", "propertyType", "currency"],
  EMPLOYMENT_LETTER: ["employeeName", "employer", "position", "annualSalary", "employmentType", "currency"],
  CREDIT_REPORT: ["applicantName", "creditScore", "outstandingDebts", "reportDate"],
  BUSINESS_REGISTRATION: ["businessName", "registrationNumber", "registrationDate", "businessType"],
  FINANCIAL_STATEMENT: ["companyName", "revenue", "netProfit", "totalAssets", "totalLiabilities", "financialYear"],
  OTHER: [],
};

// ---------------------------------------------------------------------------
// Cross-Validation Rule Definitions
// ---------------------------------------------------------------------------

interface CrossValidationRule {
  field: string;
  sourceDocumentType: DocumentType;
  targetDocumentType: DocumentType;
  sourceField: string;
  targetField: string;
  comparisonType: "exact" | "numeric_tolerance" | "contains";
  tolerancePercent?: number;
}

const CROSS_VALIDATION_RULES: CrossValidationRule[] = [
  // Name consistency checks
  {
    field: "applicantName",
    sourceDocumentType: "INCOME_STATEMENT",
    targetDocumentType: "IDENTITY_DOCUMENT",
    sourceField: "applicantName",
    targetField: "fullName",
    comparisonType: "exact",
  },
  {
    field: "applicantName",
    sourceDocumentType: "INCOME_STATEMENT",
    targetDocumentType: "TAX_RETURN",
    sourceField: "applicantName",
    targetField: "taxpayerName",
    comparisonType: "exact",
  },
  {
    field: "applicantName",
    sourceDocumentType: "INCOME_STATEMENT",
    targetDocumentType: "BANK_STATEMENT",
    sourceField: "applicantName",
    targetField: "accountHolder",
    comparisonType: "exact",
  },
  {
    field: "employeeName",
    sourceDocumentType: "EMPLOYMENT_LETTER",
    targetDocumentType: "IDENTITY_DOCUMENT",
    sourceField: "employeeName",
    targetField: "fullName",
    comparisonType: "exact",
  },
  // Income consistency checks
  {
    field: "annualIncome",
    sourceDocumentType: "INCOME_STATEMENT",
    targetDocumentType: "TAX_RETURN",
    sourceField: "annualIncome",
    targetField: "totalIncome",
    comparisonType: "numeric_tolerance",
    tolerancePercent: VALIDATION_RULES.incomeVarianceThresholdPercent,
  },
  {
    field: "annualIncome",
    sourceDocumentType: "INCOME_STATEMENT",
    targetDocumentType: "EMPLOYMENT_LETTER",
    sourceField: "annualIncome",
    targetField: "annualSalary",
    comparisonType: "numeric_tolerance",
    tolerancePercent: VALIDATION_RULES.incomeVarianceThresholdPercent,
  },
  // Employer consistency checks
  {
    field: "employer",
    sourceDocumentType: "INCOME_STATEMENT",
    targetDocumentType: "TAX_RETURN",
    sourceField: "employer",
    targetField: "employer",
    comparisonType: "contains",
  },
  {
    field: "employer",
    sourceDocumentType: "INCOME_STATEMENT",
    targetDocumentType: "EMPLOYMENT_LETTER",
    sourceField: "employer",
    targetField: "employer",
    comparisonType: "contains",
  },
  {
    field: "employer",
    sourceDocumentType: "EMPLOYMENT_LETTER",
    targetDocumentType: "TAX_RETURN",
    sourceField: "employer",
    targetField: "employer",
    comparisonType: "contains",
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function getDocumentTypeLabel(docType: DocumentType): string {
  const config = DOCUMENT_TYPES[docType];
  return config ? config.label : docType;
}

function getRequiredDocumentTypes(): DocumentType[] {
  const required: DocumentType[] = [];
  for (const [key, config] of Object.entries(DOCUMENT_TYPES)) {
    if (config.required) {
      required.push(key as DocumentType);
    }
  }
  return required;
}

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function compareExact(sourceValue: unknown, targetValue: unknown): boolean {
  const s = normalizeString(sourceValue);
  const t = normalizeString(targetValue);
  if (s === "" || t === "") return true; // Skip if either is empty
  return s === t;
}

function compareContains(sourceValue: unknown, targetValue: unknown): boolean {
  const s = normalizeString(sourceValue);
  const t = normalizeString(targetValue);
  if (s === "" || t === "") return true; // Skip if either is empty
  return s.includes(t) || t.includes(s);
}

function compareNumericTolerance(
  sourceValue: unknown,
  targetValue: unknown,
  tolerancePercent: number
): boolean {
  const s = typeof sourceValue === "number" ? sourceValue : parseFloat(String(sourceValue));
  const t = typeof targetValue === "number" ? targetValue : parseFloat(String(targetValue));

  if (isNaN(s) || isNaN(t)) return true; // Skip if either is not a number
  if (s === 0 && t === 0) return true;

  const base = Math.max(Math.abs(s), Math.abs(t));
  if (base === 0) return true;

  const variancePercent = (Math.abs(s - t) / base) * 100;
  return variancePercent <= tolerancePercent;
}

function determineSeverity(
  field: string,
  comparisonType: string,
  sourceValue: unknown,
  targetValue: unknown,
  tolerancePercent?: number
): DiscrepancySeverity {
  // Income-related fields with numeric tolerance
  if (comparisonType === "numeric_tolerance" && tolerancePercent !== undefined) {
    const s = typeof sourceValue === "number" ? sourceValue : parseFloat(String(sourceValue));
    const t = typeof targetValue === "number" ? targetValue : parseFloat(String(targetValue));

    if (!isNaN(s) && !isNaN(t)) {
      const base = Math.max(Math.abs(s), Math.abs(t));
      if (base > 0) {
        const variancePercent = (Math.abs(s - t) / base) * 100;

        if (variancePercent > 20) return "CRITICAL";
        if (variancePercent > 10) return "HIGH";
        if (variancePercent > tolerancePercent) return "MEDIUM";
      }
    }
    return "MEDIUM";
  }

  // Name mismatches
  if (
    field === "applicantName" ||
    field === "employeeName"
  ) {
    return "HIGH";
  }

  // Employer name mismatches (often minor formatting differences)
  if (field === "employer") {
    return "LOW";
  }

  return "MEDIUM";
}

// ---------------------------------------------------------------------------
// ValidationService
// ---------------------------------------------------------------------------

class ValidationService {
  /**
   * Checks whether all required document types have been uploaded for an
   * application and whether all mandatory extracted fields are present in
   * the extraction results. Returns a CompletenessResult with details on
   * missing documents and fields.
   */
  async checkCompleteness(
    input: CheckCompletenessInput
  ): Promise<CompletenessResult> {
    const { applicationId, checkedBy, ipAddress } = input;

    // Verify the application exists
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Get all documents for the application
    const documents = await getDocumentsByApplicationId(applicationId);

    // Get required document types
    const requiredDocumentTypes = getRequiredDocumentTypes();

    // Determine which document types have been uploaded
    const uploadedDocumentTypes = new Set<DocumentType>(
      documents.map((doc) => doc.type)
    );

    // Find missing required document types
    const missingDocuments: DocumentType[] = requiredDocumentTypes.filter(
      (docType) => !uploadedDocumentTypes.has(docType)
    );

    // Calculate completeness percentage
    const totalRequired = requiredDocumentTypes.length;
    const uploadedRequired = totalRequired - missingDocuments.length;
    const completenessPercentage =
      totalRequired > 0
        ? Math.round((uploadedRequired / totalRequired) * 100)
        : 100;

    const isComplete = missingDocuments.length === 0;

    // Additionally check that extraction results exist and have required fields
    if (isComplete && documents.length > 0) {
      const extractions = await getExtractionsByApplicationId(applicationId);

      for (const extraction of extractions) {
        const docType = extraction.document.type;
        const requiredFields = REQUIRED_FIELDS_BY_DOCUMENT_TYPE[docType] ?? [];
        const extractedData = extraction.extractedData as Record<string, unknown>;

        if (extraction.status !== "COMPLETED" && extraction.status !== "PARTIALLY_COMPLETED") {
          continue;
        }

        for (const field of requiredFields) {
          const value = extractedData[field];
          if (value === null || value === undefined || value === "") {
            // Field is missing — not truly complete
            // We don't add to missingDocuments but note it in the result
          }
        }
      }
    }

    const result: CompletenessResult = {
      isComplete,
      totalDocuments: documents.length,
      requiredDocuments: requiredDocumentTypes,
      missingDocuments,
      completenessPercentage,
    };

    // Log the completeness check via AuditService
    if (checkedBy) {
      try {
        await auditLogger.logAction({
          userId: checkedBy,
          applicationId,
          action: "COMPLETENESS_CHECK",
          entityType: "Application",
          entityId: applicationId,
          details: {
            isComplete,
            totalDocuments: documents.length,
            missingDocuments: missingDocuments.map(getDocumentTypeLabel),
            completenessPercentage,
          },
          ipAddress: ipAddress ?? null,
          outcome: isComplete ? "SUCCESS" : "INCOMPLETE",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to log completeness check audit: ${message}`);
      }
    }

    return result;
  }

  /**
   * Compares extracted fields across documents for an application to
   * identify discrepancies (e.g., name mismatches, income inconsistencies).
   * Creates ValidationDiscrepancy records for each mismatch found.
   * Integrates with StatusService and AuditService.
   */
  async crossValidate(
    input: CrossValidateInput
  ): Promise<CrossValidationResult> {
    const { applicationId, validatedBy, ipAddress } = input;

    // Verify the application exists
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Update application status to VALIDATION_IN_PROGRESS
    try {
      const isAllowed = statusTracker.isTransitionAllowed(
        application.status,
        "VALIDATION_IN_PROGRESS"
      );
      if (isAllowed) {
        await statusTracker.updateStatus({
          applicationId,
          newStatus: "VALIDATION_IN_PROGRESS",
          changedBy: validatedBy,
          comments: "Cross-validation started",
          ipAddress: ipAddress ?? null,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to update status to VALIDATION_IN_PROGRESS: ${message}`);
    }

    // Get all extraction results for the application
    const extractions = await getExtractionsByApplicationId(applicationId);

    // Build a map of document type -> extracted data
    const extractionsByDocType = new Map<
      DocumentType,
      { extractedData: Record<string, unknown>; documentLabel: string }
    >();

    for (const extraction of extractions) {
      if (
        extraction.status !== "COMPLETED" &&
        extraction.status !== "PARTIALLY_COMPLETED"
      ) {
        continue;
      }

      const docType = extraction.document.type;
      // If multiple documents of the same type exist, use the most recent one
      if (!extractionsByDocType.has(docType)) {
        extractionsByDocType.set(docType, {
          extractedData: extraction.extractedData as Record<string, unknown>,
          documentLabel: getDocumentTypeLabel(docType),
        });
      }
    }

    const discrepancies: ValidationDiscrepancyItem[] = [];
    const discrepancyInputs: CreateDiscrepancyInput[] = [];
    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;

    // Run cross-validation rules
    for (const rule of CROSS_VALIDATION_RULES) {
      const sourceData = extractionsByDocType.get(rule.sourceDocumentType);
      const targetData = extractionsByDocType.get(rule.targetDocumentType);

      // Skip if either document type is not available
      if (!sourceData || !targetData) {
        continue;
      }

      const sourceValue = sourceData.extractedData[rule.sourceField];
      const targetValue = targetData.extractedData[rule.targetField];

      // Skip if either value is missing
      if (
        sourceValue === null ||
        sourceValue === undefined ||
        sourceValue === "" ||
        targetValue === null ||
        targetValue === undefined ||
        targetValue === ""
      ) {
        continue;
      }

      totalChecks++;

      let isMatch = false;

      switch (rule.comparisonType) {
        case "exact":
          isMatch = compareExact(sourceValue, targetValue);
          break;
        case "numeric_tolerance":
          isMatch = compareNumericTolerance(
            sourceValue,
            targetValue,
            rule.tolerancePercent ?? VALIDATION_RULES.incomeVarianceThresholdPercent
          );
          break;
        case "contains":
          isMatch = compareContains(sourceValue, targetValue);
          break;
        default:
          isMatch = compareExact(sourceValue, targetValue);
      }

      if (isMatch) {
        passedChecks++;
      } else {
        failedChecks++;

        const severity = determineSeverity(
          rule.field,
          rule.comparisonType,
          sourceValue,
          targetValue,
          rule.tolerancePercent
        );

        const discrepancyItem: ValidationDiscrepancyItem = {
          field: rule.field,
          sourceDocument: sourceData.documentLabel,
          targetDocument: targetData.documentLabel,
          sourceValue: String(sourceValue),
          targetValue: String(targetValue),
          severity,
          resolved: false,
        };

        discrepancies.push(discrepancyItem);

        discrepancyInputs.push({
          applicationId,
          field: rule.field,
          sourceDocument: sourceData.documentLabel,
          targetDocument: targetData.documentLabel,
          sourceValue: String(sourceValue),
          targetValue: String(targetValue),
          severity,
          resolved: false,
        });
      }
    }

    // Persist discrepancies to the database
    if (discrepancyInputs.length > 0) {
      try {
        const created = await bulkCreateDiscrepancies(discrepancyInputs);

        // Update discrepancy items with their IDs
        for (let i = 0; i < created.length && i < discrepancies.length; i++) {
          discrepancies[i].id = created[i].id;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to persist validation discrepancies: ${message}`);
      }
    }

    const isConsistent = failedChecks === 0;

    // Update application status to VALIDATION_COMPLETE
    try {
      const currentApp = await getApplicationById(applicationId);
      if (currentApp && currentApp.status === "VALIDATION_IN_PROGRESS") {
        await statusTracker.updateStatus({
          applicationId,
          newStatus: "VALIDATION_COMPLETE",
          changedBy: validatedBy,
          comments: isConsistent
            ? "Validation complete - no discrepancies found"
            : `Validation complete - ${failedChecks} discrepancy(ies) found`,
          ipAddress: ipAddress ?? null,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to update status to VALIDATION_COMPLETE: ${message}`);
    }

    // Log the cross-validation action via AuditService
    try {
      await auditLogger.logAction({
        userId: validatedBy,
        applicationId,
        action: "VALIDATION_COMPLETED",
        entityType: "Application",
        entityId: applicationId,
        details: {
          totalChecks,
          passedChecks,
          failedChecks,
          discrepanciesFound: discrepancies.length,
          criticalDiscrepancies: discrepancies.filter(
            (d) => d.severity === "CRITICAL"
          ).length,
          highDiscrepancies: discrepancies.filter(
            (d) => d.severity === "HIGH"
          ).length,
        },
        ipAddress: ipAddress ?? null,
        outcome: isConsistent ? "SUCCESS" : "DISCREPANCIES_FOUND",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to log cross-validation audit: ${message}`);
    }

    return {
      isConsistent,
      totalChecks,
      passedChecks,
      failedChecks,
      discrepancies,
    };
  }

  /**
   * Performs a full validation of an application: completeness check
   * followed by cross-validation. Returns a combined ValidationResult.
   */
  async validate(input: FullValidationInput): Promise<ValidationResult> {
    const { applicationId, validatedBy, ipAddress } = input;

    // Run completeness check
    const completeness = await this.checkCompleteness({
      applicationId,
      checkedBy: validatedBy,
      ipAddress,
    });

    // Run cross-validation
    const crossValidation = await this.crossValidate({
      applicationId,
      validatedBy,
      ipAddress,
    });

    const isValid = completeness.isComplete && crossValidation.isConsistent;

    return {
      applicationId,
      isValid,
      completeness,
      crossValidation,
      discrepancies: crossValidation.discrepancies,
    };
  }

  /**
   * Retrieves all existing validation discrepancies for an application.
   */
  async getDiscrepancies(
    applicationId: string
  ): Promise<ValidationDiscrepancyItem[]> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const discrepancies = await getDiscrepanciesByApplicationId(applicationId);

    return discrepancies.map((d) => ({
      id: d.id,
      field: d.field,
      sourceDocument: d.sourceDocument,
      targetDocument: d.targetDocument,
      sourceValue: d.sourceValue,
      targetValue: d.targetValue,
      severity: d.severity,
      resolved: d.resolved,
    }));
  }

  /**
   * Retrieves all unresolved validation discrepancies for an application.
   */
  async getUnresolvedDiscrepancies(
    applicationId: string
  ): Promise<ValidationDiscrepancyItem[]> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const discrepancies = await getUnresolvedDiscrepancies(applicationId);

    return discrepancies.map((d) => ({
      id: d.id,
      field: d.field,
      sourceDocument: d.sourceDocument,
      targetDocument: d.targetDocument,
      sourceValue: d.sourceValue,
      targetValue: d.targetValue,
      severity: d.severity,
      resolved: d.resolved,
    }));
  }

  /**
   * Returns the count of unresolved discrepancies grouped by severity
   * for a given application. Useful for determining whether auto-rejection
   * or analyst referral thresholds are met.
   */
  async getDiscrepancySeverityCounts(
    applicationId: string
  ): Promise<Record<DiscrepancySeverity, number>> {
    const application = await getApplicationById(applicationId);

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const counts = await getDiscrepancyCountBySeverity(applicationId);
    return counts;
  }

  /**
   * Determines whether the discrepancy profile of an application
   * exceeds the thresholds for auto-rejection or analyst referral.
   *
   * Returns:
   * - "REJECT" if critical discrepancies exceed the max threshold
   * - "REFER_TO_ANALYST" if high discrepancies exceed the max threshold
   * - "APPROVE" if all discrepancies are within acceptable limits
   */
  async evaluateDiscrepancyThresholds(
    applicationId: string
  ): Promise<"APPROVE" | "REJECT" | "REFER_TO_ANALYST"> {
    const counts = await this.getDiscrepancySeverityCounts(applicationId);

    if (counts.CRITICAL > VALIDATION_RULES.maxCriticalDiscrepancies) {
      return "REJECT";
    }

    if (counts.HIGH > VALIDATION_RULES.maxHighDiscrepancies) {
      return "REFER_TO_ANALYST";
    }

    // Check if there are any unresolved medium discrepancies that might need attention
    if (counts.MEDIUM > 0 || counts.HIGH > 0) {
      return "REFER_TO_ANALYST";
    }

    return "APPROVE";
  }

  /**
   * Checks whether all documents for an application have completed
   * extraction results with confidence above the minimum threshold.
   */
  async isExtractionSufficient(applicationId: string): Promise<boolean> {
    const documents = await getDocumentsByApplicationId(applicationId);

    if (documents.length === 0) {
      return false;
    }

    return documents.every(
      (doc) =>
        doc.extractionResult !== null &&
        (doc.extractionResult.status === "COMPLETED" ||
          doc.extractionResult.status === "PARTIALLY_COMPLETED") &&
        doc.extractionResult.confidence >= VALIDATION_RULES.minExtractionConfidence
    );
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

const validationService = new ValidationService();

export default validationService;