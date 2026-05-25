# Deployment Guide — DBS Loan Verification Portal

This guide covers deploying the DBS Loan Verification Portal to **Vercel** with a managed PostgreSQL database. It includes environment configuration, database provisioning, CI/CD pipeline setup, monitoring, troubleshooting, and rollback procedures.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Database Provisioning](#database-provisioning)
  - [Option A: Neon PostgreSQL](#option-a-neon-postgresql)
  - [Option B: Supabase PostgreSQL](#option-b-supabase-postgresql)
  - [Option C: Vercel Postgres](#option-c-vercel-postgres)
- [Environment Variable Setup](#environment-variable-setup)
- [Vercel Project Configuration](#vercel-project-configuration)
- [Prisma Migration in CI/CD](#prisma-migration-in-cicd)
- [Build and Deploy Commands](#build-and-deploy-commands)
- [Database Seeding (Optional)](#database-seeding-optional)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Post-Deployment Verification](#post-deployment-verification)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Rollback Procedures](#rollback-procedures)
- [Security Checklist](#security-checklist)
- [Performance Considerations](#performance-considerations)

---

## Prerequisites

Before deploying, ensure you have the following:

| Requirement              | Details                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| **Vercel Account**       | Sign up at [vercel.com](https://vercel.com)                             |
| **GitHub/GitLab/Bitbucket Repository** | The project must be hosted in a Git repository connected to Vercel |
| **Node.js 18+**         | Required for local builds and Prisma CLI operations                     |
| **PostgreSQL 14+**      | A managed PostgreSQL instance (Neon, Supabase, or Vercel Postgres)      |
| **Vercel CLI (optional)** | Install with `npm i -g vercel` for command-line deployments            |

Verify your local tools:

```bash
node --version    # v18.x or later
npm --version     # 9.x or later
npx vercel --version  # (optional) Vercel CLI
```

---

## Database Provisioning

The application requires a PostgreSQL 14+ database. Choose one of the following managed providers.

### Option A: Neon PostgreSQL

[Neon](https://neon.tech) provides serverless PostgreSQL with automatic scaling and branching.

1. **Create an account** at [console.neon.tech](https://console.neon.tech).
2. **Create a new project** and select the region closest to your Vercel deployment region.
3. **Create a database** named `dbs_loan_verification`.
4. **Copy the connection string** from the Neon dashboard. It will look like:

   ```
   postgresql://user:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/dbs_loan_verification?sslmode=require
   ```

5. **Enable connection pooling** (recommended for serverless environments):
   - Navigate to **Settings → Connection Pooling** in the Neon dashboard.
   - Copy the pooled connection string for use as `DATABASE_URL`.

> **Tip:** Neon supports database branching. Create a `preview` branch for Vercel preview deployments and a `main` branch for production.

### Option B: Supabase PostgreSQL

[Supabase](https://supabase.com) provides a full PostgreSQL database with additional features.

1. **Create an account** at [app.supabase.com](https://app.supabase.com).
2. **Create a new project** and select the region closest to your Vercel deployment region.
3. **Navigate to Settings → Database** and copy the connection string:

   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

4. **Use the pooled connection string** (port `6543` with `pgbouncer=true`) for serverless deployments.
5. **Use the direct connection string** (port `5432`) for running migrations.

> **Important:** Supabase uses PgBouncer for connection pooling. For Prisma migrations, you must use the direct connection string (port `5432`), not the pooled one.

### Option C: Vercel Postgres

[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) is a native integration.

1. In your Vercel project dashboard, navigate to **Storage → Create Database → Postgres**.
2. Select the region and create the database.
3. Vercel automatically provisions the `DATABASE_URL` environment variable.
4. The connection string is available in the **Storage** tab of your project.

> **Note:** Vercel Postgres is powered by Neon under the hood and automatically configures connection pooling.

---

## Environment Variable Setup

The following environment variables must be configured in the Vercel dashboard.

### Required Variables

| Variable           | Description                                                    | Example                                                                                     |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string (pooled for serverless)           | `postgresql://user:pass@host:5432/dbs_loan_verification?sslmode=require`                    |
| `NEXTAUTH_URL`     | The canonical URL of your production deployment                | `https://your-app.vercel.app`                                                               |
| `NEXTAUTH_SECRET`  | A cryptographically random secret for signing JWTs and cookies | `K7x9...base64...==`                                                                        |

### Optional Variables

| Variable             | Description                                       | Default                              |
| -------------------- | ------------------------------------------------- | ------------------------------------ |
| `AI_API_KEY`         | API key for the AI verification service (mock)    | `mock-ai-api-key`                    |
| `AI_API_URL`         | Base URL for the AI verification service endpoint | `http://localhost:3000/api/mock/ai`  |
| `UPLOAD_MAX_SIZE_MB` | Maximum upload file size in megabytes              | `10`                                 |
| `ALLOWED_FILE_TYPES` | Comma-separated list of allowed MIME types         | `application/pdf,image/png,image/jpeg` |
| `LOG_LEVEL`          | Log level: `debug`, `info`, `warn`, `error`        | `info`                               |

### Generating NEXTAUTH_SECRET

Generate a secure random secret using one of the following methods:

```bash
# Method 1: OpenSSL
openssl rand -base64 32

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **Critical:** Never reuse the same `NEXTAUTH_SECRET` across environments. Generate a unique secret for each environment (production, preview, development).

### Configuring Variables in Vercel

1. Navigate to your Vercel project dashboard.
2. Go to **Settings → Environment Variables**.
3. Add each variable with the appropriate scope:

   | Variable          | Production | Preview | Development |
   | ----------------- | :--------: | :-----: | :---------: |
   | `DATABASE_URL`    | ✅         | ✅      | ✅          |
   | `NEXTAUTH_URL`    | ✅         | ✅      | ✅          |
   | `NEXTAUTH_SECRET` | ✅         | ✅      | ✅          |

4. For **Preview** deployments, set `NEXTAUTH_URL` to the Vercel preview URL pattern or use `VERCEL_URL`:

   ```
   NEXTAUTH_URL=https://${VERCEL_URL}
   ```

   Alternatively, leave `NEXTAUTH_URL` unset for preview deployments — NextAuth.js will auto-detect the URL from the `VERCEL_URL` environment variable that Vercel provides automatically.

> **Important:** Use different `DATABASE_URL` values for production and preview environments to avoid data contamination. If using Neon, leverage database branching. If using Supabase, create separate projects.

---

## Vercel Project Configuration

### Connecting Your Repository

1. Log in to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import your Git repository (GitHub, GitLab, or Bitbucket).
3. Vercel will auto-detect the Next.js framework.

### Build & Output Settings

The project includes a `vercel.json` configuration file. Vercel will use the following defaults for Next.js:

| Setting              | Value                |
| -------------------- | -------------------- |
| **Framework Preset** | Next.js              |
| **Build Command**    | `next build`         |
| **Output Directory** | `.next`              |
| **Install Command**  | `npm install`        |
| **Node.js Version**  | 18.x                 |

If you need to customize, go to **Settings → General** in your Vercel project:

- **Build Command:** `npx prisma generate && next build`
- **Install Command:** `npm install`
- **Root Directory:** `.` (default)

### vercel.json

The project includes a `vercel.json` file with the following configuration:

```json
{
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/"
    }
  ]
}
```

This ensures that all non-API routes are handled by the Next.js App Router.

### Region Configuration

For optimal performance, deploy to the region closest to your database:

1. Go to **Settings → Functions** in your Vercel project.
2. Set the **Function Region** to match your database region:
   - US East (iad1) for AWS us-east-1 databases
   - US West (sfo1) for AWS us-west-2 databases
   - EU West (dub1) for EU-based databases
   - Singapore (sin1) for Asia-Pacific databases

> **Performance Tip:** Co-locating your Vercel functions and database in the same region reduces latency by 50–200ms per request.

---

## Prisma Migration in CI/CD

### Understanding the Migration Strategy

Prisma requires two distinct steps during deployment:

1. **`prisma generate`** — Generates the Prisma Client based on `schema.prisma`. This must run during the build step.
2. **`prisma migrate deploy`** — Applies pending migrations to the production database. This must run before or during deployment.

### Option 1: Build Command with Generate + Migrate

Configure the Vercel build command to run both steps:

```
npx prisma generate && npx prisma migrate deploy && next build
```

Set this in **Settings → General → Build Command** in your Vercel project.

> **Warning:** This approach runs migrations on every deployment. If a migration fails, the build will fail and the deployment will not proceed. This is the safest approach for most teams.

### Option 2: Separate Migration Step (Recommended for Teams)

For larger teams, run migrations separately from the build:

1. **Before deploying**, run migrations from your local machine or CI pipeline:

   ```bash
   # Set the production DATABASE_URL
   export DATABASE_URL="postgresql://user:pass@host:5432/dbs_loan_verification?sslmode=require"

   # Apply pending migrations
   npx prisma migrate deploy
   ```

2. **In the Vercel build command**, only generate the Prisma Client:

   ```
   npx prisma generate && next build
   ```

### Option 3: GitHub Actions CI/CD Pipeline

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  migrate:
    name: Run Database Migrations
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  deploy:
    name: Deploy to Vercel
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
```

Required GitHub Secrets:

| Secret               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `DATABASE_URL`       | Production PostgreSQL connection string           |
| `VERCEL_TOKEN`       | Vercel API token (from Account Settings → Tokens) |
| `VERCEL_ORG_ID`      | Vercel organization ID (from `.vercel/project.json`) |
| `VERCEL_PROJECT_ID`  | Vercel project ID (from `.vercel/project.json`)   |

### Migration Safety Checks

Before running migrations in production:

1. **Review the migration SQL** — Always inspect the generated SQL before applying:

   ```bash
   npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations prisma/migrations --script
   ```

2. **Test migrations on a staging database first** — Never apply untested migrations directly to production.

3. **Back up the database** before applying destructive migrations (column drops, table drops):

   ```bash
   pg_dump -h host -U user -d dbs_loan_verification > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

---

## Build and Deploy Commands

### Deploying via Vercel Dashboard (Automatic)

Once your repository is connected, Vercel automatically deploys on every push to the `main` branch:

- **Production:** Pushes to `main` trigger a production deployment.
- **Preview:** Pushes to other branches or pull requests trigger preview deployments.

### Deploying via Vercel CLI (Manual)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Deploying via npm Scripts

```bash
# Build locally to verify before deploying
npm run build

# Generate Prisma Client
npm run prisma:generate

# Run migrations against production database
DATABASE_URL="your-production-url" npx prisma migrate deploy

# Deploy to Vercel
vercel --prod
```

### Build Output Verification

After a successful build, verify the output:

```bash
# Check build output size
ls -la .next/

# Verify the build locally
npm run start
```

---

## Database Seeding (Optional)

To seed the production database with demo data and initial user accounts:

```bash
# Set the production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:5432/dbs_loan_verification?sslmode=require"

# Run the seed script
npm run prisma:seed
```

This creates:

| Role       | Email              | Password      |
| ---------- | ------------------ | ------------- |
| Admin      | admin@dbs.com      | password123   |
| Analyst    | analyst@dbs.com    | password123   |
| Reviewer   | reviewer@dbs.com   | password123   |
| Viewer     | viewer@dbs.com     | password123   |

> **Warning:** The seed script deletes all existing data before inserting. Only run this on a fresh database or when you explicitly want to reset all data. Never run on a production database with real data.

> **Security:** Change the default passwords immediately after seeding a production database. The demo credentials are for development and testing only.

---

## Monitoring and Health Checks

### Health Check Endpoint

The application exposes a health check endpoint at:

```
GET /api/health
```

**Healthy Response (200):**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-11-01T12:00:00.000Z",
    "database": "connected"
  }
}
```

**Unhealthy Response (503):**

```json
{
  "success": false,
  "data": {
    "status": "error",
    "timestamp": "2024-11-01T12:00:00.000Z",
    "database": "error"
  }
}
```

### Setting Up Monitoring

#### Vercel Analytics

1. Navigate to your Vercel project dashboard.
2. Go to **Analytics** and enable Web Analytics.
3. Vercel automatically tracks Core Web Vitals, page views, and function invocations.

#### External Uptime Monitoring

Configure an external uptime monitor (e.g., UptimeRobot, Pingdom, Better Uptime) to poll the health endpoint:

| Setting          | Value                                          |
| ---------------- | ---------------------------------------------- |
| **URL**          | `https://your-app.vercel.app/api/health`       |
| **Method**       | `GET`                                          |
| **Interval**     | Every 5 minutes                                |
| **Expected Code**| `200`                                          |
| **Timeout**      | 10 seconds                                     |
| **Alert On**     | Status code ≠ 200 or response time > 5 seconds |

#### Vercel Function Logs

1. Navigate to your Vercel project dashboard.
2. Go to **Logs** to view real-time function logs.
3. Filter by:
   - **Status Code:** 4xx, 5xx for errors
   - **Function:** Specific API routes
   - **Time Range:** Last hour, last 24 hours, etc.

#### Database Monitoring

- **Neon:** Use the Neon dashboard → Monitoring tab for query performance, connection counts, and storage usage.
- **Supabase:** Use the Supabase dashboard → Database → Database Health for connection pool status and query performance.
- **Vercel Postgres:** Use the Vercel Storage dashboard for connection metrics.

### Recommended Alerts

| Alert                              | Threshold                    | Action                                    |
| ---------------------------------- | ---------------------------- | ----------------------------------------- |
| Health check failure               | 2 consecutive failures       | Investigate database connectivity          |
| API response time > 5s             | 95th percentile              | Check database query performance           |
| Function error rate > 1%           | Over 5-minute window         | Review Vercel function logs                |
| Database connection pool exhausted | > 80% utilization            | Increase pool size or optimize queries     |
| Build failure                      | Any failure on main branch   | Review build logs, check Prisma migrations |

---

## Post-Deployment Verification

After each deployment, verify the application is functioning correctly:

### 1. Health Check

```bash
curl -s https://your-app.vercel.app/api/health | jq .
```

Expected: `"status": "ok"` and `"database": "connected"`.

### 2. Authentication

1. Navigate to `https://your-app.vercel.app/login`.
2. Sign in with a demo account (e.g., `admin@dbs.com` / `password123`).
3. Verify redirect to `/dashboard`.

### 3. API Endpoints

```bash
# Test application list (requires authentication — use a session cookie or test via browser)
curl -s https://your-app.vercel.app/api/health

# Test that unauthenticated requests are rejected
curl -s -o /dev/null -w "%{http_code}" https://your-app.vercel.app/api/applications
# Expected: 401
```

### 4. Core Workflow

1. Create a new application via the Intake form.
2. Upload a document.
3. Trigger AI extraction.
4. Run cross-validation.
5. Generate a recommendation.
6. Submit an analyst review.

### 5. Audit Trail

1. Navigate to `/dashboard/audit`.
2. Verify that recent actions are logged.

---

## Troubleshooting Common Issues

### Build Failures

#### `Error: @prisma/client did not initialize yet`

**Cause:** The Prisma Client was not generated before the build.

**Fix:** Ensure the build command includes `prisma generate`:

```
npx prisma generate && next build
```

#### `Error: P1001: Can't reach database server`

**Cause:** The `DATABASE_URL` is incorrect or the database is not accessible from Vercel's network.

**Fix:**
1. Verify the `DATABASE_URL` in Vercel environment variables.
2. Ensure the database allows connections from Vercel's IP ranges (most managed providers allow this by default).
3. Check that SSL is enabled: append `?sslmode=require` to the connection string.

#### `Error: P3009: migrate found failed migrations`

**Cause:** A previous migration failed and left the database in an inconsistent state.

**Fix:**
1. Connect to the database and inspect the `_prisma_migrations` table.
2. Delete the failed migration row.
3. Re-run `npx prisma migrate deploy`.

#### `Error: Module not found: Can't resolve '@prisma/client'`

**Cause:** The `prisma generate` step was skipped or failed silently.

**Fix:** Add `prisma generate` as a `postinstall` script in `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Runtime Errors

#### `Error: NEXTAUTH_SECRET is not set`

**Cause:** The `NEXTAUTH_SECRET` environment variable is missing.

**Fix:** Add `NEXTAUTH_SECRET` to Vercel environment variables for all environments (Production, Preview, Development).

#### `Error: NEXTAUTH_URL is not set` (Preview Deployments)

**Cause:** `NEXTAUTH_URL` is not configured for preview deployments.

**Fix:** Either:
- Set `NEXTAUTH_URL` to `https://${VERCEL_URL}` for preview environments.
- Upgrade to NextAuth.js v4.24+ which auto-detects the URL on Vercel.

#### `504 Gateway Timeout` on API Routes

**Cause:** Database queries are taking too long, or the connection pool is exhausted.

**Fix:**
1. Check database query performance in your provider's dashboard.
2. Add database indexes for frequently queried columns.
3. Increase the connection pool size in the connection string: `?connection_limit=10`.
4. Ensure Vercel functions and the database are in the same region.

#### `401 Unauthorized` on All API Requests

**Cause:** JWT session is invalid or `NEXTAUTH_SECRET` changed between deployments.

**Fix:**
1. Verify `NEXTAUTH_SECRET` is consistent across deployments.
2. Clear browser cookies and sign in again.
3. Check that the `NEXTAUTH_URL` matches the actual deployment URL.

#### `500 Internal Server Error` with No Logs

**Cause:** An unhandled exception in a Server Component or API route.

**Fix:**
1. Check Vercel function logs for the specific error.
2. Ensure all environment variables are set.
3. Verify database connectivity via the `/api/health` endpoint.

### Database Issues

#### Connection Pool Exhaustion

**Symptoms:** Intermittent `P2024: Timed out fetching a new connection from the connection pool` errors.

**Fix:**
1. Use a connection pooler (PgBouncer via Supabase, or Neon's built-in pooler).
2. Reduce the connection limit in the Prisma connection string: `?connection_limit=5`.
3. Ensure the Prisma client is a singleton (the project already handles this in `src/lib/db.ts`).

#### Migration Drift

**Symptoms:** The database schema doesn't match the Prisma schema.

**Fix:**
1. Run `npx prisma db pull` to introspect the current database schema.
2. Compare with `prisma/schema.prisma`.
3. Create a new migration to reconcile: `npx prisma migrate dev --name fix_drift`.
4. Apply to production: `npx prisma migrate deploy`.

---

## Rollback Procedures

### Rolling Back a Vercel Deployment

Vercel maintains a history of all deployments. To roll back:

1. Navigate to your Vercel project dashboard.
2. Go to **Deployments**.
3. Find the last known good deployment.
4. Click the **three-dot menu (⋯)** next to the deployment.
5. Select **Promote to Production**.

This instantly routes all production traffic to the selected deployment.

### Rolling Back via Vercel CLI

```bash
# List recent deployments
vercel ls

# Promote a specific deployment to production
vercel promote <deployment-url>
```

### Rolling Back Database Migrations

> **Warning:** Database rollbacks are destructive and may cause data loss. Always back up before rolling back.

Prisma does not natively support `migrate down`. To roll back a migration:

1. **Back up the database:**

   ```bash
   pg_dump -h host -U user -d dbs_loan_verification > backup_before_rollback.sql
   ```

2. **Manually reverse the migration** by writing SQL to undo the changes:

   ```bash
   psql -h host -U user -d dbs_loan_verification -f rollback.sql
   ```

3. **Mark the migration as rolled back** in the `_prisma_migrations` table:

   ```sql
   DELETE FROM _prisma_migrations WHERE migration_name = '20241101_migration_name';
   ```

4. **Remove the migration file** from `prisma/migrations/` in your repository.

5. **Redeploy** the previous version of the application.

### Full Rollback Procedure (Application + Database)

For a complete rollback when both application code and database schema need to revert:

1. **Back up the current database state.**
2. **Roll back the database migration** (see above).
3. **Promote the previous Vercel deployment** to production.
4. **Verify** the health check endpoint returns `200`.
5. **Test** core functionality (login, application list, document upload).

---

## Security Checklist

Before going live, verify the following:

- [ ] `NEXTAUTH_SECRET` is a unique, cryptographically random value (≥ 32 bytes).
- [ ] `NEXTAUTH_SECRET` is different for each environment (production, preview, development).
- [ ] `DATABASE_URL` uses SSL: connection string includes `?sslmode=require`.
- [ ] Default demo passwords have been changed in the production database.
- [ ] `.env` file is NOT committed to version control (verify `.gitignore`).
- [ ] Vercel environment variables are scoped correctly (production vs. preview).
- [ ] Database access is restricted to Vercel's IP ranges (if your provider supports IP allowlisting).
- [ ] CORS headers are configured appropriately (Next.js handles this by default for same-origin).
- [ ] All API routes enforce role-based access control via the `withRole` middleware.
- [ ] JWT sessions expire after 24 hours (configured in `src/lib/auth.ts`).
- [ ] Audit logging is active and recording all significant actions.
- [ ] The `/api/health` endpoint does NOT expose sensitive information.

---

## Performance Considerations

### Database Connection Pooling

Serverless environments create a new database connection for each function invocation. Without pooling, this quickly exhausts the database's connection limit.

**Recommended configuration:**

```
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=5&pool_timeout=10"
```

- `connection_limit=5` — Limits connections per serverless function instance.
- `pool_timeout=10` — Timeout in seconds for acquiring a connection from the pool.

### Prisma Client Singleton

The project already implements a Prisma client singleton in `src/lib/db.ts` to prevent multiple client instances in development (hot reload). This pattern is critical for production serverless deployments as well.

### Edge Function Considerations

The application uses standard Node.js serverless functions (not Edge Functions). If you need Edge Functions for specific routes, note that Prisma Client does not run on the Edge runtime. Use Prisma Accelerate or Data Proxy for Edge compatibility.

### Caching

For frequently accessed data (e.g., application lists, audit logs), consider:

1. **Vercel's built-in ISR** (Incremental Static Regeneration) for dashboard pages.
2. **HTTP Cache-Control headers** on API responses for read-heavy endpoints.
3. **Database query caching** via your provider's built-in caching layer.

### Cold Start Optimization

Vercel serverless functions may experience cold starts (100–500ms). To minimize impact:

1. Keep function bundles small — avoid importing unnecessary modules.
2. Use dynamic imports for heavy dependencies.
3. Co-locate functions and database in the same region.

---

## Support

For deployment issues specific to this project:

1. Check the [Troubleshooting](#troubleshooting-common-issues) section above.
2. Review Vercel function logs in the project dashboard.
3. Verify database connectivity via `/api/health`.
4. Inspect the `_prisma_migrations` table for migration issues.

For platform-specific issues:

- **Vercel:** [vercel.com/docs](https://vercel.com/docs)
- **Prisma:** [prisma.io/docs](https://www.prisma.io/docs)
- **Neon:** [neon.tech/docs](https://neon.tech/docs)
- **Supabase:** [supabase.com/docs](https://supabase.com/docs)
- **NextAuth.js:** [next-auth.js.org](https://next-auth.js.org)