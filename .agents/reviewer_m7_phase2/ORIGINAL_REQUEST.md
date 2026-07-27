## 2026-07-15T16:43:19Z

You are the Reviewer. Your task is to perform the review of the changes implemented for Milestone 7 Phase 2.
Your working directory is: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/reviewer_m7_phase2

Instructions:

1. Initialize your BRIEFING.md and progress.md immediately under your working directory, and start a liveness heartbeat timer/cron using the schedule tool.
2. Review the code changes made by the Worker in the following files:
   - `packages/data-ops/src/auth/plugins.ts`
   - `packages/data-ops/src/drizzle/schema/core.ts`
   - `packages/data-ops/src/queries/todos.ts`
   - `apps/data-service/src/endpoints/todos/*`
   - `apps/data-service/src/endpoints/domains/*`
   - `apps/data-service/src/middleware/api-key.ts`
   - `apps/user-web/src/lib/todos.functions.ts`
   - `apps/admin-web/src/lib/todos.functions.ts`
   - `apps/data-service/src/adversarial.test.ts`
3. Check the correctness, completeness, robustness, and interface compliance of the changes. Specifically, verify that:
   - Paystack subscription options correctly enable subscription.
   - Todos tenant isolation correctly uses the `organizationId` foreign key and prevents cross-tenant access.
   - API key middleware returns 403 Forbidden for revoked/exceeded keys and 401 for invalid/expired keys.
   - Database failure early-returns report exceptions to Sentry.
4. Run the test commands to verify all tests pass:
   - `vp run --filter data-service test`
   - `vp run --filter e2e-tests test`
5. Compile a review report (handoff.md) in your working directory outlining your findings and verdict (pass/fail).
6. Message your parent (conversation ID: 43242d62-69a5-4c6e-9e1d-efb3f2103db4) when complete.
