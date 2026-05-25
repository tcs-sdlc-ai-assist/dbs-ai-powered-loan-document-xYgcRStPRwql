import type {
  ApplicationStatusEnum,
  DocumentType,
  RecommendationType,
  UserRole,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Loan Types
// ---------------------------------------------------------------------------
export const LOAN_TYPES = [
  "Personal Loan",
  "Home Loan",
  "Business Loan",
  "Auto Loan",
  "Education Loan",
] as const;

export type LoanType = (typeof LOAN_TYPES)[number];

// ---------------------------------------------------------------------------
// Document Types
// ---------------------------------------------------------------------------
export interface DocumentTypeConfig {
  value: DocumentType;
  label: string;
  required: boolean;
}

export const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeConfig> = {
  INCOME_STATEMENT: {
    value: "INCOME_STATEMENT",
    label: "Income Statement",
    required: true,
  },
  BANK_STATEMENT: {
    value: "BANK_STATEMENT",
    label: "Bank Statement",
    required: true,
  },
  TAX_RETURN: {
    value: "TAX_RETURN",
    label: "Tax Return",
    required: true,
  },
  IDENTITY_DOCUMENT: {
    value: "IDENTITY_DOCUMENT",
    label: "Identity Document",
    required: true,
  },
  PROPERTY_VALUATION: {
    value: "PROPERTY_VALUATION",
    label: "Property Valuation",
    required: false,
  },
  EMPLOYMENT_LETTER: {
    value: "EMPLOYMENT_LETTER",
    label: "Employment Letter",
    required: false,
  },
  CREDIT_REPORT: {
    value: "CREDIT_REPORT",
    label: "Credit Report",
    required: false,
  },
  BUSINESS_REGISTRATION: {
    value: "BUSINESS_REGISTRATION",
    label: "Business Registration",
    required: false,
  },
  FINANCIAL_STATEMENT: {
    value: "FINANCIAL_STATEMENT",
    label: "Financial Statement",
    required: false,
  },
  OTHER: {
    value: "OTHER",
    label: "Other",
    required: false,
  },
} as const;

// ---------------------------------------------------------------------------
// Application Statuses
// ---------------------------------------------------------------------------
export interface ApplicationStatusConfig {
  value: ApplicationStatusEnum;
  label: string;
  color: string;
}

export const APPLICATION_STATUSES: Record<ApplicationStatusEnum, ApplicationStatusConfig> = {
  DRAFT: {
    value: "DRAFT",
    label: "Draft",
    color: "bg-gray-100 text-gray-800",
  },
  SUBMITTED: {
    value: "SUBMITTED",
    label: "Submitted",
    color: "bg-blue-100 text-blue-800",
  },
  UNDER_REVIEW: {
    value: "UNDER_REVIEW",
    label: "Under Review",
    color: "bg-indigo-100 text-indigo-800",
  },
  DOCUMENTS_PENDING: {
    value: "DOCUMENTS_PENDING",
    label: "Documents Pending",
    color: "bg-yellow-100 text-yellow-800",
  },
  EXTRACTION_IN_PROGRESS: {
    value: "EXTRACTION_IN_PROGRESS",
    label: "Extraction In Progress",
    color: "bg-purple-100 text-purple-800",
  },
  EXTRACTION_COMPLETE: {
    value: "EXTRACTION_COMPLETE",
    label: "Extraction Complete",
    color: "bg-purple-100 text-purple-800",
  },
  VALIDATION_IN_PROGRESS: {
    value: "VALIDATION_IN_PROGRESS",
    label: "Validation In Progress",
    color: "bg-orange-100 text-orange-800",
  },
  VALIDATION_COMPLETE: {
    value: "VALIDATION_COMPLETE",
    label: "Validation Complete",
    color: "bg-orange-100 text-orange-800",
  },
  RECOMMENDATION_GENERATED: {
    value: "RECOMMENDATION_GENERATED",
    label: "Recommendation Generated",
    color: "bg-cyan-100 text-cyan-800",
  },
  ANALYST_REVIEW: {
    value: "ANALYST_REVIEW",
    label: "Analyst Review",
    color: "bg-amber-100 text-amber-800",
  },
  APPROVED: {
    value: "APPROVED",
    label: "Approved",
    color: "bg-green-100 text-green-800",
  },
  REJECTED: {
    value: "REJECTED",
    label: "Rejected",
    color: "bg-red-100 text-red-800",
  },
  RETURNED: {
    value: "RETURNED",
    label: "Returned",
    color: "bg-yellow-100 text-yellow-800",
  },
  CANCELLED: {
    value: "CANCELLED",
    label: "Cancelled",
    color: "bg-gray-100 text-gray-600",
  },
} as const;

// ---------------------------------------------------------------------------
// Recommendation Types
// ---------------------------------------------------------------------------
export interface RecommendationTypeConfig {
  value: RecommendationType;
  label: string;
  color: string;
}

export const RECOMMENDATION_TYPES: Record<RecommendationType, RecommendationTypeConfig> = {
  APPROVE: {
    value: "APPROVE",
    label: "Approve",
    color: "bg-green-100 text-green-800",
  },
  REJECT: {
    value: "REJECT",
    label: "Reject",
    color: "bg-red-100 text-red-800",
  },
  REFER_TO_ANALYST: {
    value: "REFER_TO_ANALYST",
    label: "Refer to Analyst",
    color: "bg-amber-100 text-amber-800",
  },
  REQUEST_MORE_INFO: {
    value: "REQUEST_MORE_INFO",
    label: "Request More Info",
    color: "bg-blue-100 text-blue-800",
  },
} as const;

// ---------------------------------------------------------------------------
// File Upload
// ---------------------------------------------------------------------------
export const MAX_FILE_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE_MB || "10", 10) * 1024 * 1024; // bytes

