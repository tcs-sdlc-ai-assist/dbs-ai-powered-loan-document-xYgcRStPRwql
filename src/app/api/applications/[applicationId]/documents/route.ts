import { NextRequest } from "next/server";
import {
  withRole,
  successResponse,
  errorResponse,
  handleApiError,
  getClientIp,
  attachMockDbCookie,
} from "@/lib/api-helpers";
import type { AuthenticatedHandler } from "@/lib/api-helpers";
import documentService from "@/lib/services/document-service";
import applicationService from "@/lib/services/application-service";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import type { DocumentType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Valid document type values for runtime validation
// ---------------------------------------------------------------------------

const VALID_DOCUMENT_TYPES: DocumentType[] = [
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
];

// ---------------------------------------------------------------------------
// POST /api/applications/[applicationId]/documents — Upload a document
// ---------------------------------------------------------------------------

const uploadHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const applicationId = context.params?.applicationId;

    if (!applicationId) {
      return errorResponse("Application ID is required", 400);
    }

    const { user } = context;
    const ipAddress = getClientIp(request);

    // Resolve the application (by UUID or human-readable ID)
    let application = await applicationService.getById(applicationId);

    if (!application) {
      const appByDisplayId = await applicationService.getByApplicationId(applicationId);

      if (appByDisplayId) {
        application = appByDisplayId;
      }
    }

    if (!application) {
      return errorResponse(`Application not found: ${applicationId}`, 404);
    }

    // Parse multipart form data
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return errorResponse("Invalid form data. Expected multipart form data.", 400);
    }

    // Extract the file from form data
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return errorResponse("File is required. Please upload a file using the 'file' field.", 400);
    }

    // Extract document type from form data
    const documentType = formData.get("documentType") as string | null;

    if (!documentType) {
      return errorResponse("Document type is required", 400);
    }

    if (!VALID_DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      return errorResponse(
        `Invalid document type: ${documentType}. Must be one of: ${VALID_DOCUMENT_TYPES.join(", ")}`,
        400
      );
    }

    // Validate file type
    const mimeType = file.type;

    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return errorResponse(
        `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
        400
      );
    }

    // Validate file size
    const fileSize = file.size;

    if (fileSize <= 0) {
      return errorResponse("File size must be positive", 400);
    }

    if (fileSize > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      return errorResponse(
        `File size ${fileSize} bytes exceeds maximum allowed size of ${maxSizeMB} MB`,
        400
      );
    }

    // Upload the document via DocumentService
    const result = await documentService.uploadDocument({
      applicationId: application.id,
      type: documentType as DocumentType,
      fileName: file.name,
      fileSize,
      mimeType,
      uploadedBy: user.id,
      ipAddress,
    });

    const response = successResponse(
      result.document,
      "Document uploaded successfully",
      201
    );
    return attachMockDbCookie(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withRole(["document:upload"], uploadHandler);

// ---------------------------------------------------------------------------
// GET /api/applications/[applicationId]/documents — List documents
// ---------------------------------------------------------------------------

const listHandler: AuthenticatedHandler = async (request, context) => {
  try {
    const applicationId = context.params?.applicationId;

    if (!applicationId) {
      return errorResponse("Application ID is required", 400);
    }

    // Resolve the application (by UUID or human-readable ID)
    let application = await applicationService.getById(applicationId);

    if (!application) {
      const appByDisplayId = await applicationService.getByApplicationId(applicationId);

      if (appByDisplayId) {
        application = appByDisplayId;
      }
    }

    if (!application) {
      return errorResponse(`Application not found: ${applicationId}`, 404);
    }

    const documents = await documentService.getByApplicationId(application.id);

    return successResponse(documents, undefined, 200, {
      total: documents.length,
      applicationId: application.applicationId,
    });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRole(["document:read"], listHandler);