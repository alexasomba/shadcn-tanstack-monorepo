## 2026-07-15T05:52:34Z

You are a worker tasked with setting up the E2E testing infrastructure for the SaaS expansion.
Your working directory is /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m1_infra.

Tasks:

1. Create a new package `apps/e2e-tests` in the monorepo workspace.
2. Write `apps/e2e-tests/package.json`:
   - Name: `e2e-tests`
   - Include scripts: `"test": "vp test run"`
   - Include dependencies: `vitest` (catalog:), `vite-plus` (catalog:), `better-sqlite3` (catalog:), `data-ops` (workspace:_), `data-service` (workspace:_).
3. Write `apps/e2e-tests/vite.config.ts`:
   - Configures vitest to include `"src/**/*.test.ts"`.
4. Write `apps/e2e-tests/tsconfig.json`:
   - Extends or matches the settings in other workspace tsconfig.json files.
5. Create `apps/e2e-tests/src/helpers.ts` containing setup helpers for tests:
   - `setupTestDb()`: initializes an in-memory D1 mock (using `better-sqlite3` and applying the migrations from `packages/data-ops/src/drizzle/migrations`).
   - Mock implementations for:
     - R2Bucket (with PUT, GET, DELETE, list, etc. that simulates storage).
     - Cloudflare Workflows (UserOnboardingWorkflow, OrgOnboardingWorkflow mock execution and step tracing).
     - Sentry transport/client (spying on captured exceptions).
6. Create `TEST_INFRA.md` in the project root. Refer to the template in AGENTS.md. Include the Feature Inventory (Tiers 1-3), Test Architecture, and Coverage Thresholds.
7. Run `vp install` or `pnpm install` and check that `vp run --filter e2e-tests test` runs successfully (it can exit with no test files or pass with no tests for now, but must compile).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Provide a handoff report at /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m1_infra/handoff.md detailing the files created, configurations set up, and test runner outputs.
