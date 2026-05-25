import type {
  UserRole,
  ApplicationStatusEnum,
  DocumentType,
  ExtractionStatus,
  DiscrepancySeverity,
  RecommendationType,
} from "@prisma/client";

// Re-export Prisma enums for use across the app
export {
  UserRole,
  ApplicationStatusEnum,
  DocumentType,
  ExtractionStatus,
  DiscrepancySeverity,
  RecommendationType,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// API Response Envelope
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Auth / Session
// ---------------------------------------------------------------------------
export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------
export interface ApplicantFormData {
  applicantName: string;
  loanType: string;
  loanAmount: number;
}

export interface ApplicationFormData {
  applicantName: string;
  loanType: string;
  loanAmount: number;
  status?: ApplicationStatusEnum;
}

// ---------------------------------------------------------------------------
// Document Upload
// ---------------------------------------------------------------------------
export interface DocumentUploadData {
  applicationId: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  storageUrl: string;
  uploadedBy: string;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------
export interface ExtractionResultData {
  id: string;
  documentId: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  status: ExtractionStatus;
  errors: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export interface ValidationResult {
  applicationId: string;
  isValid: boolean;
  completeness: CompletenessResult;
  crossValidation: CrossValidationResult;
  discrepancies: ValidationDiscrepancyItem[];
}

export interface CompletenessResult {
  isComplete: boolean;
  totalDocuments: number;
  requiredDocuments: DocumentType[];
  missingDocuments: DocumentType[];
  completenessPercentage: number;
}

export interface CrossValidationResult {
  isConsistent: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  discrepancies: ValidationDiscrepancyItem[];
}

export interface ValidationDiscrepancyItem {
  id?: string;
  field: string;
  sourceDocument: string;
  targetDocument: string;
  sourceValue: string;
  targetValue: string;
  severity: DiscrepancySeverity;
  resolved: boolean;
}

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------
export interface RecommendationData {
  id: string;
  applicationId: string;
  recommendation: RecommendationType;
  rationale: string;
  confidence: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Analyst Review
// ---------------------------------------------------------------------------
export interface ReviewFormData {
  applicationId: string;
  comment: string;
}

export interface OverrideFormData {
  applicationId: string;
  comment: string;
  overrideRecommendation: RecommendationType;
  justification: string;
}

// ---------------------------------------------------------------------------
// Status Update
// ---------------------------------------------------------------------------
export interface StatusUpdateData {
  applicationId: string;
  status: ApplicationStatusEnum;
  previousStatus?: ApplicationStatusEnum | null;
  changedBy: string;
  comments?: string;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export interface AuditLogEntry {
  id: string;
  applicationId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  outcome: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AuditQueryParams {
  applicationId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  outcome?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Access Control
// ---------------------------------------------------------------------------
export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}