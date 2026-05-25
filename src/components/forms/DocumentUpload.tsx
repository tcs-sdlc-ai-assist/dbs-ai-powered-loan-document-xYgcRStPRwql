"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DOCUMENT_TYPES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, ALLOWED_FILE_EXTENSIONS } from "@/lib/constants";
import type { DocumentType } from "@prisma/client";
import type { ApiResponse } from "@/types/types";
import { cn, parseFileSize } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentUploadProps {
  /** The application ID (human-readable, e.g. DBS-1001) */
  applicationId: string;
  /** Already uploaded documents for this application */
  existingDocuments?: UploadedDocument[];
  /** Optional callback fired after a successful upload */
  onUploadComplete?: () => void;
  /** Optional callback fired when all required documents are uploaded */
  onAllRequiredUploaded?: () => void;
  /** Optional class names for the wrapper */
  className?: string;
}

interface UploadedDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  createdAt?: string;
}

interface FileUploadState {
  file: File;
  documentType: DocumentType;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
  uploadedDocument?: UploadedDocument;
}

interface DocumentTypeStatus {
  type: DocumentType;
  label: string;
  required: boolean;
  uploaded: boolean;
  uploadedFileName?: string;
  uploadedFileSize?: number;
}

// ---------------------------------------------------------------------------
// Required Document Types (for the completeness indicator)
// ---------------------------------------------------------------------------

const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  "IDENTITY_DOCUMENT",
  "INCOME_STATEMENT",
  "BANK_STATEMENT",
];

