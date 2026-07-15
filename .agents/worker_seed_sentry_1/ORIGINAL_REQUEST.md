# Objective

Complete R4 (Database Seeding) and R5 (Sentry monitoring) in the monorepo.

## Details:

### Part 1: Database Seeding (R4)

1. Modify `packages/data-ops/src/database/seed.ts` to seed all the following tables using `drizzle-seed`:
   - `user` (count: 2)
   - `organization` (count: 1)
   - `todos` (count: 1)
   - `domains` (count: 1)
   - `crmContacts` (count: 1)
   - `crmCompanies` (count: 1)
   - `crmDeals` (count: 1)
   - `crmNotes` (count: 1)
   - `crmTickets` (count: 1)
   - `crmTasks` (count: 1)
     Make sure all tables are properly reset in the `reset` call as well. Ensure that the refined fields are valid and deterministic.
2. In `apps/data-service/src/endpoints/database/verify.ts` and `schemas.ts`, update `/seed/verify` endpoint to also return the counts for:
   - `domains`
   - `crmContacts`
   - `crmCompanies`
   - `crmDeals`
   - `crmNotes`
   - `crmTickets`
   - `crmTasks`
     These counts should be returned in the response JSON and defined as optional in `VerifyResponseSchema` (to maintain backward compatibility with `seed.test.ts`).
3. Rebuild `packages/data-ops` using `pnpm --filter data-ops build` or `vp run --filter data-ops build`.

### Part 2: Sentry monitoring (R5)

1. For Hono service `data-service`:
   - Ensure `@sentry/cloudflare` is imported and wrap the exported handler `worker` in `apps/data-service/src/index.ts` with `Sentry.withSentry`:
     ```typescript
     export default Sentry.withSentry(
       (env) => ({
         dsn: env.SENTRY_DSN || env.VITE_SENTRY_DSN || "https://mock-dsn@sentry.io/123",
         tracesSampleRate: 1.0,
       }),
       worker,
     );
     ```
   - In Hono's `app.onError` handler, call `Sentry.captureException(err)`.
   - Add a route `GET /api/debug/sentry-test` in Honos `app` that captures and throws a Sentry test exception.
2. For backend service `agents`:
   - Add `"@sentry/cloudflare": "^10.65.0"` as dependency to `apps/agents/package.json`.
   - Run `vp install`.
   - Import `withSentry` from `@sentry/cloudflare` in `apps/agents/src/server.ts` and wrap the default exported handler.
   - Intercept requests to `/api/debug/sentry-test` in the `fetch` handler of `ChatAgent` to throw a Sentry test exception.
3. For frontend apps `user-web` and `admin-web`:
   - Initialize Sentry client-side in `apps/user-web/src/router.tsx` and `apps/admin-web/src/router.tsx` using `@sentry/tanstackstart-react`:

     ```typescript
     import * as Sentry from "@sentry/tanstackstart-react";

     if (typeof window !== "undefined") {
       const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
       if (sentryDsn) {
         Sentry.init({
           dsn: sentryDsn,
           sendDefaultPii: true,
           tracesSampleRate: 1.0,
           replaysSessionSampleRate: 0.1,
           replaysOnErrorSampleRate: 1.0,
         });
       }
     }
     ```

   - Create API route files `apps/user-web/src/routes/api/debug/sentry-test.ts` and `apps/admin-web/src/routes/api/debug/sentry-test.ts` to trigger a Sentry exception on the server:

     ```typescript
     import { createFileRoute } from "@tanstack/react-router";
     import * as Sentry from "@sentry/tanstackstart-react";

     export const Route = createFileRoute("/api/debug/sentry-test")({
       server: {
         handlers: {
           GET: async () => {
             const error = new Error("Sentry test exception");
             Sentry.captureException(error);
             throw error;
           },
         },
       },
     });
     ```

   - Ensure the new routes are compiled and registered.

### Part 3: Validation and Verification

1. Run `vp install` at root to verify all node_modules are present and correct.
2. Run data-service unit tests: `vp run --filter data-service test` (or specific seed tests).
3. Run E2E tests: `vp run --filter e2e-tests test`.
4. Run code checkers: `vp check` to ensure there are no lint or formatting errors.
5. Write your handoff report to `handoff.md` in your working directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.

## 2026-07-15T11:12:20Z

Please implement database seeding (R4) and Sentry monitoring (R5). Read your instructions in .agents/worker_seed_sentry_1/ORIGINAL_REQUEST.md. Run pnpm/vp install first, build packages/data-ops, then implement and verify via vitest / E2E tests, and vp check. Write your handoff report to .agents/worker_seed_sentry_1/handoff.md.
