# Changelog

All notable changes to the DBS Loan Verification Portal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-01

### Added

#### Application Intake
- Application creation with automatic unique ID generation in `DBS-XXXX` format.
- Zod-based input validation for applicant name, loan type, and loan amount.
- Support for five loan types: Personal Loan, Home Loan, Business Loan, Auto Loan, and Education Loan.
- Loan amount validation with configurable minimum (SGD 1,000) and maximum (SGD 10,000,000) thresholds.

#### Applicant Details Entry
- Applicant details form with personal information, employment details, and loan purpose fields.
- Server-side validation via Zod schemas with detailed error messages.
- Partial update support — only changed fields are persisted.
- Pre-populated form fields from existing application data.

#### Document Upload
- Multi-file upload with drag-and-drop support and file browser fallback.
- File type validation restricted to PDF, PNG, and JPEG formats.
- File size validation with configurable maximum (default 10 MB).
- Document type classification across 10 categories: Income Statement, Bank Statement, Tax Return, Identity Document, Property Valuation, Employment Letter, Credit Report, Business Registration, Financial Statement, and Other.
- Required document checklist with real-time completeness indicator.
- Maximum 20 documents per application limit enforcement.

#### AI-Powered Document Extraction (Mock)
- Mock AI extraction engine generating realistic structured data for each document type.
- Per-document confidence scoring between 0.5 and 1.0.
- Deterministic extraction results based on document ID for test reproducibility.
- Support for bulk extraction across all application documents.
- Automatic status transitions: `EXTRACTION_IN_PROGRESS` → `EXTRACTION_COMPLETE`.
- Re-extraction support for failed or partially completed documents.
- Simulated extraction failures (~5% rate) for realistic error handling.

#### Completeness and Cross-Validation Checks
- Document completeness check verifying all required document types are uploaded.
- Completeness percentage calculation based on required document coverage.
- Cross-validation engine comparing extracted fields across document types.
- Name consistency checks across Income Statement, Identity Document, Tax Return, Bank Statement, and Employment Letter.
- Income consistency checks between Income Statement, Tax Return, and Employment Letter with configurable tolerance (5%).
- Employer name consistency checks using contains-based comparison logic.
- Discrepancy severity classification: LOW, MEDIUM, HIGH, and CRITICAL.
- Discrepancy resolution workflow with mandatory comment.
- Automatic status transitions: `VALIDATION_IN_PROGRESS` → `VALIDATION_COMPLETE`.

#### Recommendation Generation
- AI recommendation engine applying configurable business rules.
- Four recommendation outcomes: APPROVE, REJECT, REFER_TO_ANALYST, and REQUEST_MORE_INFO.
- Business rules evaluated in priority order:
  - Insufficient data (no documents or extractions) → REQUEST_MORE_INFO.
  - Missing required documents beyond threshold → REQUEST_MORE_INFO.
  - Critical discrepancies exceeding threshold (0) → REJECT.
  - Average extraction confidence below 56% → REJECT.
  - High discrepancies exceeding threshold (2) → REFER_TO_ANALYST.
  - Any unresolved medium or high discrepancies → REFER_TO_ANALYST.
  - Documents below extraction confidence threshold (80%) → REFER_TO_ANALYST.
  - Incomplete required documents → REFER_TO_ANALYST.
  - All checks passed → APPROVE.
- Confidence score calculation based on extraction quality and discrepancy profile.
- Detailed rationale generation explaining the recommendation decision.
- Automatic status transition to `RECOMMENDATION_GENERATED`.
- Auto-referral to `ANALYST_REVIEW` for REFER_TO_ANALYST recommendations.

#### Analyst Review and Override
- Analyst review submission with free-text comment.
- Recommendation override with mandatory justification field.
- Override recommendation options: APPROVE, REJECT, REFER_TO_ANALYST, REQUEST_MORE_INFO.
- Automatic status transitions based on override decision:
  - APPROVE → `APPROVED`
  - REJECT → `REJECTED`
  - REFER_TO_ANALYST / REQUEST_MORE_INFO → `ANALYST_REVIEW`
- Review history display with chronological ordering.
- Override comparison view showing original AI recommendation vs. analyst override.
- Previous recommendation context captured in audit trail for overrides.

#### Status Tracking
- 14-state application lifecycle: DRAFT, SUBMITTED, UNDER_REVIEW, DOCUMENTS_PENDING, EXTRACTION_IN_PROGRESS, EXTRACTION_COMPLETE, VALIDATION_IN_PROGRESS, VALIDATION_COMPLETE, RECOMMENDATION_GENERATED, ANALYST_REVIEW, APPROVED, REJECTED, RETURNED, and CANCELLED.
- Enforced state machine with allowed transition rules.
- Terminal states (APPROVED, REJECTED, CANCELLED) with no outbound transitions.
- RETURNED state allowing re-submission or re-review.
- Atomic status updates using database transactions.
- Full status history with previous status, changed-by user, comments, and timestamps.
- Visual status timeline component with color-coded dots and connector lines.
- Denied transition attempts logged to audit trail.