const ALL_UPLOAD_DOCUMENT_TYPES: DocumentType[] = [
  "IDENTITY_DOCUMENT",
  "INCOME_STATEMENT",
  "BANK_STATEMENT",
  "TAX_RETURN",
  "EMPLOYMENT_LETTER",
  "PROPERTY_VALUATION",
  "CREDIT_REPORT",
  "BUSINESS_REGISTRATION",
  "FINANCIAL_STATEMENT",
  "OTHER",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAllowedMimeType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

function isAllowedFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

function getDocumentTypeLabel(type: DocumentType): string {
  const config = DOCUMENT_TYPES[type];
  return config ? config.label : type;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-10 w-10", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 013.572 5.345A4.5 4.5 0 0117.25 19.5H6.75z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// DocumentUpload Component
// ---------------------------------------------------------------------------

export default function DocumentUpload({
  applicationId,
  existingDocuments = [],
  onUploadComplete,
  onAllRequiredUploaded,
  className,
}: DocumentUploadProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // State
  const [uploadQueue, setUploadQueue] = React.useState<FileUploadState[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = React.useState<DocumentType>("IDENTITY_DOCUMENT");
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = React.useState<UploadedDocument[]>(existingDocuments);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync existingDocuments prop changes
  React.useEffect(() => {
    setUploadedDocs(existingDocuments);
  }, [existingDocuments]);

  // ---------------------------------------------------------------------------
  // Computed: Document type statuses
  // ---------------------------------------------------------------------------

  const documentTypeStatuses: DocumentTypeStatus[] = React.useMemo(() => {
    return ALL_UPLOAD_DOCUMENT_TYPES.map((type) => {
      const config = DOCUMENT_TYPES[type];
      const isRequired = REQUIRED_DOCUMENT_TYPES.includes(type);
      const existingDoc = uploadedDocs.find((doc) => doc.type === type);
      const queuedSuccess = uploadQueue.find(
        (item) => item.documentType === type && item.status === "success"
      );

      const uploaded = !!existingDoc || !!queuedSuccess;
      const fileName = existingDoc?.fileName ?? queuedSuccess?.uploadedDocument?.fileName;
      const fileSize = existingDoc?.fileSize ?? queuedSuccess?.uploadedDocument?.fileSize;

      return {
        type,
        label: config?.label ?? type,
        required: isRequired,
        uploaded,
        uploadedFileName: fileName,
        uploadedFileSize: fileSize,
      };
    });
  }, [uploadedDocs, uploadQueue]);

  // ---------------------------------------------------------------------------
  // Computed: Completeness
  // ---------------------------------------------------------------------------

  const requiredStatuses = documentTypeStatuses.filter((s) => s.required);
  const uploadedRequiredCount = requiredStatuses.filter((s) => s.uploaded).length;
  const totalRequiredCount = requiredStatuses.length;
  const completenessPercentage =
    totalRequiredCount > 0
      ? Math.round((uploadedRequiredCount / totalRequiredCount) * 100)
      : 100;
  const isComplete = uploadedRequiredCount === totalRequiredCount;

  // Notify parent when all required documents are uploaded
  React.useEffect(() => {
    if (isComplete && onAllRequiredUploaded) {
      onAllRequiredUploaded();
    }
  }, [isComplete, onAllRequiredUploaded]);

  // ---------------------------------------------------------------------------
  // File Validation
  // ---------------------------------------------------------------------------

  const validateFile = (file: File): string | null => {
    if (!isAllowedMimeType(file.type)) {
      const ext = getFileExtension(file.name);
      return `Invalid file type "${ext || file.type}". Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`;
    }

    if (!isAllowedFileSize(file.size)) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      return `File size (${parseFileSize(file.size)}) exceeds the maximum allowed size of ${maxSizeMB} MB`;
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // File Selection
  // ---------------------------------------------------------------------------

  const handleFilesSelected = (files: FileList | File[]) => {
    setUploadError(null);

    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;

    const newItems: FileUploadState[] = [];

    for (const file of fileArray) {
      const validationError = validateFile(file);

      if (validationError) {
        setUploadError(validationError);
        continue;
      }

      newItems.push({
        file,
        documentType: selectedDocumentType,
        progress: 0,
        status: "pending",
      });
    }

    if (newItems.length > 0) {
      setUploadQueue((prev) => [...prev, ...newItems]);

      // Auto-upload each file
      for (const item of newItems) {
        uploadFile(item);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Upload File
  // ---------------------------------------------------------------------------

  const uploadFile = async (item: FileUploadState) => {
    const queueIndex = uploadQueue.length; // approximate; we update by file reference

    // Mark as uploading
    setUploadQueue((prev) =>
      prev.map((q) =>
        q.file === item.file && q.documentType === item.documentType
          ? { ...q, status: "uploading" as const, progress: 10 }
          : q
      )
    );

    try {
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("documentType", item.documentType);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.file === item.file &&
            q.documentType === item.documentType &&
            q.status === "uploading"
              ? { ...q, progress: Math.min(q.progress + 15, 85) }
              : q
          )
        );
      }, 200);

      const response = await fetch(
        `/api/applications/${applicationId}/documents`,
        {
          method: "POST",
          body: formData,
        }
      );

      clearInterval(progressInterval);

      const data: ApiResponse<UploadedDocument> = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || `Upload failed (${response.status})`;

        setUploadQueue((prev) =>
          prev.map((q) =>
            q.file === item.file && q.documentType === item.documentType
              ? {
                  ...q,
                  status: "error" as const,
                  progress: 0,
                  errorMessage,
                }
              : q
          )
        );
        return;
      }

      const uploadedDoc: UploadedDocument = data.data
        ? {
            id: data.data.id,
            type: item.documentType,
            fileName: item.file.name,
            fileSize: item.file.size,
          }
        : {
            id: "",
            type: item.documentType,
            fileName: item.file.name,
            fileSize: item.file.size,
          };

      setUploadQueue((prev) =>
        prev.map((q) =>
          q.file === item.file && q.documentType === item.documentType
            ? {
                ...q,
                status: "success" as const,
                progress: 100,
                uploadedDocument: uploadedDoc,
              }
            : q
        )
      );

      setUploadedDocs((prev) => [...prev, uploadedDoc]);

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";

      setUploadQueue((prev) =>
        prev.map((q) =>
          q.file === item.file && q.documentType === item.documentType
            ? {
                ...q,
                status: "error" as const,
                progress: 0,
                errorMessage: message,
              }
            : q
        )
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Remove from queue
  // ---------------------------------------------------------------------------

  const removeFromQueue = (index: number) => {
    setUploadQueue((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------------------------------------------------------------------------
  // Retry upload
  // ---------------------------------------------------------------------------

  const retryUpload = (index: number) => {
    const item = uploadQueue[index];
    if (!item) return;

    setUploadQueue((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, status: "pending" as const, progress: 0, errorMessage: undefined }
          : q
      )
    );

    uploadFile(item);
  };

  // ---------------------------------------------------------------------------
  // Drag & Drop Handlers
  // ---------------------------------------------------------------------------

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesSelected(files);
    }
  };

  // ---------------------------------------------------------------------------
  // File Input Handler
  // ---------------------------------------------------------------------------

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelected(files);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // ---------------------------------------------------------------------------
  // Document Type Select Handler
  // ---------------------------------------------------------------------------

  const handleDocumentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDocumentType(e.target.value as DocumentType);
  };

  // ---------------------------------------------------------------------------
  // Check if currently uploading
  // ---------------------------------------------------------------------------

  const isUploading = uploadQueue.some((item) => item.status === "uploading");

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn("w-full", className)}>
      {/* Upload Error */}
      {uploadError && (
        <Alert
          variant="error"
          title="Upload Error"
          dismissible
          onDismiss={() => setUploadError(null)}
          className="mb-6"
        >
          {uploadError}
        </Alert>
      )}

      {/* Completeness Indicator */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">
            Document Completeness
          </h4>
          <Badge
            variant={isComplete ? "success" : "warning"}
            size="sm"
          >
            {isComplete ? "Complete" : `${uploadedRequiredCount}/${totalRequiredCount} Required`}
          </Badge>
        </div>
        <ProgressBar
          value={completenessPercentage}
          max={100}
          size="md"
          variant={isComplete ? "success" : completenessPercentage >= 50 ? "warning" : "danger"}
          showLabel
          labelPosition="right"
        />
        {!isComplete && (
          <p className="mt-2 text-xs text-gray-500">
            Missing:{" "}
            {requiredStatuses
              .filter((s) => !s.uploaded)
              .map((s) => s.label)
              .join(", ")}
          </p>
        )}
      </div>

      {/* Required Document Types Checklist */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-card">
        <div className="border-b border-gray-200 px-4 py-3">
          <h4 className="text-sm font-semibold text-gray-900">
            Required Documents
          </h4>
        </div>
        <ul className="divide-y divide-gray-100">
          {documentTypeStatuses
            .filter((s) => s.required)
            .map((docStatus) => (
              <li
                key={docStatus.type}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {docStatus.uploaded ? (
                    <CheckCircleIcon className="text-green-500" />
                  ) : (
                    <DocumentIcon className="text-gray-400" />
                  )}
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        docStatus.uploaded ? "text-green-700" : "text-gray-700"
                      )}
                    >
                      {docStatus.label}
                    </p>
                    {docStatus.uploaded && docStatus.uploadedFileName && (
                      <p className="text-xs text-gray-500">
                        {docStatus.uploadedFileName}
                        {docStatus.uploadedFileSize
                          ? ` (${parseFileSize(docStatus.uploadedFileSize)})`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant={docStatus.uploaded ? "success" : "warning"}
                  size="sm"
                >
                  {docStatus.uploaded ? "Uploaded" : "Required"}
                </Badge>
              </li>
            ))}
        </ul>
      </div>

      {/* Document Type Selector */}
      <div className="mb-4">
        <label
          htmlFor="documentType"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Document Type
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        </label>
        <select
          id="documentType"
          value={selectedDocumentType}
          onChange={handleDocumentTypeChange}
          disabled={isUploading}
          className="block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none transition-colors focus:border-[var(--dbs-dark-blue)] focus:ring-2 focus:ring-[var(--dbs-dark-blue)]/15 pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
        >
          {ALL_UPLOAD_DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {getDocumentTypeLabel(type)}
              {REQUIRED_DOCUMENT_TYPES.includes(type) ? " (Required)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
        aria-label="Upload document. Click or drag and drop files here."
        className={cn(
          "mb-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
          isDragOver
            ? "border-[var(--dbs-dark-blue)] bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <UploadCloudIcon
          className={cn(
            "mb-3",
            isDragOver ? "text-[var(--dbs-dark-blue)]" : "text-gray-400"
          )}
        />
        <p className="mb-1 text-sm font-medium text-gray-700">
          {isDragOver ? "Drop files here" : "Drag & drop files here, or click to browse"}
        </p>
        <p className="text-xs text-gray-500">
          Supported formats: PDF, JPG, PNG — Max size: {MAX_FILE_SIZE / (1024 * 1024)} MB
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(",")}
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-card">
          <div className="border-b border-gray-200 px-4 py-3">
            <h4 className="text-sm font-semibold text-gray-900">
              Upload Queue ({uploadQueue.length})
            </h4>
          </div>
          <ul className="divide-y divide-gray-100">
            {uploadQueue.map((item, index) => (
              <li key={`${item.file.name}-${index}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {item.status === "success" ? (
                      <CheckCircleIcon className="mt-0.5 flex-shrink-0 text-green-500" />
                    ) : item.status === "error" ? (
                      <XCircleIcon className="mt-0.5 flex-shrink-0 text-red-500" />
                    ) : (
                      <DocumentIcon className="mt-0.5 flex-shrink-0 text-gray-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {item.file.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {parseFileSize(item.file.size)}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <Badge size="sm" variant="default">
                          {getDocumentTypeLabel(item.documentType)}
                        </Badge>
                      </div>
                      {item.status === "uploading" && (
                        <div className="mt-2">
                          <ProgressBar
                            value={item.progress}
                            max={100}
                            size="sm"
                            variant="default"
                            animated
                          />
                        </div>
                      )}
                      {item.status === "error" && item.errorMessage && (
                        <p className="mt-1 text-xs text-red-600">
                          {item.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {item.status === "success" && (
                      <Badge variant="success" size="sm">
                        Uploaded
                      </Badge>
                    )}
                    {item.status === "uploading" && (
                      <Badge variant="info" size="sm">
                        Uploading…
                      </Badge>
                    )}
                    {item.status === "error" && (
                      <button
                        type="button"
                        onClick={() => retryUpload(index)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        Retry
                      </button>
                    )}
                    {(item.status === "error" || item.status === "success") && (
                      <button
                        type="button"
                        onClick={() => removeFromQueue(index)}
                        className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        aria-label={`Remove ${item.file.name} from queue`}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Optional Document Types */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-card">
        <div className="border-b border-gray-200 px-4 py-3">
          <h4 className="text-sm font-semibold text-gray-900">
            Optional Documents
          </h4>
        </div>
        <ul className="divide-y divide-gray-100">
          {documentTypeStatuses
            .filter((s) => !s.required)
            .map((docStatus) => (
              <li
                key={docStatus.type}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {docStatus.uploaded ? (
                    <CheckCircleIcon className="text-green-500" />
                  ) : (
                    <DocumentIcon className="text-gray-300" />
                  )}
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        docStatus.uploaded ? "text-green-700" : "text-gray-500"
                      )}
                    >
                      {docStatus.label}
                    </p>
                    {docStatus.uploaded && docStatus.uploadedFileName && (
                      <p className="text-xs text-gray-500">
                        {docStatus.uploadedFileName}
                        {docStatus.uploadedFileSize
                          ? ` (${parseFileSize(docStatus.uploadedFileSize)})`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
                {docStatus.uploaded ? (
                  <Badge variant="success" size="sm">
                    Uploaded
                  </Badge>
                ) : (
                  <Badge variant="default" size="sm">
                    Optional
                  </Badge>
                )}
              </li>
            ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {uploadedDocs.length} document(s) uploaded
        </p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/applications/${applicationId}`)}
            disabled={isUploading}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push(`/applications/${applicationId}/verification`)}
            disabled={isUploading || !isComplete}
          >
            {isComplete ? "Continue to Verification" : "Upload Required Documents"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DocumentUpload };
export type { DocumentUploadProps, UploadedDocument };