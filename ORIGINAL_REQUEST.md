# Original User Request

## Initial Request — 2026-07-15T04:46:57Z

Enhance the current Cloudflare-focused TanStack Start and Hono monorepo with production SaaS features: Paystack subscription billing, Cloudflare R2 uploads, tenant organization, developer API keys, durable workflows, mock seeding, and Sentry monitoring.

Working directory: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo
Integrity mode: development

## Requirements

### R1. Paystack Subscriptions, Organization & API Key Plugins

Integrate `@alexasomba/better-auth-paystack` to manage billing and subscriptions. Integrate the Better Auth `organization` plugin for tenant management and the `api-key` plugin for programmatic access.

- Authenticate API endpoints under `data-service` using developer API keys.
- Store subscription status, active billing plans, and tenant associations in D1.

### R2. Cloudflare R2 Presigned File Uploads

Configure a Cloudflare R2 bucket for file storage.

- Provide helper utilities in `packages/data-ops` to generate presigned upload and download URLs.
- Allow clients to upload files (e.g. avatars, workspace logos) directly to R2 using these presigned URLs.

### R3. Cloudflare Workflows (Durable Onboarding)

Configure Cloudflare Workflows to execute stateful, multi-step onboarding sequences.

- Trigger `UserOnboardingWorkflow` when a user registers.
- Trigger `OrgOnboardingWorkflow` when a user creates or joins an organization.
- Implement durable steps (e.g. sending welcome notification, setting initial limits, checking verification status after a delay).

### R4. Database Seeding using drizzle-seed

Implement seed configurations using `drizzle-seed` in `packages/data-ops` to populate D1 with realistic mock data (tenants, users, todos, domains, CRM entries) for local development.

### R5. Observability with Sentry

Integrate Sentry SDKs across all applications:

- Frontend apps (`user-web`, `admin-web`) to track errors and performance.
- Backend services (`data-service`, `agents`) to track errors in API endpoints and chat handlers.

## Acceptance Criteria

### Authentication & Subscriptions

- [ ] Local database schema reflects all tables and fields required by Paystack, organization, and API key plugins.
- [ ] Endpoints in `data-service` can be successfully queried and authorized using a valid API key header.

### Storage & Uploads

- [ ] A local test script or integration test successfully requests a presigned URL, performs a PUT upload of a file mock directly to the local/mock R2 bucket, and verifies it exists.

### Workflows

- [ ] Onboarding workflows can be triggered locally, executing all steps successfully in the Miniflare/Wrangler local development environment.

### Seeding & Observability

- [ ] Running the seeding script (`pnpm --filter data-ops db:seed` or equivalent) populates the local SQLite/D1 database without integrity errors.
- [ ] A dedicated `/api/debug/sentry-test` endpoint or function triggers a Sentry test exception to verify correct event transmission.
