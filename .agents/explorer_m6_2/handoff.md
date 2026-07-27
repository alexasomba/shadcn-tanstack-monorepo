# Handoff Report — Sentry Integration for Cron Tasks

This report presents the findings, logic chain, and proposed design for the Sentry integration of scheduled cron tasks in the `data-service` application.

## 1. Observation

During our read-only investigation, the following files and code snippets were inspected:

1. **`apps/data-service/src/jobs/cron.ts`** (Lines 26–36):

   ```typescript
   async function cronTask(name: string, fn: () => Promise<void>): Promise<void> {
     const start = Date.now();
     try {
       console.log(`[cron:${name}] start`);
       await fn();
       console.log(`[cron:${name}] done`, { durationMs: Date.now() - start });
     } catch (error) {
       console.error(`[cron:${name}] error`, { durationMs: Date.now() - start, error });
       throw error;
     }
   }
   ```

   _Observational Fact_: There is currently no import of Sentry, nor does it capture error telemetry.

2. **`apps/data-service/src/index.ts`** (Lines 175–183):

   ```typescript
   export default (isTest
     ? worker
     : Sentry.withSentry(
         (env: any) => ({
           dsn: env.SENTRY_DSN || env.VITE_SENTRY_DSN || "https://mock-dsn@sentry.io/123",
           tracesSampleRate: 1.0,
         }),
         worker as any,
       )) as typeof worker;
   ```

   _Observational Fact_: In production runtime configurations (`!isTest`), the worker is fully wrapped with `Sentry.withSentry` using the `@sentry/cloudflare` SDK.

3. **`apps/data-service/package.json`** (Line 28):

   ```json
   "@sentry/cloudflare": "^10.65.0",
   ```

   _Observational Fact_: `@sentry/cloudflare` is already installed as a dependency in the package.

4. **`apps/data-service/src/endpoints/workflows/crash.ts`** (Lines 66–70):
   ```typescript
   Sentry.captureException(crashError, {
     tags: {
       workflowInstanceId: id,
     },
   });
   ```
   _Observational Fact_: Custom tags are passed inline to `Sentry.captureException(...)` in other modules.

---

## 2. Logic Chain

1. **Telemetry Instrumentation**: The worker is already wrapped in `Sentry.withSentry` via `index.ts`. However, when unhandled errors bubble up to the global handler, they lack specific context about _which_ cron task failed or when it was scheduled.
2. **Context Enrichment**: In order to pass proper context tags (`task_name`, `scheduled_time`, and `cron_trigger`) to Sentry, the `cronTask` function must be updated to receive the `ScheduledEvent` context.
3. **Execution Safety**: Sentry's `Sentry.captureException` should be called inside the catch block of `cronTask` using inline `tags` and `extra` parameters.
4. **Platform Propagation**: The exception must be rethrown using `throw error` after capturing telemetry, ensuring the Cloudflare runtime detects the execution failure (necessary for logging and scheduling retries).
5. **Vitest Compatibility**: In tests, `isTest` is `true` so `Sentry.withSentry` is bypassed. By mocking `@sentry/cloudflare` inside the testing environment (similar to `workflows.test.ts`), we can verify telemetry calls without needing real DSN credentials or generating mock errors in tests.

---

## 3. Caveats

- **No Source Modification**: As a read-only explorer agent, no production code or tests were modified directly. All proposed integrations are located in this folder as `proposed_cron.ts`, `proposed_cron.test.ts`, and `cron.patch`.
- **Double-Reporting**: Since we call `captureException` inside the catch block and then rethrow the error, Sentry's global `withSentry` boundary might see the same exception. However, Sentry's SDK automatically deduplicates matching exception instances, ensuring they appear as single events with the custom tags we injected.

---

## 4. Conclusion

The integration can be cleanly accomplished by updating `cronTask` to accept an optional `context` object containing `scheduledTime` and `cron` trigger values, capturing the exception with inline tags, and rethrowing it.

A complete implementation proposal has been written to:

- `.agents/explorer_m6_2/proposed_cron.ts`
- `.agents/explorer_m6_2/proposed_cron.test.ts`
- `.agents/explorer_m6_2/cron.patch`

---

## 5. Verification Method

To verify the integration independently:

1. Apply the patch `cron.patch` to `apps/data-service/src/jobs/cron.ts`.
2. Save `proposed_cron.test.ts` to `apps/data-service/src/jobs/cron.test.ts` (or `apps/data-service/src/cron.test.ts`).
3. Run the Vitest test suite inside `apps/data-service`:
   ```bash
   vp test
   ```
4. Verify that all 7 test files (including the newly added `cron.test.ts`) compile and pass successfully.
