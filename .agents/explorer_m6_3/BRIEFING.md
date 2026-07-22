# BRIEFING — 2026-07-15T12:24:20Z

## Mission

Investigate and design integration tests for Sentry exception-capturing in apps/data-service.

## 🔒 My Identity

- Archetype: Teamwork explorer
- Roles: Teamwork explorer
- Working directory: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3
- Original parent: 912e894a-cd38-4167-bb99-6f15c69527ea
- Milestone: Milestone 6 (R5)

## 🔒 Key Constraints

- Read-only investigation — do NOT implement
- Code-only network mode (no external HTTP calls, no external docs lookup)
- Write only to our own agent folder

## Current Parent

- Conversation ID: 912e894a-cd38-4167-bb99-6f15c69527ea
- Updated: not yet

## Investigation State

- **Explored paths**:
  - `apps/data-service/package.json`
  - `apps/data-service/src/index.ts`
  - `apps/data-service/src/jobs/cron.ts`
  - `apps/data-service/src/jobs/queue.ts`
  - `apps/data-service/src/workflows.test.ts`
  - `apps/data-service/src/api-key.test.ts`
- **Key findings**:
  - Hono endpoints: Unhandled errors are caught by Hono `app.onError` in `index.ts` and captured via Sentry.
  - Workflows: Explicit call in `/instances/{id}/crash` to Sentry with `workflowInstanceId`.
  - Queue Jobs: The error is swallowed in `handleJobsBatch` and retried, missing Sentry logging. We proposed adding explicit Sentry captures with `jobType` and `jobId` tags.
  - Cron Tasks: Errors are logged and rethrown. Vitest bypasses the runtime `withSentry` wrapper. We proposed capturing the error inside `cronTask` with the task name tag before rethrowing.
- **Unexplored areas**: None.

## Key Decisions Made

- Mock `@sentry/cloudflare` using Vitest's `vi.mock` and `vi.hoisted` spy.
- Induce mock failures on Queue and Cron tasks by supplying D1 database objects that throw on query prepare/execute.

## Artifact Index

- /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/ORIGINAL_REQUEST.md — Original request logging
- /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/BRIEFING.md — My persistent working memory
- /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/progress.md — Progress tracker
- /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/analysis.md — Detailed analysis report
- /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/proposed_sentry.test.ts — Proposed integration test file
- /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/proposed_queue.ts — Proposed queue enhancement file
- /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m6_3/proposed_cron.ts — Proposed cron enhancement file
