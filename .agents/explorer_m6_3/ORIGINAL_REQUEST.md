## 2026-07-15T12:22:55Z

You are explorer_m6_3, a read-only exploration agent.
Your working directory is /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3.

Objective:
Investigate and design integration tests for Sentry observability in `apps/data-service` to satisfy Milestone 6 (R5).

Tasks:

1. Propose integration tests `apps/data-service/src/sentry.test.ts` verifying Sentry captures exceptions for Hono, workflows, queue/outbox jobs, and cron tasks.
2. The tests should mock Sentry's `captureException` and verify that the correct tags and exceptions are recorded for each failure path.
3. Write your findings to `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/analysis.md`.