#### Audit Logging
- Comprehensive append-only audit trail for all system actions.
- Tracked actions: APPLICATION_CREATED, APPLICANT_DETAILS_UPDATED, DOCUMENT_UPLOAD, DOCUMENT_DELETED, EXTRACTION_COMPLETED, VALIDATION_COMPLETED, COMPLETENESS_CHECK, RECOMMENDATION_GENERATED, RECOMMENDATION_OVERRIDE, ANALYST_REVIEW_SUBMITTED, STATUS_UPDATE, STATUS_TRANSITION_DENIED, ACCESS_DENIED, USER_LOGIN, DISCREPANCY_RESOLVED, and DISCREPANCY_UPDATED.
- Outcome tracking: SUCCESS, DENIED, PARTIAL_SUCCESS, INCOMPLETE, and DISCREPANCIES_FOUND.
- IP address capture from request headers (x-forwarded-for, x-real-ip).
- Structured details JSON for each audit entry.
- Paginated audit log viewer with filtering by application ID, user ID, action, entity type, outcome, and date range.
- CSV export of filtered audit log entries.
- Audit log failure isolation — audit failures do not block primary operations.

#### Role-Based Access Control
- Four user roles: Administrator, Analyst, Reviewer, and Viewer.
- 19 granular permissions covering application, document, extraction, validation, recommendation, review, audit, and user management operations.
- Role-permission matrix:
  - **Administrator**: Full access to all 19 permissions.
  - **Analyst**: 16 permissions including create, read, update, approve, reject, upload, extract, validate, recommend, override, review, and audit.
  - **Reviewer**: 11 permissions including read, approve, reject, recommend (read), review, and audit.
  - **Viewer**: 6 read-only permissions for application, document, extraction, validation, recommendation, and review.
- Server-side permission enforcement via `withRole` API middleware.
- Access denial logging to audit trail.
- JWT-based session management with 24-hour expiry via NextAuth.js.
- Middleware-based route protection with automatic redirect to login.

#### User Interface
- DBS-branded design system with corporate red (#ED1C24) and dark blue (#003D6A) color palette.
- Responsive layout supporting mobile, tablet, and desktop viewports.
- Reusable UI component library: Alert, Badge, Button, Card, Input, Modal, ProgressBar, Select, Spinner, Table, and Textarea.
- Application list view with pagination, sorting, filtering by status and loan type, and search.
- Application detail view with sidebar workflow navigation.
- Six-step workflow progress indicator: Intake → Applicant Entry → Upload Docs → AI Verification → Review → Summary.
- Dashboard with application statistics and recent activity.
- Login page with demo credential quick-fill buttons.
- Custom 404 page with navigation options.
- Error boundary with retry and dashboard navigation.
- Loading skeletons for all major page sections.
- Accessible form controls with ARIA attributes, error messages, and helper text.

#### API Endpoints
- `POST /api/applications` — Create new application.
- `GET /api/applications` — List applications with pagination and filters.
- `GET /api/applications/[applicationId]` — Get application details with relations.
- `PUT /api/applications/[applicationId]/applicant` — Update applicant details.
- `POST /api/applications/[applicationId]/documents` — Upload document.
- `GET /api/applications/[applicationId]/documents` — List documents.
- `POST /api/applications/[applicationId]/extract` — Trigger AI extraction.
- `GET /api/applications/[applicationId]/extract` — Get extraction results.
- `GET /api/applications/[applicationId]/completeness` — Check document completeness.
- `GET /api/applications/[applicationId]/cross-validation` — Run cross-validation.
- `POST /api/applications/[applicationId]/cross-validation` — Resolve discrepancy.
- `POST /api/recommendation/[applicationId]` — Generate recommendation.
- `GET /api/recommendation/[applicationId]` — Get latest recommendation.
- `POST /api/review/[applicationId]` — Submit analyst review.
- `GET /api/review/[applicationId]` — Get review history.
- `POST /api/review/[applicationId]/override` — Submit analyst override.
- `GET /api/status/[applicationId]` — Get current status.
- `POST /api/status/[applicationId]` — Update status.
- `GET /api/status/[applicationId]/history` — Get status history.
- `POST /api/access` — Check access permission.
- `GET /api/audit` — Query audit logs.
- `GET /api/health` — Health check with database connectivity.

#### Infrastructure
- PostgreSQL database with Prisma ORM.
- 10 database models: User, Application, Document, ExtractionResult, ValidationDiscrepancy, Recommendation, AnalystReview, ApplicationStatus, and AuditLog.
- Database seed script with sample data for all models and four demo user accounts.
- NextAuth.js credentials provider with bcrypt password hashing.
- Tailwind CSS with custom DBS theme configuration.
- Jest test suite with unit tests for all service layers and AI extraction engine.
- TypeScript strict mode with path aliases.
- Environment variable configuration with `.env.example` template.