export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"] as const;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

// ---------------------------------------------------------------------------
// Roles & Permissions
// ---------------------------------------------------------------------------
export type Permission =
  | "application:create"
  | "application:read"
  | "application:update"
  | "application:delete"
  | "application:approve"
  | "application:reject"
  | "document:upload"
  | "document:read"
  | "document:delete"
  | "extraction:trigger"
  | "extraction:read"
  | "validation:trigger"
  | "validation:read"
  | "recommendation:read"
  | "recommendation:override"
  | "review:create"
  | "review:read"
  | "audit:read"
  | "user:manage";

export interface RoleConfig {
  value: UserRole;
  label: string;
  permissions: Permission[];
}

export const ROLES: Record<UserRole, RoleConfig> = {
  ADMIN: {
    value: "ADMIN",
    label: "Administrator",
    permissions: [
      "application:create",
      "application:read",
      "application:update",
      "application:delete",
      "application:approve",
      "application:reject",
      "document:upload",
      "document:read",
      "document:delete",
      "extraction:trigger",
      "extraction:read",
      "validation:trigger",
      "validation:read",
      "recommendation:read",
      "recommendation:override",
      "review:create",
      "review:read",
      "audit:read",
      "user:manage",
    ],
  },
  ANALYST: {
    value: "ANALYST",
    label: "Analyst",
    permissions: [
      "application:create",
      "application:read",
      "application:update",
      "application:approve",
      "application:reject",
      "document:upload",
      "document:read",
      "extraction:trigger",
      "extraction:read",
      "validation:trigger",
      "validation:read",
      "recommendation:read",
      "recommendation:override",
      "review:create",
      "review:read",
      "audit:read",
    ],
  },
  REVIEWER: {
    value: "REVIEWER",
    label: "Reviewer",
    permissions: [
      "application:read",
      "application:approve",
      "application:reject",
      "document:read",
      "extraction:read",
      "validation:read",
      "recommendation:read",
      "review:create",
      "review:read",
      "audit:read",
    ],
  },
  VIEWER: {
    value: "VIEWER",
    label: "Viewer",
    permissions: [
      "application:read",
      "document:read",
      "extraction:read",
      "validation:read",
      "recommendation:read",
      "review:read",
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Workflow Steps
// ---------------------------------------------------------------------------
export interface WorkflowStep {
  order: number;
  status: ApplicationStatusEnum;
  label: string;
  description: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    order: 1,
    status: "DRAFT",
    label: "Draft",
    description: "Application created and pending submission",
  },
  {
    order: 2,
    status: "SUBMITTED",
    label: "Submitted",
    description: "Application submitted for processing",
  },
  {
    order: 3,
    status: "UNDER_REVIEW",
    label: "Under Review",
    description: "Application is being reviewed",
  },
  {
    order: 4,
    status: "DOCUMENTS_PENDING",
    label: "Documents Pending",
    description: "Waiting for required documents",
  },
  {
    order: 5,
    status: "EXTRACTION_IN_PROGRESS",
    label: "Extraction In Progress",
    description: "AI is extracting data from documents",
  },
  {
    order: 6,
    status: "EXTRACTION_COMPLETE",
    label: "Extraction Complete",
    description: "Data extraction from documents is complete",
  },
  {
    order: 7,
    status: "VALIDATION_IN_PROGRESS",
    label: "Validation In Progress",
    description: "Cross-validating extracted data across documents",
  },
  {
    order: 8,
    status: "VALIDATION_COMPLETE",
    label: "Validation Complete",
    description: "Data validation is complete",
  },
  {
    order: 9,
    status: "RECOMMENDATION_GENERATED",
    label: "Recommendation Generated",
    description: "AI recommendation has been generated",
  },
  {
    order: 10,
    status: "ANALYST_REVIEW",
    label: "Analyst Review",
    description: "Analyst is reviewing the application and recommendation",
  },
  {
    order: 11,
    status: "APPROVED",
    label: "Approved",
    description: "Application has been approved",
  },
  {
    order: 12,
    status: "REJECTED",
    label: "Rejected",
    description: "Application has been rejected",
  },
  {
    order: 13,
    status: "RETURNED",
    label: "Returned",
    description: "Application returned for additional information",
  },
  {
    order: 14,
    status: "CANCELLED",
    label: "Cancelled",
    description: "Application has been cancelled",
  },
] as const;

// ---------------------------------------------------------------------------
// Validation Rules (Business Logic Thresholds)
// ---------------------------------------------------------------------------
export const VALIDATION_RULES = {
  /** Maximum acceptable variance (%) between income sources before flagging */
  incomeVarianceThresholdPercent: 5,

  /** Maximum debt-to-income ratio (%) allowed for loan approval */
  maxDebtToIncomeRatioPercent: 60,

  /** Minimum confidence score (0–1) for extraction results to be accepted */
  minExtractionConfidence: 0.8,

  /** Minimum confidence score (0–1) for AI recommendation to be auto-accepted */
  minRecommendationConfidence: 0.9,

  /** Maximum loan-to-value ratio (%) for property-backed loans */
  maxLoanToValueRatioPercent: 80,

  /** Minimum number of required documents before processing can begin */
  minRequiredDocuments: 3,

  /** Maximum number of critical discrepancies before auto-rejection */
  maxCriticalDiscrepancies: 0,

  /** Maximum number of high-severity discrepancies before referral to analyst */
  maxHighDiscrepancies: 2,

  /** Minimum applicant name length */
  minApplicantNameLength: 2,

  /** Maximum applicant name length */
  maxApplicantNameLength: 200,

  /** Minimum loan amount (SGD) */
  minLoanAmount: 1000,

  /** Maximum loan amount (SGD) */
  maxLoanAmount: 10000000,

  /** Maximum number of documents per application */
  maxDocumentsPerApplication: 20,
} as const;