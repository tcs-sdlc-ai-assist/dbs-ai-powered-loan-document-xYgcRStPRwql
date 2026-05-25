import { z } from "zod";
import { VALIDATION_RULES, LOAN_TYPES } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Enum values (mirroring Prisma enums for runtime validation)
// ---------------------------------------------------------------------------
const ApplicationStatusEnumValues = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "DOCUMENTS_PENDING",
  "EXTRACTION_IN_PROGRESS",
  "EXTRACTION_COMPLETE",
  "VALIDATION_IN_PROGRESS",
  "VALIDATION_COMPLETE",
  "RECOMMENDATION_GENERATED",
  "ANALYST_REVIEW",
  "APPROVED",
  "REJECTED",
  "RETURNED",
  "CANCELLED",
] as const;

const DocumentTypeValues = [
  "INCOME_STATEMENT",
  "BANK_STATEMENT",
  "TAX_RETURN",
  "IDENTITY_DOCUMENT",
  "PROPERTY_VALUATION",
  "EMPLOYMENT_LETTER",
  "CREDIT_REPORT",
  "BUSINESS_REGISTRATION",
  "FINANCIAL_STATEMENT",
  "OTHER",
] as const;

const RecommendationTypeValues = [
  "APPROVE",
  "REJECT",
  "REFER_TO_ANALYST",
  "REQUEST_MORE_INFO",
] as const;

const UserRoleValues = [
  "ADMIN",
  "ANALYST",
  "REVIEWER",
  "VIEWER",
] as const;

const DiscrepancySeverityValues = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

// ---------------------------------------------------------------------------
// Application Intake Schema
// ---------------------------------------------------------------------------
export const applicationIntakeSchema = z.object({
  applicantName: z
    .string()
    .trim()
    .min(
      VALIDATION_RULES.minApplicantNameLength,
      `Applicant name must be at least ${VALIDATION_RULES.minApplicantNameLength} characters`
    )
    .max(
      VALIDATION_RULES.maxApplicantNameLength,
      `Applicant name must be at most ${VALIDATION_RULES.maxApplicantNameLength} characters`
    ),
  loanType: z
    .string()
    .refine((val) => (LOAN_TYPES as readonly string[]).includes(val), {
      message: `Loan type must be one of: ${LOAN_TYPES.join(", ")}`,
    }),
  loanAmount: z
    .number()
    .min(
      VALIDATION_RULES.minLoanAmount,
      `Loan amount must be at least ${VALIDATION_RULES.minLoanAmount}`
    )
    .max(
      VALIDATION_RULES.maxLoanAmount,
      `Loan amount must be at most ${VALIDATION_RULES.maxLoanAmount}`
    ),
});

export type ApplicationIntakeInput = z.infer<typeof applicationIntakeSchema>;

// ---------------------------------------------------------------------------
// Applicant Details Schema
// ---------------------------------------------------------------------------
export const applicantDetailsSchema = z.object({
  applicantName: z
    .string()
    .trim()
    .min(
      VALIDATION_RULES.minApplicantNameLength,
      `Applicant name must be at least ${VALIDATION_RULES.minApplicantNameLength} characters`
    )
    .max(
      VALIDATION_RULES.maxApplicantNameLength,
      `Applicant name must be at most ${VALIDATION_RULES.maxApplicantNameLength} characters`
    ),
  loanType: z
    .string()
    .refine((val) => (LOAN_TYPES as readonly string[]).includes(val), {
      message: `Loan type must be one of: ${LOAN_TYPES.join(", ")}`,
    }),
  loanAmount: z
    .number()
    .min(
      VALIDATION_RULES.minLoanAmount,
      `Loan amount must be at least ${VALIDATION_RULES.minLoanAmount}`
    )
    .max(
      VALIDATION_RULES.maxLoanAmount,
      `Loan amount must be at most ${VALIDATION_RULES.maxLoanAmount}`
    ),
  status: z.enum(ApplicationStatusEnumValues).optional(),
});

export type ApplicantDetailsInput = z.infer<typeof applicantDetailsSchema>;

