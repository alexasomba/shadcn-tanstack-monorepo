## 2026-07-15T12:29:45Z

Task: Review the Sentry observability implementation and integration tests.
Files changed/created:

1. apps/data-service/src/jobs/queue.ts
2. apps/data-service/src/jobs/cron.ts
3. apps/data-service/src/sentry.test.ts

Please:

1. Examine code correctness, completeness, robustness, and conformance with monorepo rules.
2. Confirm if the two-tier exception capture logic prevents duplicate Sentry events for outbox drain failures.
3. Confirm that "vp check" and "vp test" pass.
4. Output your handoff.md in your working directory.
