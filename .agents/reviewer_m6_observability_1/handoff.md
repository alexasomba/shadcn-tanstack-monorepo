# Handoff Report — Review of Sentry Observability

## 1. Observation

- **Formatting Violations**:
  Running `vp check` at root fails with exit code 1:
  ```
  error: Formatting issues found
  apps/data-service/src/sentry.test.ts (7ms)
  ```
- **Tests Passing**:
  Running `pnpm --filter data-service test` executes all integration tests successfully:
  ```
  ✓ src/sentry.test.ts (5 tests) 211ms
  Test Files  7 passed (7)
  Tests  27 passed (27)
  ```
- **Use of unsafe `"in"` operator in jobs/queue.ts**:
  - `handleJobMessage` (lines 45-46):
    ```typescript
    const type = "type" in body && typeof body.type === "string" ? body.type : "unknown";
    ```
  - `handleJobsBatch` catch block (lines 26-27):
    ```typescript
    if (!error || !(error as Record<string, unknown>).sentryCaptured) {
      const jobType = "type" in message.body ? String(message.body.type) : "unknown";
    ```
- **Lack of deduplication in jobs/cron.ts**:
  - `cronTask` catch block (lines 42-59):

    ```typescript
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
    ```

---

## 2. Logic Chain

- **Check Violation (Point A)**:
  `vp check` exits with error code 1 specifically due to `apps/data-service/src/sentry.test.ts`. This violates project check conformance.
- **Robustness Vulnerability (Point B)**:
  1. The `"in"` operator in JavaScript throws a `TypeError` if the right-hand operand is not an object (e.g. `null`, `undefined`, a number, or string).
  2. If a malformed message (like a primitive or null) is put in the queue, `"type" in body` in `handleJobMessage` throws a `TypeError`.
  3. The error is caught by `handleJobsBatch`.
  4. In the catch block, `"type" in message.body` is executed. Since `message.body` is not an object, it throws a new `TypeError`.
  5. This new `TypeError` crashes the catch block, halting the batch processing loop, bypassing `message.retry()`, and crashing the queue consumer handler.
- **Duplicate Captures (Point C)**:
  1. During an outbox drain failure (e.g. a notification failing to send), `drainOutbox` catches the error, calls `Sentry.captureException` (Tier 1), sets `sentryCaptured = true` on the error object, and throws it.
  2. If called via cron, `cronTask` catches this error.
  3. `cronTask` does not check the `sentryCaptured` flag and immediately calls `Sentry.captureException` (Tier 2).
  4. The exception is sent twice, resulting in duplicate events on Sentry.

---

## 3. Caveats

- We assumed that Sentry SDK does not perform automatic duplicate filtering for exceptions triggered in separate capture calls within the same execution path.
- No other remote systems were investigated as we operate under CODE_ONLY network restrictions.

---

## 4. Conclusion

The Sentry observability implementation and integration tests function correctly for standard queue workflows, but introduce a **robustness vulnerability** (non-object queue bodies crash the catch block) and fail to prevent **duplicate Sentry logs** when running outbox drains via cron.
Additionally, the formatting issue in the test file must be resolved.

**Verdict**: **REQUEST_CHANGES**

---

## 5. Verification Method

- Run `vp check` to see the formatting violation in `sentry.test.ts`.
- Run `pnpm --filter data-service test` to see all 27 integration tests pass.

---

## Quality Review

### Review Summary

**Verdict**: REQUEST_CHANGES

### Findings

- **Major Finding 1**: Formatting issue in `apps/data-service/src/sentry.test.ts` causing check failures.
- **Major Finding 2**: Duplicate Sentry captures under cron tasks. `cron.ts` misses checking `sentryCaptured` on the thrown error.

### Verified Claims

- Exception capture for Hono router unhandled errors -> verified via test -> pass
- Workflows exception capture with tags -> verified via test -> pass
- Queue outbox exception capture with tags -> verified via test -> pass
- Cron task exception capture with tags -> verified via test -> pass
- Two-tier outbox/queue deduplication -> verified via test -> pass

### Coverage Gaps

- None.

---

## Adversarial Review

### Challenge Summary

**Overall risk assessment**: HIGH (due to potential queue consumer crash)

### Challenges

- **Critical Challenge 1 (Queue Loop Crash)**:
  - **Assumption challenged**: Assumes queue messages are always objects.
  - **Attack scenario**: A null or primitive value sent to the queue causes a TypeError in the catch block of `handleJobsBatch`.
  - **Blast radius**: Halts the batch processing loop and crashes the consumer.
  - **Mitigation**: Add safety checks (e.g. `body && typeof body === "object" && "type" in body`).

- **Medium Challenge 2 (Duplicate Sentry logs under cron)**:
  - **Assumption challenged**: Assumes cron tasks don't receive pre-captured exceptions.
  - **Attack scenario**: `drainOutbox` fails during cron run. Sentry is called by both `drainOutbox` and `cronTask`.
  - **Blast radius**: Increased Sentry quota consumption and alert noise.
  - **Mitigation**: Add `if (!error || !(error as any).sentryCaptured)` check to `cronTask`.
