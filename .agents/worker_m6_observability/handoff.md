# Handoff Report — Sentry Observability for Queue/Cron Jobs

This report provides the details of the Sentry exception capture implementation inside the queue jobs and cron tasks of `apps/data-service` along with the integration test results.

---

## 1. Observation

- **Observation 1 (Queue Error Handling Swallowed exceptions)**:
  In `apps/data-service/src/jobs/queue.ts`, the catch block was logging the error to `console.error` and calling `message.retry()`, but Sentry was never notified.
- **Observation 2 (Proposed designs for Queue & Cron)**:
  - Queue design (`.agents/explorer_m6_3/proposed_queue.ts`) recommended using `@sentry/cloudflare` inside `handleJobsBatch`.
  - Cron design (`.agents/explorer_m6_2/proposed_cron.ts`) suggested updating `cronTask` in `src/jobs/cron.ts` to capture exceptions, attaching the `cron` expression and `scheduledTime` as tags.
- **Observation 3 (Avoid duplicate captures)**:
  The explorer reports (`explorer_m6_1` handoff) specified that outbox drain errors caught in `drainOutbox` should be tagged with `sentryCaptured = true` (using `Record<string, unknown>`) to avoid double-capture at the outer `handleJobsBatch` level.
- **Observation 4 (Verification command outcomes)**:
  Running `vp test run sentry` inside `apps/data-service` verified the mock Sentry spy successfully recorded captures:

  ```
  ✓ src/sentry.test.ts (5 tests) 111ms

  Test Files  1 passed (1)
       Tests  5 passed (5)
  ```

  `vp check --fix` successfully formatted the files and reported no compilation/lint errors for the modified/created files.

---

## 2. Logic Chain

1. In order to capture failures inside the queue processor, we imported `* as Sentry from "@sentry/cloudflare"` in `apps/data-service/src/jobs/queue.ts` and invoked `Sentry.captureException` (Observation 1, 2).
2. To prevent duplicate exception reporting on the outbox drain job (Observation 3), a two-tier strategy was implemented:
   - **Tier 1**: Inside `drainOutbox`'s loop, individual event failures (like failed notification delivery) are captured with event metadata and marked with a `sentryCaptured = true` property.
   - **Tier 2**: In `handleJobsBatch`'s catch block, Sentry is only notified if `!(error as Record<string, unknown>).sentryCaptured` evaluates to true.
3. In `apps/data-service/src/jobs/cron.ts`, we enriched the `cronTask` runner (Observation 2) to capture exceptions, adding `task_name`, `cronTask`, `scheduled_time`, and `cron_trigger` tags/context to Sentry events.
4. To verify all of the above, we constructed `apps/data-service/src/sentry.test.ts` (Observation 4) mocking Sentry to assert:
   - Router errors are captured.
   - Workflow crashes capture the `workflowInstanceId`.
   - Global queue/outbox database queries capture `jobType` and `jobId`.
   - Cron query failures capture the `cronTask` name.
   - Real outbox notification send failures capture Tier 1 tags and successfully deduplicate/prevent Tier 2 capture.

---

## 3. Caveats

- **Mock Sentry in test runner**: Real Sentry DSN configuration is bypassed in tests via Vite+ mocking of the `@sentry/cloudflare` SDK exports.
- **Strict Lint rules**: Used type assertions to `Record<string, unknown>` rather than `any` to satisfy the strict Oxlint checks in the monorepo workspace.

---

## 4. Conclusion

Sentry exception capture has been fully implemented in the queue job handler and cron task runner in `apps/data-service`. All 5 integration tests verify exact exception behavior and correct tag mapping (including the single-capture deduplication logic).

---

## 5. Verification Method

To verify the integration manually or programmatically:

1. Navigate to `apps/data-service` directory.
2. Run:
   ```bash
   vp test run sentry
   ```
3. Run `vp check` to confirm there are no formatting or linting issues on the modified files:
   - `apps/data-service/src/jobs/queue.ts`
   - `apps/data-service/src/jobs/cron.ts`
   - `apps/data-service/src/sentry.test.ts`
