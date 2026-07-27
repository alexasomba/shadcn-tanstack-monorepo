## 2026-07-15T12:27:03Z

You are teamwork_preview_worker. Your role is worker.
Your working directory is /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m6_observability.
Your parent conversation ID is 55c66572-2999-4e5c-8c77-3154fe79b752.

Task: Implement Sentry observability for Queue Jobs and Cron Tasks in apps/data-service, and write integration tests in apps/data-service/src/sentry.test.ts.

You should read the proposed designs and patches from:

1. Queue design: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/proposed_queue.ts
2. Cron design: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_2/proposed_cron.ts
3. Test suite design: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/proposed_sentry.test.ts

Implementation Steps:

1. Update apps/data-service/src/jobs/queue.ts to capture exceptions in Sentry for queue job handler failures (ensuring no duplicate captures for outbox drain, as outlined in the explorer_m6_1 report).
2. Update apps/data-service/src/jobs/cron.ts to capture exceptions in Sentry for scheduled cron failures, including scheduled time and cron triggers as tags/context.
3. Create apps/data-service/src/sentry.test.ts with the proposed integration tests verifying Hono router, Workflows, Queue/Outbox jobs, and Cron tasks exception capture using mock Sentry spy.
4. Run "vp check" and "vp test" to verify that all code compiles, lints, formats, and tests pass successfully in apps/data-service.
5. Create a handoff report (handoff.md) in /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m6_observability listing:
   - What changes were implemented
   - Build/test run outcomes
   - Status of tests and check command

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
