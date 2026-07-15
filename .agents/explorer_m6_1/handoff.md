# Handoff Report — Sentry Integration for Queue/Outbox Job Exceptions

This report outlines the observations, reasoning, design, and verification method for Sentry integration inside the data-service queue and outbox processor.

---

## 1. Observation

Direct observations in the codebase:

- **Observation 1 (Caught queue errors do not bubble up to entrypoint Sentry)**:
  In `apps/data-service/src/jobs/queue.ts` lines 17-25:
  ```typescript
  17:   for (const message of batch.messages) {
  18:     try {
  19:       await handleJobMessage(message.body, env);
  20:       message.ack();
  21:     } catch (error) {
  22:       console.error("[queue:jobs] handler failed", { body: message.body, error });
  23:       message.retry();
  24:     }
  25:   }
  ```
  Since the catch block captures the error, calls `message.retry()`, and does not rethrow or call Sentry, the exception is swallowed from the perspective of Sentry.
- **Observation 2 (Outbox processor rethrows errors to the queue batch loop)**:
  In `apps/data-service/src/jobs/queue.ts` lines 75-78:

  ```typescript
  75:       } catch (error) {
  76:         console.error(`[outbox] failed to process notification id=${event.id}`, error);
  77:         throw error;
  78:       }
  ```

  While the outbox processor logs and rethrows, the error is caught by `handleJobsBatch` (Observation 1), so Sentry never captures it.

- **Observation 3 (Sentry initialization exists on the default export worker)**:
  In `apps/data-service/src/index.ts` lines 175-183:

  ```typescript
  175: export default (isTest
  176:   ? worker
  177:   : Sentry.withSentry(
  178:       (env: any) => ({
  179:         dsn: env.SENTRY_DSN || env.VITE_SENTRY_DSN || "https://mock-dsn@sentry.io/123",
  180:         tracesSampleRate: 1.0,
  181:       }),
  182:       worker as any,
  183:     )) as typeof worker;
  ```

  This indicates that Sentry is initialized when wrapping the worker handlers, allowing `Sentry.captureException` to work properly in the worker context when `isTest` is false.

- **Observation 4 (Drizzle Outbox schema has primary key and type)**:
  In `packages/data-ops/src/drizzle/schema/core.ts` lines 20-32:
  ```typescript
  20: export const outboxEvents = sqliteTable(
  21:   "outbox_events",
  22:   {
  23:     id: integer({ mode: "number" }).primaryKey({
  24:       autoIncrement: true,
  25:     }),
  26:     type: text().notNull(),
  27:     payload: text().notNull(),
  ...
  ```
  This provides the database structure for pending events, ensuring that `id` is a number and `type` is a string.

---

## 2. Logic Chain

1. Since `handleJobsBatch` catches all errors inside the queue processor batch loop and does not rethrow them to the Sentry-wrapped top-level worker (Observation 1), any errors thrown by job processing will go undetected by Sentry.
2. In order to capture these errors, we must import `@sentry/cloudflare` inside `apps/data-service/src/jobs/queue.ts` and explicitly call `Sentry.captureException` within the `catch` blocks.
3. If an error is caught in `drainOutbox` (Observation 2), capturing it there provides high-fidelity metadata (such as outbox `eventId` and `eventType` from Observation 4, and the event payload).
4. However, since the error is rethrown in `drainOutbox`, it will bubble up to `handleJobsBatch`'s catch block. If `handleJobsBatch` also captures it, we will end up with duplicate exceptions in Sentry for the same failure.
5. To avoid duplicate captures while ensuring all generic queue failures (e.g. database query failure outside the outbox event loop, or other job types) are still captured, we can:
   - Assign a `.sentryCaptured = true` flag to the error object when captured inside `drainOutbox`.
   - Check `!error.sentryCaptured` in `handleJobsBatch` before executing a fallback capture.

---

## 3. Caveats

- **Mock Sentry in tests**: Because data-service has unit tests spied on `console.error` (e.g., `api-key.test.ts`), invoking real Sentry SDK calls in test environments might trigger warning logs about invalid DSNs if not mocked. Sentry must be mocked in any newly introduced integration tests.
- **Unhandled Outbox types**: If other event types (such as `"analytics"`) are added in the future, they will print a warning log but not throw an exception. Unhandled outbox types are therefore not captured as Sentry exceptions under the current design unless they are modified to throw errors.

---

## 4. Conclusion

We conclude that the outbox processor exceptions should be integrated with Sentry using a two-tiered capture strategy:

1. **Tier 1 (Outbox Event Level)**: Capture exceptions in `drainOutbox`'s catch block, supplying tags `eventId` (event.id), `eventType` (event.type), and `jobType: "outbox.drain"`, along with `eventPayload` as extra context. Tag the error with `sentryCaptured = true` and rethrow.
2. **Tier 2 (Queue Message Level)**: Capture exceptions in `handleJobsBatch`'s catch block _only if_ `error.sentryCaptured` is not set. Pass tags `jobType` (message.body.type) and `jobId` (message.id), along with `jobBody` as extra context.

---

## 5. Verification Method

To verify this design, the implementer or testing agent (`explorer_m6_3` / `worker_m6`) should:

1. Perform integration testing in `apps/data-service/src/sentry.test.ts` (using Vite+ test runner: `vp test`).
2. Mock `@sentry/cloudflare` via:
   ```typescript
   vi.mock("@sentry/cloudflare", () => ({
     captureException: vi.fn(),
   }));
   ```
3. Run a test where `drainOutbox` throws a notification processing error (e.g. due to mock transport throw or invalid JSON).
4. Assert that `Sentry.captureException` is called once with:
   - Exception object.
   - Tags: `{ eventId: "<id>", eventType: "notification", jobType: "outbox.drain" }`.
   - Extra context containing the raw event payload.
5. Verify that `Sentry.captureException` was NOT called a second time by the outer queue loop (meaning `error.sentryCaptured` successfully prevented double capture).
6. Run a test where a queue job fails globally (e.g., database connection error).
7. Assert that `Sentry.captureException` is called once with:
   - Exception object.
   - Tags: `{ jobType: "outbox.drain", jobId: "<id>" }` (or other job type).
