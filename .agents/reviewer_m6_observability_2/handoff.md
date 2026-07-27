# Handoff Report - Sentry Observability Review

## 1. Observation

### File Paths and Content Inspected

- **`apps/data-service/src/jobs/queue.ts`**:
  - Lines 19-37:

    ```typescript
    try {
      await handleJobMessage(message.body, env);
      message.ack();
    } catch (error) {
      console.error("[queue:jobs] handler failed", { body: message.body, error });

      // Capture the exception via Sentry only if not already captured
      if (!error || !(error as Record<string, unknown>).sentryCaptured) {
        const jobType = "type" in message.body ? String(message.body.type) : "unknown";
        Sentry.captureException(error, {
          tags: {
            jobType,
            jobId: message.id,
          },
          extra: {
            jobBody: message.body,
          },
        });
      }

      message.retry();
    }
    ```

  - Lines 91-107:
    ```typescript
    } catch (error) {
      console.error(`[outbox] failed to process notification id=${event.id}`, error);
      Sentry.captureException(error, {
        tags: {
          eventId: String(event.id),
          eventType: event.type,
          jobType: "outbox.drain",
        },
        extra: {
          eventPayload: event.payload,
        },
      });
      if (error && typeof error === "object") {
        (error as Record<string, unknown>).sentryCaptured = true;
      }
      throw error;
    }
    ```

- **`apps/data-service/src/jobs/cron.ts`**:
  - Lines 32-60:

    ```typescript
    async function cronTask(
      name: string,
      fn: () => Promise<void>,
      context?: { scheduledTime?: string; cron?: string },
    ): Promise<void> {
      const start = Date.now();
      try {
        console.log(`[cron:${name}] start`);
        await fn();
        console.log(`[cron:${name}] done`, { durationMs: Date.now() - start });
      } catch (error) {
        const durationMs = Date.now() - start;
        console.error(`[cron:${name}] error`, { durationMs, error });

        Sentry.captureException(error, {
          tags: {
            task_name: name,
            cronTask: name,
            ...(context?.scheduledTime ? { scheduled_time: context.scheduledTime } : {}),
            ...(context?.cron ? { cron_trigger: context.cron } : {}),
          },
          extra: {
            durationMs,
          },
        });

        throw error;
      }
    }
    ```

- **`apps/data-service/src/sentry.test.ts`**:
  - Contains integration tests mocking Sentry and verifying router unhandled errors, workflow step crashes, queue jobs, cron tasks, and queue deduplication.

### Verification Commands & Results

- **Command**: `vp test run` inside `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/apps/data-service`
  - **Result**: Completed successfully. All 27 tests passed:
    ```
    ✓ src/workflows.test.ts (8 tests) 392ms
    ✓ src/seed.test.ts (2 tests) 623ms
    ✓ src/sentry.test.ts (5 tests) 134ms
    ```
- **Command**: `vp check` inside `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/apps/data-service`
  - **Result**: Completed clean for checked files (formatting passed).

---

## 2. Logic Chain

1.  **Queue Path Deduplication**:
    - When an outbox event failure occurs during a queue job (`outbox.drain`), the exception is caught in Tier 1 (`drainOutbox` catch block).
    - Tier 1 calls `Sentry.captureException(error, ...)` and sets `error.sentryCaptured = true`. It then rethrows the error.
    - The rethrown error propagates to `handleJobsBatch` (Tier 2).
    - In `handleJobsBatch`, the conditional `if (!error || !(error as Record<string, unknown>).sentryCaptured)` evaluates to `false` because `error.sentryCaptured` is `true`.
    - Therefore, Tier 2 bypasses `Sentry.captureException`. The error is captured exactly once.
