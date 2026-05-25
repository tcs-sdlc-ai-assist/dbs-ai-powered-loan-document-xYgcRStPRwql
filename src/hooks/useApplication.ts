"use client";

import React from "react";
import useApi from "@/hooks/useApi";
import type { ApiResponse } from "@/types/types";
import type {
  ApplicationStatusEnum,
  DocumentType,
  RecommendationType,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApplicationData {
  id: string;
  applicationId: string;
  applicantName: string;
  loanType: string;
  loanAmount: number;
  status: ApplicationStatusEnum;
  createdAt: string;
  updatedAt: string;
  documents?: DocumentData[];
  validationDiscrepancies?: DiscrepancyData[];
  recommendations?: RecommendationData[];
  analystReviews?: ReviewData[];
  applicationStatusHistory?: StatusHistoryEntry[];
}

interface DocumentData {
  id: string;
  applicationId: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  storageUrl: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  extractionResult?: ExtractionData | null;
}

interface ExtractionData {
  id: string;
  documentId: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  status: string;
  errors: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface DiscrepancyData {
  id: string;
  field: string;
  sourceDocument: string;
  targetDocument: string;
  sourceValue: string;
  targetValue: string;
  severity: string;
  resolved: boolean;
}

interface RecommendationData {
  id?: string;
  applicationId: string;
  recommendation: RecommendationType;
  rationale: string;
  confidence: number;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  details?: {
    completenessScore?: number;
    averageExtractionConfidence?: number;
    discrepancySummary?: {
      total: number;
      unresolved: number;
      bySeverity: Record<string, number>;
    };
    extractionSummary?: {
      totalDocuments: number;
      completedExtractions: number;
      averageConfidence: number;
      belowThreshold: number;
    };
  };
}

interface ReviewData {
  id: string;
  applicationId?: string;
  comment: string;
  isOverride: boolean;
  overrideRecommendation: RecommendationType | null;
  justification: string | null;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface StatusHistoryEntry {
  id: string;
  status: ApplicationStatusEnum;
  previousStatus: ApplicationStatusEnum | null;
  changedBy: string;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CompletenessData {
  applicationId: string;
  isComplete: boolean;
  totalDocuments: number;
  requiredDocuments: DocumentType[];
  missingDocuments: DocumentType[];
  completenessPercentage: number;
}

interface CrossValidationData {
  applicationId: string;
  isConsistent: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  discrepancies: DiscrepancyData[];
}

interface ExtractionResultsData {
  applicationId: string;
  extractionResults: Array<{
    documentId: string;
    documentType: DocumentType;
    fileName: string;
    extractedData: Record<string, unknown>;
    confidence: number;
    status: string;
    errors: Record<string, unknown> | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

interface StatusUpdateData {
  applicationId: string;
  currentStatus: ApplicationStatusEnum;
  previousStatus: ApplicationStatusEnum | null;
  statusEntry: StatusHistoryEntry;
}

interface StatusHistoryData {
  applicationId: string;
  currentStatus: ApplicationStatusEnum;
  history: StatusHistoryEntry[];
}

interface CreateApplicationInput {
  applicantName: string;
  loanType: string;
  loanAmount: number;
}

interface UpdateApplicantInput {
  applicantName?: string;
  loanType?: string;
  loanAmount?: number;
  status?: ApplicationStatusEnum;
}

interface ApplicationListData {
  items: ApplicationData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface UseApplicationReturn {
  /** Current application data */
  application: ApplicationData | null;
  /** List of documents for the current application */
  documents: DocumentData[];
  /** Extraction results for the current application */
  extractions: ExtractionResultsData | null;
  /** Completeness check result */
  completeness: CompletenessData | null;
  /** Cross-validation result */
  crossValidation: CrossValidationData | null;
  /** Latest recommendation */
  recommendation: RecommendationData | null;
  /** Review history */
  reviews: ReviewData[];
  /** Status history */
  statusHistory: StatusHistoryEntry[];
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;

  /** Fetch application details by ID (UUID or human-readable) */
  fetchApplication: (applicationId: string) => Promise<ApplicationData | null>;
  /** Fetch application with all relations */
  fetchApplicationWithRelations: (applicationId: string) => Promise<ApplicationData | null>;
  /** Fetch application list */
  fetchApplicationList: (params?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    status?: ApplicationStatusEnum;
    loanType?: string;
    search?: string;
  }) => Promise<ApplicationListData | null>;
  /** Create a new application */
  createApplication: (input: CreateApplicationInput) => Promise<ApplicationData | null>;
  /** Update applicant details */
  updateApplicant: (applicationId: string, input: UpdateApplicantInput) => Promise<ApplicationData | null>;
  /** Upload a document */
  uploadDocument: (applicationId: string, file: File, documentType: DocumentType) => Promise<DocumentData | null>;
  /** Fetch documents for an application */
  fetchDocuments: (applicationId: string) => Promise<DocumentData[]>;
  /** Trigger AI extraction */
  triggerExtraction: (applicationId: string, documentIds?: string[]) => Promise<boolean>;
  /** Fetch extraction results */
  fetchExtractions: (applicationId: string) => Promise<ExtractionResultsData | null>;
  /** Check document completeness */
  checkCompleteness: (applicationId: string) => Promise<CompletenessData | null>;
  /** Run cross-validation */
  crossValidate: (applicationId: string) => Promise<CrossValidationData | null>;
  /** Generate AI recommendation */
  generateRecommendation: (applicationId: string) => Promise<RecommendationData | null>;
  /** Fetch latest recommendation */
  fetchRecommendation: (applicationId: string) => Promise<RecommendationData | null>;
  /** Submit analyst review */
  submitReview: (applicationId: string, comment: string) => Promise<ReviewData | null>;
  /** Submit analyst override */
  submitOverride: (applicationId: string, comment: string, overrideRecommendation: RecommendationType, justification: string) => Promise<ReviewData | null>;
  /** Fetch review history */
  fetchReviews: (applicationId: string) => Promise<ReviewData[]>;
  /** Update application status */
  updateStatus: (applicationId: string, newStatus: ApplicationStatusEnum, comment?: string) => Promise<StatusUpdateData | null>;
  /** Fetch status history */
  fetchStatusHistory: (applicationId: string) => Promise<StatusHistoryData | null>;
  /** Reset all state */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// useApplication Hook
// ---------------------------------------------------------------------------

function useApplication(): UseApplicationReturn {
  const applicationApi = useApi<ApplicationData>();
  const listApi = useApi<ApplicationListData>();
  const documentApi = useApi<DocumentData>();
  const documentsListApi = useApi<DocumentData[]>();
  const extractionApi = useApi<ExtractionResultsData>();
  const completenessApi = useApi<CompletenessData>();
  const crossValidationApi = useApi<CrossValidationData>();
  const recommendationApi = useApi<RecommendationData>();
  const reviewApi = useApi<ReviewData>();
  const reviewsListApi = useApi<ReviewData[]>();
  const statusApi = useApi<StatusUpdateData>();
  const statusHistoryApi = useApi<StatusHistoryData>();
  const extractionTriggerApi = useApi<unknown>();

  // Local state
  const [application, setApplication] = React.useState<ApplicationData | null>(null);
  const [documents, setDocuments] = React.useState<DocumentData[]>([]);
  const [extractions, setExtractions] = React.useState<ExtractionResultsData | null>(null);
  const [completeness, setCompleteness] = React.useState<CompletenessData | null>(null);
  const [crossValidation, setCrossValidation] = React.useState<CrossValidationData | null>(null);
  const [recommendation, setRecommendation] = React.useState<RecommendationData | null>(null);
  const [reviews, setReviews] = React.useState<ReviewData[]>([]);
  const [statusHistory, setStatusHistory] = React.useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch application details
  // ---------------------------------------------------------------------------

  const fetchApplication = React.useCallback(
    async (applicationId: string): Promise<ApplicationData | null> => {
      setLoading(true);
      setError(null);

      const response = await applicationApi.get(`/api/applications/${applicationId}`);

      setLoading(false);

      if (response.success && response.data) {
        setApplication(response.data);
        return response.data;
      }

      setError(response.error ?? "Failed to fetch application");
      return null;
    },
    [applicationApi.get]
  );

  // ---------------------------------------------------------------------------
  // Fetch application with all relations
  // ---------------------------------------------------------------------------

  const fetchApplicationWithRelations = React.useCallback(
    async (applicationId: string): Promise<ApplicationData | null> => {
      setLoading(true);
      setError(null);

      const response = await applicationApi.get(`/api/applications/${applicationId}`);

      setLoading(false);

      if (response.success && response.data) {
        const appData = response.data;
        setApplication(appData);

        if (appData.documents) {
          setDocuments(appData.documents);
        }
        if (appData.validationDiscrepancies) {
          setCrossValidation((prev) =>
            prev
              ? { ...prev, discrepancies: appData.validationDiscrepancies ?? [] }
              : null
          );
        }
        if (appData.recommendations && appData.recommendations.length > 0) {
          setRecommendation(appData.recommendations[0]);
        }
        if (appData.analystReviews) {
          setReviews(appData.analystReviews);
        }
        if (appData.applicationStatusHistory) {
          setStatusHistory(appData.applicationStatusHistory);
        }

        return appData;
      }

      setError(response.error ?? "Failed to fetch application");
      return null;
    },
    [applicationApi.get]
  );

  // ---------------------------------------------------------------------------
  // Fetch application list
  // ---------------------------------------------------------------------------

  const fetchApplicationList = React.useCallback(
    async (params?: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      status?: ApplicationStatusEnum;
      loanType?: string;
      search?: string;
    }): Promise<ApplicationListData | null> => {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();

      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
      if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.loanType) searchParams.set("loanType", params.loanType);
      if (params?.search) searchParams.set("search", params.search);

      const queryString = searchParams.toString();
      const url = `/api/applications${queryString ? `?${queryString}` : ""}`;

      const response = await listApi.get(url);

      setLoading(false);

      if (response.success && response.data) {
        return response.data;
      }

      setError(response.error ?? "Failed to fetch application list");
      return null;
    },
    [listApi.get]
  );

  // ---------------------------------------------------------------------------
  // Create application
  // ---------------------------------------------------------------------------

  const createApplication = React.useCallback(
    async (input: CreateApplicationInput): Promise<ApplicationData | null> => {
      setLoading(true);
      setError(null);

      const response = await applicationApi.post("/api/applications", input);

      setLoading(false);

      if (response.success && response.data) {
        setApplication(response.data);
        return response.data;
      }

      setError(response.error ?? "Failed to create application");
      return null;
    },
    [applicationApi.post]
  );

  // ---------------------------------------------------------------------------
  // Update applicant details
  // ---------------------------------------------------------------------------

  const updateApplicant = React.useCallback(
    async (
      applicationId: string,
      input: UpdateApplicantInput
    ): Promise<ApplicationData | null> => {
      setLoading(true);
      setError(null);

      const response = await applicationApi.put(
        `/api/applications/${applicationId}/applicant`,
        input
      );

      setLoading(false);

      if (response.success && response.data) {
        setApplication(response.data);
        return response.data;
      }

      setError(response.error ?? "Failed to update applicant details");
      return null;
    },
    [applicationApi.put]
  );

  // ---------------------------------------------------------------------------
  // Upload document
  // ---------------------------------------------------------------------------

  const uploadDocument = React.useCallback(
    async (
      applicationId: string,
      file: File,
      documentType: DocumentType
    ): Promise<DocumentData | null> => {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);

      const response = await documentApi.execute(
        `/api/applications/${applicationId}/documents`,
        {
          method: "POST",
          body: formData,
          formData: true,
        }
      );

      setLoading(false);

      if (response.success && response.data) {
        setDocuments((prev) => [response.data!, ...prev]);
        return response.data;
      }

      setError(response.error ?? "Failed to upload document");
      return null;
    },
    [documentApi.execute]
  );

  // ---------------------------------------------------------------------------
  // Fetch documents
  // ---------------------------------------------------------------------------

  const fetchDocuments = React.useCallback(
    async (applicationId: string): Promise<DocumentData[]> => {
      setError(null);

      const response = await documentsListApi.get(
        `/api/applications/${applicationId}/documents`
      );

      if (response.success && response.data) {
        setDocuments(response.data);
        return response.data;
      }

      setError(response.error ?? "Failed to fetch documents");
      return [];
    },
    [documentsListApi.get]
  );

  // ---------------------------------------------------------------------------
  // Trigger extraction
  // ---------------------------------------------------------------------------

  const triggerExtraction = React.useCallback(
    async (applicationId: string, documentIds?: string[]): Promise<boolean> => {
      setLoading(true);
      setError(null);

      const body: Record<string, unknown> = {};
      if (documentIds && documentIds.length > 0) {
        body.documentIds = documentIds;
      }

      const response = await extractionTriggerApi.post(
        `/api/applications/${applicationId}/extract`,
        body
      );

      setLoading(false);

      if (response.success) {
        return true;
      }

      setError(response.error ?? "Failed to trigger extraction");
      return false;
    },
    [extractionTriggerApi.post]
  );

  // ---------------------------------------------------------------------------
  // Fetch extraction results
  // ---------------------------------------------------------------------------

  const fetchExtractions = React.useCallback(
    async (applicationId: string): Promise<ExtractionResultsData | null> => {
      setError(null);

      const response = await extractionApi.get(
        `/api/applications/${applicationId}/extract`
      );

      if (response.success && response.data) {
        setExtractions(response.data);
        return response.data;
      }

      setError(response.error ?? "Failed to fetch extraction results");
      return null;
    },
    [extractionApi.get]
  );

  // ---------------------------------------------------------------------------
  // Check completeness
  // ---------------------------------------------------------------------------

  const checkCompleteness = React.useCallback(
    async (applicationId: string): Promise<CompletenessData | null> => {
      setError(null);

      const response = await completenessApi.get(
        `/api/applications/${applicationId}/completeness`
      );

      if (response.success && response.data) {
        setCompleteness(response.data);
        return response.data;
      }

      setError(response.error ?? "Failed to check completeness");
      return null;
    },
    [completenessApi.get]
  );

  // ---------------------------------------------------------------------------
  // Cross-validate
  // ---------------------------------------------------------------------------

  const crossValidateFn = React.useCallback(
    async (applicationId: string): Promise<CrossValidationData | null> => {
      setLoading(true);
      setError(null);

      const response = await crossValidationApi.get(
        `/api/applications/${applicationId}/cross-validation`
      );

      setLoading(false);

      if (response.success && response.data) {
        setCrossValidation(response.data);
        return response.data;
      }

      setError(response.error ?? "Failed to run cross-validation");
      return null;
    },
    [crossValidationApi.get]
  );

  // ---------------------------------------------------------------------------
  // Generate recommendation
  // ---------------------------------------------------------------------------

  const generateRecommendation = React.useCallback(
    async (applicationId: string): Promise<RecommendationData | null> => {
      setLoading(true);
      setError(null);

      const response = await recommendationApi.post(
        `/api/recommendation/${applicationId}`
      );

      setLoading(false);

      if (response.success && response.data) {
        setRecommendation(response.data);
        return response.data;
      }

      setError(response.error ?? "Failed to generate recommendation");
      return null;
    },
    [recommendationApi.post]
  );

  // ---------------------------------------------------------------------------
  // Fetch recommendation
  // ---------------------------------------------------------------------------

  const fetchRecommendation = React.useCallback(
    async (applicationId: string): Promise<RecommendationData | null> => {
      setError(null);

      const response = await recommendationApi.get(
        `/api/recommendation/${applicationId}`
      );

      if (response.success && response.data) {
        setRecommendation(response.data);
        return response.data;
      }

      // 404 is expected when no recommendation exists yet
      if (response.error && !response.error.includes("404")) {
        setError(response.error);
      }

      return null;
    },
    [recommendationApi.get]
  );

  // ---------------------------------------------------------------------------
  // Submit review
  // ---------------------------------------------------------------------------

  const submitReview = React.useCallback(
    async (applicationId: string, comment: string): Promise<ReviewData | null> => {
      setLoading(true);
      setError(null);

      const response = await reviewApi.post(`/api/review/${applicationId}`, {
        comment,
      });

      setLoading(false);

      if (response.success && response.data) {
        setReviews((prev) => [response.data!, ...prev]);
        return response.data;
      }

      setError(response.error ?? "Failed to submit review");
      return null;
    },
    [reviewApi.post]
  );

  // ---------------------------------------------------------------------------
  // Submit override
  // ---------------------------------------------------------------------------

  const submitOverride = React.useCallback(
    async (
      applicationId: string,
      comment: string,
      overrideRecommendation: RecommendationType,
      justification: string
    ): Promise<ReviewData | null> => {
      setLoading(true);
      setError(null);

      const response = await reviewApi.post(
        `/api/review/${applicationId}/override`,
        {
          comment,
          overrideRecommendation,
          justification,
        }
      );

      setLoading(false);

      if (response.success && response.data) {
        setReviews((prev) => [response.data!, ...prev]);
        return response.data;
      }

      setError(response.error ?? "Failed to submit override");
      return null;
    },
    [reviewApi.post]
  );

  // ---------------------------------------------------------------------------
  // Fetch reviews
  // ---------------------------------------------------------------------------

  const fetchReviews = React.useCallback(
    async (applicationId: string): Promise<ReviewData[]> => {
      setError(null);

      const response = await reviewsListApi.get(
        `/api/review/${applicationId}`
      );

      if (response.success && response.data) {
        setReviews(response.data);
        return response.data;
      }

      setError(response.error ?? "Failed to fetch reviews");
      return [];
    },
    [reviewsListApi.get]
  );

  // ---------------------------------------------------------------------------
  // Update status
  // ---------------------------------------------------------------------------

  const updateStatusFn = React.useCallback(
    async (
      applicationId: string,
      newStatus: ApplicationStatusEnum,
      comment?: string
    ): Promise<StatusUpdateData | null> => {
      setLoading(true);
      setError(null);

      const body: Record<string, unknown> = { newStatus };
      if (comment) {
        body.comment = comment;
      }

      const response = await statusApi.post(
        `/api/status/${applicationId}`,
        body
      );

      setLoading(false);

      if (response.success && response.data) {
        // Update local application status
        setApplication((prev) =>
          prev
            ? { ...prev, status: response.data!.currentStatus }
            : null
        );

        // Add to status history
        if (response.data.statusEntry) {
          setStatusHistory((prev) => [...prev, response.data!.statusEntry]);
        }

        return response.data;
      }

      setError(response.error ?? "Failed to update status");
      return null;
    },
    [statusApi.post]
  );

  // ---------------------------------------------------------------------------
  // Fetch status history
  // ---------------------------------------------------------------------------

  const fetchStatusHistory = React.useCallback(
    async (applicationId: string): Promise<StatusHistoryData | null> => {
      setError(null);

      const response = await statusHistoryApi.get(
        `/api/status/${applicationId}/history`
      );

      if (response.success && response.data) {
        setStatusHistory(response.data.history);
        return response.data;
      }

      setError(response.error ?? "Failed to fetch status history");
      return null;
    },
    [statusHistoryApi.get]
  );

  // ---------------------------------------------------------------------------
  // Reset all state
  // ---------------------------------------------------------------------------

  const reset = React.useCallback(() => {
    setApplication(null);
    setDocuments([]);
    setExtractions(null);
    setCompleteness(null);
    setCrossValidation(null);
    setRecommendation(null);
    setReviews([]);
    setStatusHistory([]);
    setLoading(false);
    setError(null);

    applicationApi.reset();
    listApi.reset();
    documentApi.reset();
    documentsListApi.reset();
    extractionApi.reset();
    completenessApi.reset();
    crossValidationApi.reset();
    recommendationApi.reset();
    reviewApi.reset();
    reviewsListApi.reset();
    statusApi.reset();
    statusHistoryApi.reset();
    extractionTriggerApi.reset();
  }, [
    applicationApi.reset,
    listApi.reset,
    documentApi.reset,
    documentsListApi.reset,
    extractionApi.reset,
    completenessApi.reset,
    crossValidationApi.reset,
    recommendationApi.reset,
    reviewApi.reset,
    reviewsListApi.reset,
    statusApi.reset,
    statusHistoryApi.reset,
    extractionTriggerApi.reset,
  ]);

  // ---------------------------------------------------------------------------
  // Derive loading state from sub-hooks
  // ---------------------------------------------------------------------------

  const derivedLoading =
    loading ||
    applicationApi.loading ||
    listApi.loading ||
    documentApi.loading ||
    documentsListApi.loading ||
    extractionApi.loading ||
    completenessApi.loading ||
    crossValidationApi.loading ||
    recommendationApi.loading ||
    reviewApi.loading ||
    reviewsListApi.loading ||
    statusApi.loading ||
    statusHistoryApi.loading ||
    extractionTriggerApi.loading;

  return {
    application,
    documents,
    extractions,
    completeness,
    crossValidation,
    recommendation,
    reviews,
    statusHistory,
    loading: derivedLoading,
    error,

    fetchApplication,
    fetchApplicationWithRelations,
    fetchApplicationList,
    createApplication,
    updateApplicant,
    uploadDocument,
    fetchDocuments,
    triggerExtraction,
    fetchExtractions,
    checkCompleteness,
    crossValidate: crossValidateFn,
    generateRecommendation,
    fetchRecommendation,
    submitReview,
    submitOverride,
    fetchReviews,
    updateStatus: updateStatusFn,
    fetchStatusHistory,
    reset,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default useApplication;
export { useApplication };
export type { UseApplicationReturn, ApplicationData, DocumentData, ExtractionData, DiscrepancyData, RecommendationData, ReviewData, StatusHistoryEntry, CompletenessData, CrossValidationData, ExtractionResultsData, StatusUpdateData, StatusHistoryData, ApplicationListData, CreateApplicationInput, UpdateApplicantInput };