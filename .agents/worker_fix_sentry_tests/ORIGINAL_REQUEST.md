# Objective

Fix the compilation and runtime test failures inside `apps/data-service` caused by the Sentry worker wrapping.

## Required Changes:

1. In `apps/data-service/src/index.ts`:
   - Check if running inside test environment (`process.env.VITEST`).
   - If in test environment, export `worker` directly without wrapping it in Sentry.
   - If not in test environment, wrap it with `Sentry.withSentry`.
   - Cast the default export as `typeof worker` (or `ExportedHandler<Bindings, JobsQueueMessage>`) so that the exported type is identical to the unwrapped worker. This fixes all TypeScript compilation errors where test files try to access `worker.fetch`.
     Example:

   ```typescript
   const isTest =
     typeof process !== "undefined" && (process.env.VITEST || process.env.NODE_ENV === "test");

   export default (isTest
     ? worker
     : Sentry.withSentry(
         (env: any) => ({
           dsn: env.SENTRY_DSN || env.VITE_SENTRY_DSN || "https://mock-dsn@sentry.io/123",
           tracesSampleRate: 1.0,
         }),
         worker,
       )) as typeof worker;
   ```

2. Verify all compile, lint, and test checks pass:
   - Run `pnpm --filter data-service build` or `vp run --filter data-service check` to verify TypeScript compile checks.
   - Run vitest inside `apps/data-service`: `pnpm --filter data-service test` (or `vp run --filter data-service test`).
   - Run E2E tests: `vp run --filter e2e-tests test`.
   - Run `vp check` at root.
3. Write your handoff report to `handoff.md` in your working directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.

## 2026-07-15T11:39:16Z

Please fix the test suite failures and compilation errors caused by Sentry wrapping in data-service. Read .agents/worker_fix_sentry_tests/ORIGINAL_REQUEST.md for specific tasks. Run TypeScript compiles, Vitest tests for data-service, and E2E tests to ensure everything compiles and passes cleanly. Write your handoff to .agents/worker_fix_sentry_tests/handoff.md when complete.
