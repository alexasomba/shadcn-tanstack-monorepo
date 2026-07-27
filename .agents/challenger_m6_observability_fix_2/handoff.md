# Handoff Report

## 1. Observation

- **Command executed**: `vp test run sentry` inside the `apps/data-service` directory.
- **Test execution results**:

  ```
   ✓ src/sentry.test.ts (6 tests) 421ms

   Test Files  1 passed (1)
        Tests  6 passed (6)
     Start at  13:36:44
     Duration  7.69s (transform 4.15s, setup 0ms, import 6.97s, tests 421ms, environment 0ms)
  ```

- **Cron deduplication test details**: The test file `apps/data-service/src/sentry.test.ts` lines 393 to 444 contains:

  ```ts
  // 6. Cron path Tier 1 / Tier 2 Deduplication Test for Database error
  it("prevents duplicate Sentry captures in cron task when outbox drain throws a database error", async () => {
    const d1 = await setupTestDb();

    // Seed a pending outbox notification event
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

    const env = {
      DATABASE: d1,
    };

    // Temporarily mock the send function to throw a database error
    mockSend.mockRejectedValueOnce(new Error("Database deadlock error during notification send"));

    const event = {
      cron: "*/5 * * * *",
      scheduledTime: Date.now(),
    } as ScheduledEvent;

    const ctx = {
      waitUntil: vi.fn(),
    } as unknown as ExecutionContext;

    // The scheduled handler should rethrow the error
    await expect(worker.scheduled(event, env, ctx)).rejects.toThrow(
      "Database deadlock error during notification send",
    );

    // Verify Sentry was called exactly once (Tier 1 inside drainOutbox, not Tier 2 in cronTask)
    expect(sentrySpy).toHaveBeenCalledTimes(1);

    const call = sentrySpy.mock.calls[0];
    expect(call[0].message).toBe("Database deadlock error during notification send");
    expect(call[1]?.tags?.eventType).toBe("notification");
    expect(call[1]?.tags?.jobType).toBe("outbox.drain");

    // The cron task name should not be present in the captured exception tags since it was handled at Tier 1
    expect(call[1]?.tags?.cronTask).toBeUndefined();
  });
  ```

- **Code implementation**:
  - In `apps/data-service/src/jobs/queue.ts`, the `drainOutbox` function catches errors and sets a `sentryCaptured = true` flag on the exception before rethrowing:
    ```ts
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
  - In `apps/data-service/src/jobs/cron.ts`, the wrapper `cronTask` prevents duplicate capturing by inspecting the exception's `sentryCaptured` flag:

    ```ts
    } catch (error) {
      const durationMs = Date.now() - start;
      console.error(`[cron:${name}] error`, { durationMs, error });

      if (!error || !(error as Record<string, unknown>).sentryCaptured) {
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
      }

      throw error;
    }
    ```

  - In `apps/data-service/src/jobs/queue.ts`, the queue handler also prevents duplicate capturing:

    ```ts
    } catch (error) {
      console.error("[queue:jobs] handler failed", { body: message.body, error });

      // Capture the exception via Sentry only if not already captured
      if (!error || !(error as Record<string, unknown>).sentryCaptured) {
        const rawBody = message.body as unknown;
        const jobType =
          rawBody && typeof rawBody === "object" && "type" in rawBody
            ? String((rawBody as Record<string, unknown>).type)
            : "unknown";
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

## 2. Logic Chain

1. The test execution of `vp test run sentry` inside `apps/data-service` reports that all 6 tests passed successfully.
2. The 6th test, `"prevents duplicate Sentry captures in cron task when outbox drain throws a database error"`, directly exercises `worker.scheduled(...)`, which triggers the scheduled task runner.
3. Because the mock database throws a database deadlock error inside `drainOutbox`, Sentry captures it inside `drainOutbox` (Tier 1) and sets the `sentryCaptured = true` property on the error.
4. When `cronTask` catches the error, it checks `!error || !(error as Record<string, unknown>).sentryCaptured`.
5. Since the error object has `sentryCaptured = true`, it skips duplicate reporting (Tier 2).
6. The test asserts that `sentrySpy` is called exactly 1 time (instead of 2) and that the tags do not contain cron-level tags (`cronTask` is `undefined`), confirming successful deduplication.
7. Verification through additional stress testing confirmed that:
   - Falsy errors (`null`, `undefined`) and primitive error values (`string`, `number`, `boolean`) are caught and handled safely in both queue and cron paths without any syntax/runtime exceptions.
   - Non-standard queue message bodies (`null`, `undefined`, arrays, numbers, objects without `type`) are processed cleanly, falling back to an `"unknown"` job type gracefully.

## 3. Caveats

- Unhandled Hono openapi linter warnings/typescript errors exist in other files in `apps/data-service` that are unrelated to Sentry / observability changes (verified via `vp check`). These did not impact the execution or correctness of the tests.

## 4. Conclusion

The Sentry exception capturing and deduplication flows for both the queue (worker jobs) and cron (scheduled tasks) have been successfully implemented and verified. The logic is robust against non-standard error structures, primitive exception types, and unexpected message payloads.

## 5. Verification Method

To verify these results independently:

1. Navigate to the `apps/data-service` directory:
   ```bash
   cd apps/data-service
   ```
2. Run the Sentry integration test suite:
   ```bash
   vp test run sentry
   ```
3. Confirm that all 6 tests pass successfully:
   ```
   ✓ src/sentry.test.ts (6 tests)
   Test Files  1 passed (1)
        Tests  6 passed (6)
   ```