2.  **Cron Path Deduplication Failure**:
    - When an outbox event failure occurs during a scheduled cron tick (`handleScheduled`), it also executes `drainOutbox` (via `cronTask`).
    - Tier 1 (`drainOutbox` catch block) catches the failure, calls `Sentry.captureException(error, ...)` (first capture), sets `error.sentryCaptured = true`, and rethrows.
    - The error propagates to `cronTask` (Tier 2).
    - `cronTask` has an unconditional catch block that calls `Sentry.captureException(error, ...)` (second capture). It does not check `error.sentryCaptured`.
    - Therefore, the same error is captured twice in Sentry, violating the duplication prevention requirement.
3.  **Adversarial / Edge Case Analysis**:
    - If `error` is a primitive type (such as a `string` thrown during execution), setting `(error as Record<string, unknown>).sentryCaptured = true;` does not persist on the object. In the queue path, it would bypass the check and cause duplicate capture. However, typical JavaScript/TypeScript errors in database access or network client are instances of `Error`, which are objects.
    - SonarJS cognitive complexity warning in `drainOutbox`: `Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.`

---

## 3. Caveats

- **Primitive Errors**: If a non-object (primitive) is thrown, it is not possible to attach `sentryCaptured = true` in a persistent manner. However, all standard library and framework errors (Drizzle/Miniflare/Better-Auth) are standard `Error` objects, so this risk is low.
- **Database Initial Connection Failures**: If `listPendingOutboxEvents` throws an exception, the error occurs before entering the `try/catch` block inside the loop of `drainOutbox`. Sentry will capture it once in the outer `handleJobsBatch` or `cronTask` catch block, which is correct and expected since Tier 1 did not process the event loop yet.

---

## 4. Conclusion & Quality Verdict

**Verdict**: `REQUEST_CHANGES`

### Quality Findings

- **[Critical] Finding 1: Double Exception Capture in Scheduled Cron Path**:
  - _Where_: `apps/data-service/src/jobs/cron.ts`, inside the `cronTask` catch block (lines 42-59).
  - _Why_: When an outbox drain failure occurs (e.g. notification dispatch failure), `drainOutbox` captures the exception and flags it. However, `cronTask` catches the rethrown error and captures it again unconditionally.
  - _Suggestion_: Add a check `if (!error || !(error as Record<string, unknown>).sentryCaptured)` in the `cronTask` catch block before calling `Sentry.captureException`.
- **[Minor] Finding 2: Cognitive Complexity in `drainOutbox`**:
  - _Where_: `apps/data-service/src/jobs/queue.ts`, line 62.
  - _Why_: The cognitive complexity is 17 (above the SonarJS limit of 15).
  - _Suggestion_: Refactor the notification processing logic inside the loop of `drainOutbox` into a separate function, e.g., `processNotificationEvent`.

---

## 5. Verification Method

### Test Replication Steps

1.  Run the tests to ensure the base suite passes:
    ```bash
    cd apps/data-service
    vp test run
    ```
2.  To verify the duplication issue in the cron path, temporarily add this test to the end of `apps/data-service/src/sentry.test.ts` (just before the last `});`):

    ```typescript
    it("captures outbox processing exception via Tier 1 and prevents duplicate Tier 2 capture in cron tasks", async () => {
      const d1 = await setupTestDb();
      await d1
        .prepare(
          "INSERT INTO outbox_events (type, payload, created_at, processed_at) VALUES (?, ?, ?, ?)",
        )
        .bind(
          "notification",
          JSON.stringify({
            route: "testRoute",
            to: "user@example.com",
            input: { name: "Test User" },
          }),
          Date.now(),
          null,
        )
        .run();

      const env = { DATABASE: d1 };
      const event = { cron: "*/5 * * * *", scheduledTime: Date.now() } as ScheduledEvent;
      const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;

      await expect(worker.scheduled(event, env, ctx)).rejects.toThrow(
        "Simulated notification send failure",
      );
      expect(sentrySpy).toHaveBeenCalledTimes(1);
    });
    ```

3.  Execute `vp test run` inside `apps/data-service`.
4.  **Failure / Invalidation Condition**: The test will fail with: `AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times`.
