## 2026-07-15T12:32:50Z

Implement critical robustness and deduplication fixes in apps/data-service for Sentry observability, and fix test formatting.

The Reviewers reported the following items to resolve:

1. Unsafe `"in"` operator in apps/data-service/src/jobs/queue.ts:
   - At line 45-46 (`handleJobMessage`), if the `body` is not an object or is `null`, `"in"` throws a TypeError. It must be checked safely:
     `const type = body && typeof body === "object" && "type" in body && typeof body.type === "string" ? body.type : "unknown";`
   - In the catch block of `handleJobsBatch` (line 26-27), if `message.body` is not an object, `"type" in message.body` will throw another TypeError, crashing the catch block itself. It must check:
     `const jobType = message.body && typeof message.body === "object" && "type" in message.body ? String(message.body.type) : "unknown";`
2. Duplicate Sentry captures in scheduled Cron path:
   - In `apps/data-service/src/jobs/cron.ts`, `cronTask`'s catch block does not check the `sentryCaptured` flag. If `drainOutbox` throws, Sentry captures the error at the outbox level (Tier 1) and then `cronTask` captures it again (Tier 2).
   - Update `cronTask`'s catch block to only capture if the error does not have `sentryCaptured = true`:
     `if (!error || !(error as Record<string, unknown>).sentryCaptured) { Sentry.captureException(...); }`
3. Formatting check fail in apps/data-service/src/sentry.test.ts:
   - Running `vp check` at root fails due to a formatting issue in `apps/data-service/src/sentry.test.ts`. Inspect the file, run `vp check --fix` or manual formatting to ensure it is fully compliant.
4. Add a test in apps/data-service/src/sentry.test.ts to verify that if a cron task triggers a database error that was already captured in the outbox drain logic, Sentry capture is not duplicated.
5. Verification:
   - Run "vp check" and "vp test" to verify all tests in the workspace and data-service pass, and there are no linting/formatting errors.
