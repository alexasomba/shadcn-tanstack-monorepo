## 2026-07-15T16:25:50Z

You are the Worker. Your task is to implement the fixes for the gaps identified in Phase 2: Adversarial Coverage Hardening for Milestone 7.

Your working directory is: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m7_phase2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please execute the following changes systematically:

1. Paystack Subscriptions Configuration:
   - In `packages/data-ops/src/auth/plugins.ts`, update `paystack(...)` plugin registration to include `subscription: { enabled: true }`.
   - Run `vp run --filter data-ops auth:generate` to regenerate `./src/drizzle/schema/auth.ts`.
   - Run `vp run --filter data-ops db:generate` to generate the new Drizzle migrations.
   - Run `vp run --filter data-ops db:migrate:local` to apply them.
   - Run `pnpm --filter data-ops build` to rebuild `data-ops` and run `vp pack`.

2. Tenant Isolation & Cross-Tenant Scoping for Todos:
   - In `packages/data-ops/src/drizzle/schema/core.ts`, update the `todos` table schema definition to add `organizationId` referencing `organization.id` (not null, cascade onDelete).
   - Regenerate the Drizzle schema and migrations by running:
     - `vp run --filter data-ops db:generate`
     - `vp run --filter data-ops db:migrate:local`
     - `pnpm --filter data-ops build`
   - In `packages/data-ops/src/queries/todos.ts`, modify query functions (`listTodos`, `getTodoById`, `createTodo`, `updateTodo`, `deleteTodo`) to filter/insert by `organizationId`.
   - In Hono `todos` endpoint files under `apps/data-service/src/endpoints/todos/` (`list.ts`, `create.ts`, `read.ts`, `update.ts`, `delete.ts`):
     - Extract `organizationId` from `session.activeOrganizationId` (return 401 unauthorized if missing).
     - Pass `organizationId` to the query helpers.

3. Developer API Keys Limits & Expiration Error Mapping:
   - In Hono API Key middleware (`apps/data-service/src/middleware/api-key.ts`), catch and distinguish the error types when `verifyApiKey` throws an error or fails. Distinguish rate limiting, usage limits, or revocation to return proper error code/messages and HTTP status codes (e.g. 403 Forbidden for limits exceeded/revoked, 401 Unauthorized for invalid/expired keys).

4. Sentry Exception Monitoring Telemetry:
   - In Hono endpoints (like domains, todos, etc.), when `Result.isError(result)` is checked, if it's a database deadlock or database query failure, throw the error (or explicitly call `Sentry.captureException`) so that it gets recorded by Sentry and doesn't get silently swallowed by the early 500 JSON response.

5. E2E Test Suite Alignment:
   - In `apps/e2e-tests/src/tier1.test.ts` and `apps/e2e-tests/src/tier2.test.ts`, clean up the custom `fetchWrapper` mock/interceptor logic for `todo_organizations` and `/todos`. Let the requests delegate to the actual Hono app (`worker.fetch`) so that the real Hono tenant isolation for todos is executed and verified.
   - Run and verify all tests pass:
     - `vp run --filter data-service test`
     - `vp run --filter e2e-tests test`

Verify that the build and tests pass successfully, and compile a handoff report (handoff.md) in your working directory. Message your parent (conversation ID: 43242d62-69a5-4c6e-9e1d-efb3f2103db4) when complete.