// ---------------------------------------------------------------------------
// Document Upload Schema
// ---------------------------------------------------------------------------
export const documentUploadSchema = z.object({
  applicationId: z
    .string()
    .uuid("Application ID must be a valid UUID"),
  type: z.enum(DocumentTypeValues, {
    errorMap: () => ({
      message: `Document type must be one of: ${DocumentTypeValues.join(", ")}`,
    }),
  }),
  fileName: z
    .string()
    .trim()
    .min(1, "File name is required")
    .max(500, "File name must be at most 500 characters"),
  fileSize: z
    .number()
    .int("File size must be an integer")
    .positive("File size must be positive")
    .max(
      parseInt(process.env.UPLOAD_MAX_SIZE_MB || "10", 10) * 1024 * 1024,
      `File size must not exceed ${process.env.UPLOAD_MAX_SIZE_MB || "10"} MB`
    ),
  storageUrl: z
    .string()
    .trim()
    .min(1, "Storage URL is required"),
  uploadedBy: z
    .string()
    .uuid("Uploaded by must be a valid UUID"),
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

// ---------------------------------------------------------------------------
// Extraction Trigger Schema
// ---------------------------------------------------------------------------
export const extractionTriggerSchema = z.object({
  applicationId: z
    .string()
    .uuid("Application ID must be a valid UUID"),
  documentIds: z
    .array(z.string().uuid("Each document ID must be a valid UUID"))
    .min(1, "At least one document ID is required")
    .optional(),
});

export type ExtractionTriggerInput = z.infer<typeof extractionTriggerSchema>;

// ---------------------------------------------------------------------------
// Recommendation Generate Schema
// ---------------------------------------------------------------------------
export const recommendationGenerateSchema = z.object({
  applicationId: z
    .string()
    .uuid("Application ID must be a valid UUID"),
  createdBy: z
    .string()
    .uuid("Created by must be a valid UUID"),
});

export type RecommendationGenerateInput = z.infer<typeof recommendationGenerateSchema>;

// ---------------------------------------------------------------------------
// Review Submit Schema
// ---------------------------------------------------------------------------
export const reviewSubmitSchema = z.object({
  applicationId: z
    .string()
    .uuid("Application ID must be a valid UUID"),
  comment: z
    .string()
    .trim()
    .min(1, "Comment is required")
    .max(5000, "Comment must be at most 5000 characters"),
});

export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;

// ---------------------------------------------------------------------------
// Override Submit Schema
// ---------------------------------------------------------------------------
export const overrideSubmitSchema = z.object({
  applicationId: z
    .string()
    .uuid("Application ID must be a valid UUID"),
  comment: z
    .string()
    .trim()
    .min(1, "Comment is required")
    .max(5000, "Comment must be at most 5000 characters"),
  overrideRecommendation: z.enum(RecommendationTypeValues, {
    errorMap: () => ({
      message: `Override recommendation must be one of: ${RecommendationTypeValues.join(", ")}`,
    }),
  }),
  justification: z
    .string()
    .trim()
    .min(1, "Justification is required when overriding a recommendation")
    .max(5000, "Justification must be at most 5000 characters"),
});

export type OverrideSubmitInput = z.infer<typeof overrideSubmitSchema>;

// ---------------------------------------------------------------------------
// Status Update Schema
// ---------------------------------------------------------------------------
export const statusUpdateSchema = z.object({
  applicationId: z
    .string()
    .uuid("Application ID must be a valid UUID"),
  status: z.enum(ApplicationStatusEnumValues, {
    errorMap: () => ({
      message: `Status must be one of: ${ApplicationStatusEnumValues.join(", ")}`,
    }),
  }),
  previousStatus: z
    .enum(ApplicationStatusEnumValues)
    .nullable()
    .optional(),
  changedBy: z
    .string()
    .uuid("Changed by must be a valid UUID"),
  comments: z
    .string()
    .trim()
    .max(2000, "Comments must be at most 2000 characters")
    .optional(),
});

export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;

// ---------------------------------------------------------------------------
// Audit Query Schema
// ---------------------------------------------------------------------------
export const auditQuerySchema = z.object({
  applicationId: z
    .string()
    .uuid("Application ID must be a valid UUID")
    .optional(),
  userId: z
    .string()
    .uuid("User ID must be a valid UUID")
    .optional(),
  action: z
    .string()
    .trim()
    .max(200, "Action must be at most 200 characters")
    .optional(),
  entityType: z
    .string()
    .trim()
    .max(200, "Entity type must be at most 200 characters")
    .optional(),
  outcome: z
    .string()
    .trim()
    .max(100, "Outcome must be at most 100 characters")
    .optional(),
  startDate: z
    .string()
    .datetime({ message: "Start date must be a valid ISO 8601 datetime" })
    .optional(),
  endDate: z
    .string()
    .datetime({ message: "End date must be a valid ISO 8601 datetime" })
    .optional(),
  page: z
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .optional()
    .default(1),
  pageSize: z
    .number()
    .int("Page size must be an integer")
    .min(1, "Page size must be at least 1")
    .max(100, "Page size must be at most 100")
    .optional()
    .default(20),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;

// ---------------------------------------------------------------------------
// Access Check Schema
// ---------------------------------------------------------------------------
export const accessCheckSchema = z.object({
  userId: z
    .string()
    .uuid("User ID must be a valid UUID"),
  role: z.enum(UserRoleValues, {
    errorMap: () => ({
      message: `Role must be one of: ${UserRoleValues.join(", ")}`,
    }),
  }),
  permission: z
    .string()
    .trim()
    .min(1, "Permission is required"),
  resourceId: z
    .string()
    .optional(),
});

export type AccessCheckInput = z.infer<typeof accessCheckSchema>;