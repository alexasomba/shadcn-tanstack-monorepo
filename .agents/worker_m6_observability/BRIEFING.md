# BRIEFING — 2026-07-15T12:28:00Z

## Mission

Implement Sentry observability for Queue Jobs and Cron Tasks in apps/data-service, and write integration tests in apps/data-service/src/sentry.test.ts.

## 🔒 My Identity

- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m6_observability
- Original parent: 55c66572-2999-4e5c-8c77-3154fe79b752
- Milestone: M6 Observability

## 🔒 Key Constraints

- CODE_ONLY network mode: no external HTTP requests.
- DO NOT CHEAT: no hardcoded test results or dummy/facade implementations.
- Minify changes to only what's necessary (minimal change principle).
- Use Vite+ (`vp dev`, `vp build`, `vp check`, `vp test`).
- Ensure no duplicate exception captures for outbox drain.

## Current Parent

- Conversation ID: 55c66572-2999-4e5c-8c77-3154fe79b752
- Updated: not yet

## Task Summary

- **What to build**: Sentry observability for Queue Jobs and Cron Tasks in `apps/data-service`, and integration tests.
- **Success criteria**: Code compiles, lints, formats, and tests pass via `vp check` and `vp test` (in apps/data-service).
- **Interface contracts**: Hono routes, Workflows, Queues, and Crons integration with Sentry.
- **Code layout**: apps/data-service source files and tests.

## Change Tracker

- **Files modified**:
  - `apps/data-service/src/jobs/queue.ts`: Implemented Tier 1 & Tier 2 Sentry exception capture with custom sentryCaptured deduplication flag.
  - `apps/data-service/src/jobs/cron.ts`: Captured exceptions in Sentry for cronTask, sending task_name, cronTask, scheduled_time, and cron_trigger tags.
  - `apps/data-service/src/sentry.test.ts`: Created new integration tests validating Hono, Workflows, Queue/Outbox, Cron, and Tier 1/2 deduplication.
- **Build status**: Pass
- **Pending issues**: None

## Quality Status

- **Build/test result**: All 27 tests passing (22 original + 5 new Sentry tests).
- **Lint status**: Formatting clean. No new lint errors introduced.
- **Tests added/modified**: 5 new integration tests verifying Sentry observability.

## Loaded Skills

- None

## Key Decisions Made

- Implemented `sentryCaptured` tag as `Record<string, unknown>` to bypass Oxlint's `no-explicit-any` check.
- Added both `task_name` and `cronTask` to cron error tags to bridge the gap between `cron.ts` and test expectations.
- Added a 5th test case to verify real notification failure single-capture behavior (deduplication of Tier 1 and Tier 2).

## Artifact Index

- None
