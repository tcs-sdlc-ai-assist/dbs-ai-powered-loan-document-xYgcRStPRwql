# DBS Loan Verification Portal

AI-powered loan document verification and processing portal for DBS Bank. This application automates the loan verification workflow by extracting data from uploaded documents using AI, cross-validating information across multiple sources, generating recommendations, and supporting analyst review and override workflows.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Folder Structure](#folder-structure)
- [Available Scripts](#available-scripts)
- [User Roles & Permissions](#user-roles--permissions)
- [Screen Flow](#screen-flow)
- [API Endpoints](#api-endpoints)
- [Application Status Lifecycle](#application-status-lifecycle)
- [Deployment Notes](#deployment-notes)
- [License](#license)

## Tech Stack

| Layer              | Technology                                      |
| ------------------ | ----------------------------------------------- |
| Framework          | [Next.js 14](https://nextjs.org/) (App Router)  |
| Language           | [TypeScript](https://www.typescriptlang.org/)   |
| Styling            | [Tailwind CSS 3](https://tailwindcss.com/)      |
| Database           | [PostgreSQL](https://www.postgresql.org/)       |
| ORM                | [Prisma 5](https://www.prisma.io/)              |
| Authentication     | [NextAuth.js 4](https://next-auth.js.org/)      |
| Validation         | [Zod](https://zod.dev/)                         |
| Testing            | [Jest](https://jestjs.io/) + [Testing Library](https://testing-library.com/) |
| Date Utilities     | [date-fns](https://date-fns.org/)               |

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0 or later — [Download](https://nodejs.org/)
- **npm** 9.0 or later (ships with Node.js)
- **PostgreSQL** 14.0 or later — [Download](https://www.postgresql.org/download/)

Verify your installations:

```bash
node --version    # v18.x or later
npm --version     # 9.x or later
psql --version    # 14.x or later
```

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd dbs-loan-verification-portal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in the values for your local environment:

```bash
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL` to point to your PostgreSQL instance:

```
DATABASE_URL="postgresql://user:password@localhost:5432/dbs_loan_verification?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-here"
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 4. Set Up the Database

Create the PostgreSQL database:

```bash
createdb dbs_loan_verification
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

Seed the database with sample data and demo user accounts:

```bash
npm run prisma:seed
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will be redirected to the login page.

### Demo Credentials

| Role       | Email              | Password      |
| ---------- | ------------------ | ------------- |
| Admin      | admin@dbs.com      | password123   |
| Analyst    | analyst@dbs.com    | password123   |
| Reviewer   | reviewer@dbs.com   | password123   |
| Viewer     | viewer@dbs.com     | password123   |

## Environment Variables

| Variable             | Description                                          | Default                              |
| -------------------- | ---------------------------------------------------- | ------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string                         | —                                    |
| `NEXTAUTH_URL`       | Canonical URL of the application                     | `http://localhost:3000`              |
| `NEXTAUTH_SECRET`    | Secret used to encrypt tokens and sign cookies       | —                                    |
| `AI_API_KEY`         | API key for the AI verification service (mock)       | `mock-ai-api-key`                    |
| `AI_API_URL`         | Base URL for the AI verification service endpoint    | `http://localhost:3000/api/mock/ai`  |
| `UPLOAD_MAX_SIZE_MB` | Maximum upload file size in megabytes                | `10`                                 |
| `ALLOWED_FILE_TYPES` | Comma-separated list of allowed MIME types           | `application/pdf,image/png,image/jpeg` |
| `LOG_LEVEL`          | Log level: `debug`, `info`, `warn`, `error`          | `info`                               |

## Folder Structure

```
dbs-loan-verification-portal/
├── prisma/
│   ├── schema.prisma              # Database schema (10 models)
│   └── seed.ts                    # Database seed script with sample data
├── src/
│   ├── app/                       # Next.js App Router pages and API routes
│   │   ├── api/                   # API route handlers
│   │   │   ├── access/            # POST /api/access — permission check
│   │   │   ├── applications/      # CRUD + documents, extract, completeness, cross-validation
│   │   │   ├── audit/             # GET /api/audit — query audit logs
│   │   │   ├── auth/              # NextAuth.js authentication routes
│   │   │   ├── health/            # GET /api/health — health check
│   │   │   ├── recommendation/    # POST/GET /api/recommendation/[applicationId]
│   │   │   ├── review/            # POST/GET /api/review/[applicationId] + override
│   │   │   └── status/            # GET/POST /api/status/[applicationId] + history
│   │   ├── dashboard/             # Dashboard, applications list, application detail pages
│   │   │   ├── applications/      # Application list, new application, detail sub-pages
│   │   │   │   └── [id]/          # Detail layout with sidebar + sub-pages
│   │   │   │       ├── applicant/ # Step 2: Applicant details form
│   │   │   │       ├── documents/ # Step 3: Document upload
│   │   │   │       ├── verification/ # Step 4: AI extraction & validation
│   │   │   │       ├── review/    # Step 5: Analyst review & recommendation
│   │   │   │       └── summary/   # Step 6: Final summary & actions
│   │   │   └── audit/             # Audit log viewer page
│   │   ├── login/                 # Login page with demo credential buttons
│   │   ├── globals.css            # Global styles and Tailwind directives
│   │   ├── layout.tsx             # Root layout with SessionProvider
│   │   ├── not-found.tsx          # Custom 404 page
│   │   └── page.tsx               # Root redirect (→ /dashboard or /login)
│   ├── components/
│   │   ├── features/              # Feature-specific components
│   │   │   ├── ApplicationCard.tsx
│   │   │   ├── AuditLogViewer.tsx
│   │   │   ├── CompletenessCheck.tsx
│   │   │   ├── DiscrepancyTable.tsx
│   │   │   ├── ExtractionResults.tsx
│   │   │   ├── RecommendationCard.tsx
│   │   │   ├── ReviewHistory.tsx
│   │   │   └── StatusTimeline.tsx
│   │   ├── forms/                 # Form components
│   │   │   ├── ApplicantForm.tsx
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── IntakeForm.tsx
│   │   │   └── ReviewForm.tsx
│   │   ├── layout/                # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Providers.tsx
│   │   │   └── Sidebar.tsx
│   │   └── ui/                    # Reusable UI component library
│   │       ├── Alert.tsx
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── ProgressBar.tsx
│   │       ├── Select.tsx
│   │       ├── Spinner.tsx
│   │       ├── Table.tsx
│   │       └── Textarea.tsx
│   ├── hooks/                     # Custom React hooks
│   │   ├── useApi.ts              # Generic API request hook
│   │   └── useApplication.ts      # Application-specific data hook
│   ├── lib/
│   │   ├── ai/                    # AI extraction engine (mock)
│   │   │   ├── __tests__/         # Extraction engine tests
│   │   │   └── extraction-engine.ts
│   │   ├── repositories/          # Data access layer (Prisma queries)
│   │   │   ├── application-repository.ts
│   │   │   ├── audit-repository.ts
│   │   │   ├── discrepancy-repository.ts
│   │   │   ├── document-repository.ts
│   │   │   ├── extraction-repository.ts
│   │   │   ├── recommendation-repository.ts
│   │   │   ├── review-repository.ts
│   │   │   └── status-repository.ts
│   │   ├── services/              # Business logic layer
│   │   │   ├── __tests__/         # Service layer tests
│   │   │   ├── access-service.ts
│   │   │   ├── application-service.ts
│   │   │   ├── audit-service.ts
│   │   │   ├── document-service.ts
│   │   │   ├── recommendation-service.ts
│   │   │   ├── review-service.ts
│   │   │   ├── status-service.ts
│   │   │   └── validation-service.ts
│   │   ├── api-helpers.ts         # API route middleware (auth, role, validation)
│   │   ├── auth.ts                # NextAuth.js configuration
│   │   ├── constants.ts           # Application constants and configuration
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── utils.ts               # Utility functions
│   │   └── validation-schemas.ts  # Zod validation schemas
│   ├── types/
│   │   └── types.ts               # Shared TypeScript type definitions
│   └── middleware.ts              # Next.js middleware (route protection)
├── .env.example                   # Environment variable template
├── .gitignore
├── CHANGELOG.md
├── jest.config.ts                 # Jest configuration
├── jest.setup.ts                  # Jest setup (mocks for next/navigation, next-auth)
├── next.config.js                 # Next.js configuration
├── package.json
├── postcss.config.js
├── tailwind.config.ts             # Tailwind CSS configuration with DBS theme
├── tsconfig.json                  # TypeScript configuration
└── vercel.json                    # Vercel deployment configuration
```

## Available Scripts

| Script               | Command                        | Description                                              |
| -------------------- | ------------------------------ | -------------------------------------------------------- |
| `dev`                | `npm run dev`                  | Start the Next.js development server with hot reload     |
| `build`              | `npm run build`                | Build the application for production                     |
| `start`              | `npm run start`                | Start the production server                              |
| `lint`               | `npm run lint`                 | Run ESLint across the codebase                           |
| `test`               | `npm run test`                 | Run the Jest test suite                                  |
| `prisma:generate`    | `npm run prisma:generate`      | Generate the Prisma client from the schema               |
| `prisma:migrate`     | `npm run prisma:migrate`       | Run database migrations in development mode              |
| `prisma:seed`        | `npm run prisma:seed`          | Seed the database with sample data and demo accounts     |

## User Roles & Permissions

The portal implements four user roles with 19 granular permissions:

### Role-Permission Matrix

| Permission                | Administrator | Analyst | Reviewer | Viewer |
| ------------------------- | :-----------: | :-----: | :------: | :----: |
| `application:create`      | ✅            | ✅      |          |        |
| `application:read`        | ✅            | ✅      | ✅       | ✅     |
| `application:update`      | ✅            | ✅      |          |        |
| `application:delete`      | ✅            |         |          |        |
| `application:approve`     | ✅            | ✅      | ✅       |        |
| `application:reject`      | ✅            | ✅      | ✅       |        |
| `document:upload`         | ✅            | ✅      |          |        |
| `document:read`           | ✅            | ✅      | ✅       | ✅     |
| `document:delete`         | ✅            |         |          |        |
| `extraction:trigger`      | ✅            | ✅      |          |        |
| `extraction:read`         | ✅            | ✅      | ✅       | ✅     |
| `validation:trigger`      | ✅            | ✅      |          |        |
| `validation:read`         | ✅            | ✅      | ✅       | ✅     |
| `recommendation:read`     | ✅            | ✅      | ✅       | ✅     |
| `recommendation:override` | ✅            | ✅      |          |        |
| `review:create`           | ✅            | ✅      | ✅       |        |
| `review:read`             | ✅            | ✅      | ✅       | ✅     |
| `audit:read`              | ✅            | ✅      | ✅       |        |
| `user:manage`             | ✅            |         |          |        |

## Screen Flow

The application follows a six-step workflow for each loan application:

```
┌──────────┐    ┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌────────┐    ┌─────────┐
│  Intake   │───▶│ Applicant Entry │───▶│ Upload Docs  │───▶│ AI Verification │───▶│ Review │───▶│ Summary │
│ (Step 1)  │    │    (Step 2)     │    │   (Step 3)   │    │    (Step 4)     │    │(Step 5)│    │(Step 6) │
└──────────┘    └─────────────────┘    └──────────────┘    └─────────────────┘    └────────┘    └─────────┘
```

### Step 1 — Intake

Create a new loan application by providing the applicant name, loan type, and loan amount. The system generates a unique `DBS-XXXX` application ID.

### Step 2 — Applicant Entry

Enter detailed applicant information including personal details, employment information, and loan purpose. Supports partial updates.

### Step 3 — Upload Documents

Upload required and optional documents via drag-and-drop or file browser. Supports PDF, PNG, and JPEG formats up to 10 MB each. A real-time completeness indicator shows which required documents are still missing.

### Step 4 — AI Verification

Trigger AI-powered data extraction from uploaded documents. View extracted fields, confidence scores, and per-document extraction status. Run completeness checks and cross-validation to identify discrepancies.

### Step 5 — Review

View the AI-generated recommendation (Approve, Reject, Refer to Analyst, or Request More Info) with confidence score and detailed rationale. Submit analyst review comments or override the recommendation with mandatory justification.

### Step 6 — Summary

View the complete application summary including applicant details, document status, extraction results, validation discrepancies, recommendation, review history, and status timeline. Take final actions (approve, reject, return).

### Additional Screens

- **Dashboard** — Application statistics, recent activity, and quick navigation.
- **Applications List** — Paginated, sortable, filterable list of all applications with search.
- **Audit Logs** — Comprehensive audit trail viewer with filtering, pagination, and CSV export.
- **Login** — Authentication page with demo credential quick-fill buttons.

## API Endpoints

### Applications

| Method | Endpoint                                                | Description                          |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| POST   | `/api/applications`                                     | Create a new application             |
| GET    | `/api/applications`                                     | List applications (paginated)        |
| GET    | `/api/applications/[applicationId]`                     | Get application details              |
| PUT    | `/api/applications/[applicationId]/applicant`           | Update applicant details             |

### Documents

| Method | Endpoint                                                | Description                          |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| POST   | `/api/applications/[applicationId]/documents`           | Upload a document                    |
| GET    | `/api/applications/[applicationId]/documents`           | List documents for an application    |

### Extraction

| Method | Endpoint                                                | Description                          |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| POST   | `/api/applications/[applicationId]/extract`             | Trigger AI extraction                |
| GET    | `/api/applications/[applicationId]/extract`             | Get extraction results               |

### Validation

| Method | Endpoint                                                | Description                          |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| GET    | `/api/applications/[applicationId]/completeness`        | Check document completeness          |
| GET    | `/api/applications/[applicationId]/cross-validation`    | Run cross-validation                 |
| POST   | `/api/applications/[applicationId]/cross-validation`    | Resolve a discrepancy                |

### Recommendation

| Method | Endpoint                                                | Description                          |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| POST   | `/api/recommendation/[applicationId]`                   | Generate AI recommendation           |
| GET    | `/api/recommendation/[applicationId]`                   | Get latest recommendation            |

### Review

| Method | Endpoint                                                | Description                          |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| POST   | `/api/review/[applicationId]`                           | Submit analyst review                |
| GET    | `/api/review/[applicationId]`                           | Get review history                   |
| POST   | `/api/review/[applicationId]/override`                  | Submit analyst override              |

### Status

| Method | Endpoint                                                | Description                          |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| GET    | `/api/status/[applicationId]`                           | Get current status                   |
| POST   | `/api/status/[applicationId]`                           | Update status                        |
| GET    | `/api/status/[applicationId]/history`                   | Get status history                   |

### Access & Audit

| Method | Endpoint                                                | Description                          |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| POST   | `/api/access`                                           | Check access permission              |
| GET    | `/api/audit`                                            | Query audit logs (paginated)         |

### Health

| Method | Endpoint                                                | Description                          |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| GET    | `/api/health`                                           | Health check with database status    |

## Application Status Lifecycle

The application supports 14 states with enforced transition rules:

```
DRAFT ──▶ SUBMITTED ──▶ UNDER_REVIEW ──▶ DOCUMENTS_PENDING
                              │                    │
                              ▼                    ▼
                    EXTRACTION_IN_PROGRESS ◀───────┘
                              │
                              ▼
                    EXTRACTION_COMPLETE
                              │
                              ▼
                    VALIDATION_IN_PROGRESS
                              │
                              ▼
                    VALIDATION_COMPLETE
                              │
                              ▼
                    RECOMMENDATION_GENERATED
                         │    │    │
                         ▼    ▼    ▼
                    APPROVED  │  REJECTED
                              │
                              ▼
                       ANALYST_REVIEW
                      │    │    │    │
                      ▼    ▼    ▼    ▼
                APPROVED REJECTED RETURNED RECOMMENDATION_GENERATED
```

**Terminal states** (no outbound transitions): `APPROVED`, `REJECTED`, `CANCELLED`

The `RETURNED` state allows re-submission (`SUBMITTED`) or re-review (`UNDER_REVIEW`).

Any non-terminal state can transition to `CANCELLED`.

## Deployment Notes

### Production Build

```bash
npm run build
npm run start
```

### Vercel Deployment

The project includes a `vercel.json` configuration file. Deploy directly to Vercel:

1. Connect your repository to Vercel.
2. Set the required environment variables in the Vercel dashboard:
   - `DATABASE_URL` — Your production PostgreSQL connection string.
   - `NEXTAUTH_URL` — Your production domain (e.g., `https://your-app.vercel.app`).
   - `NEXTAUTH_SECRET` — A securely generated random secret.
3. Deploy. Vercel will automatically detect the Next.js framework and build the project.

### Database

- Use a managed PostgreSQL service (e.g., Supabase, Neon, AWS RDS, or Vercel Postgres) for production.
- Run migrations against the production database:
  ```bash
  npx prisma migrate deploy
  ```
- Optionally seed the production database with initial data:
  ```bash
  npm run prisma:seed
  ```

### Security Considerations

- Never commit `.env` files to version control.
- Use strong, unique values for `NEXTAUTH_SECRET` in production.
- Configure CORS and CSP headers appropriately for your deployment environment.
- All API routes enforce role-based access control via the `withRole` middleware.
- Audit logs record all significant actions including access denials.
- JWT sessions expire after 24 hours.

### File Uploads

The current implementation simulates file storage with local URL paths. For production, integrate a cloud storage provider (e.g., AWS S3, Google Cloud Storage, or Vercel Blob) and update the `storageUrl` generation in `document-service.ts`.

## License

Private — All rights reserved. This software is proprietary and confidential. Unauthorized copying, distribution, or use of this software is strictly prohibited.