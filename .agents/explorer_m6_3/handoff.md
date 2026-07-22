# Handoff Report - explorer_m6_3

## 1. Observation

1. **Hono Router Exception Capture**:
   - Location: `apps/data-service/src/index.ts` lines 38-48:
     ```ts
     app.onError((err, c) => {
       console.error("[data-service] unhandled error:", err);
       Sentry.captureException(err);
       return c.json(
         {
           success: false,
           error: { code: "INTERNAL_ERROR", message: "Internal Server Error" },
         },
         500,
       );
     });
     ```
   - Debug Endpoint: `apps/data-service/src/index.ts` lines 138-142:
     ```ts
     app.get("/api/debug/sentry-test", (c) => {
       const error = new Error("Sentry test exception");
       Sentry.captureException(error);
       throw error;
     });
     ```

2. **Workflows Exception Capture**:
   - Location: `apps/data-service/src/endpoints/workflows/crash.ts` lines 63-70:

     ```ts
     const crashError = new Error("Workflow step crashed");

     // Capture exception via Sentry, mapping workflow metadata tags
     Sentry.captureException(crashError, {
       tags: {
         workflowInstanceId: id,
       },
     });
     ```

3. **Queue Consumers Exception Capture**:
   - Location: `apps/data-service/src/jobs/queue.ts` lines 17-25:
     ```ts
     for (const message of batch.messages) {
       try {
         await handleJobMessage(message.body, env);
         message.ack();
       } catch (error) {
         console.error("[queue:jobs] handler failed", { body: message.body, error });
         message.retry();
       }
     }
     ```
   - **Gaps**: There is no call to `Sentry.captureException(error)` in the `catch` block. The exception is swallowed locally and retried, meaning Sentry is completely unaware of queue execution errors.

4. **Cron Tasks Exception Capture**:
   - Location: `apps/data-service/src/jobs/cron.ts` lines 26-36:
     ```ts
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
   - **Gaps**: Although it rethrows (letting the error propagate to the worker level where it gets captured by the runtime's Sentry wrapper in production), during test execution the Sentry wrapper is bypassed (`process.env.VITEST` is true in `index.ts`), so the mock Sentry `captureException` spy is not invoked.

---

## 2. Logic Chain

1. **Hono and Workflows**:
   - The Hono router (`app.onError`) and workflow steps (`crashWorkflowHandler`) already explicitly capture exceptions via `Sentry.captureException`.
   - Testing them requires a client-side fetch request using `worker.fetch(...)` with the mock D1 database configured in `env`. We can assert that `captureException` receives the thrown error and context tags (e.g. `workflowInstanceId`).

2. **Queue Jobs Observability**:
   - Since the exception is caught and swallowed in `handleJobsBatch`, Sentry never sees it. To verify queue job Sentry capture, we must first add `Sentry.captureException` to `handleJobsBatch`'s `catch` block (enriching it with `jobType` and `jobId` tags).
   - Once implemented, calling `worker.queue(batch, env)` with a failing batch (e.g. database query failure during outbox drain) will invoke the catch block and call `captureException`.

3. **Cron Tasks Observability**:
   - During Vitest testing, the raw worker is exported and executed directly, bypassing the `Sentry.withSentry` runtime wrapper. Consequently, unhandled exceptions thrown by `worker.scheduled(...)` are not captured by Sentry.
   - To make it testable and robust, we capture the exception explicitly inside `cronTask` before rethrowing it. This ensures we can test it directly under Vitest using the mock spy.

4. **Database Mocking**:
   - To invoke the failure paths for Queue Outbox draining and Cron Tasks (both calling `drainOutbox`), we can supply a mock D1Database object whose `prepare` or query method throws an error. This will trigger the exception handlers cleanly.

---

## 3. Caveats

- We assumed that `Sentry.withSentry` behaves standardly on the Cloudflare Worker platform in production, but we explicitly designed the cron task to capture exception directly in `cronTask` to guarantee testability under Vitest and richer tagging.
- Database mocking mimics D1 behavior using `better-sqlite3`. We assumed standard `MessageBatch` and `ScheduledEvent` structures for queue and cron triggers during test execution.

---

## 4. Conclusion

Milestone 6 (R5) requires a comprehensive design of integration tests checking Sentry exception capturing across the Hono router, workflows, queue/outbox jobs, and cron tasks.

1. The Hono router and Workflows components are already equipped with `Sentry.captureException` calls.
2. The Queue/Outbox jobs and Cron Tasks require minor enhancements to invoke `Sentry.captureException` with correct tags (`jobType`, `jobId`, and `cronTask`).
3. We have provided `proposed_queue.ts` and `proposed_cron.ts` implementing these enhancements.
4. We have provided `proposed_sentry.test.ts` as the integration test suite that tests all four paths under Vitest, using a mocked Sentry spy and an error-inducing database mock.

---

## 5. Verification Method

To verify the integration tests:

1. Apply the proposed enhancements to `apps/data-service/src/jobs/queue.ts` and `apps/data-service/src/jobs/cron.ts`.
2. Save the proposed test file `proposed_sentry.test.ts` as `apps/data-service/src/sentry.test.ts`.
3. Execute the tests in the workspace using the command:
   ```bash
   vp test run
   ```
4. Confirm that all test cases pass and the Sentry spy receives the exact error instances and tags (e.g., `workflowInstanceId`, `jobType`, `jobId`, `cronTask`).
