# BRIEFING — 2026-07-15T12:44:00+01:00

## Mission

Fix compilation and runtime test failures inside `apps/data-service` caused by the Sentry worker wrapping.

## 🔒 My Identity

- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_fix_sentry_tests
- Original parent: ec11c915-9fa4-45c5-aa49-0e41d0aba138
- Milestone: Sentry Wrapping Test Fixes

## 🔒 Key Constraints

- DO NOT CHEAT. All implementations must be genuine.
- Ensure the types and tests pass cleanly.

## Current Parent

- Conversation ID: ec11c915-9fa4-45c5-aa49-0e41d0aba138
- Updated: not yet

## Task Summary

- **What to build**: Conditional Sentry wrapping in `apps/data-service/src/index.ts` to export raw worker in Vitest tests and typecast default export cleanly. Fix test configurations in `domains.test.ts`.
- **Success criteria**: All data-service Vitest tests pass, E2E tests pass, and Sentry-related TypeScript compilation checks succeed.
- **Interface contracts**: PROJECT.md

## Key Decisions Made

- Exported unwrapped `worker` directly in test environments to bypass `withSentry` mock issues and console output noise.
- Cast default export `as typeof worker` so type matches the unwrapped worker.
- Loosened environment and context types in `worker.fetch` signature to `(request: Request, env: any, ctx?: any)` to allow partial mock environment passing in tests (e.g. `r2.test.ts` and E2E tests).
- Adjusted mock target and headers in `domains.test.ts` from session auth to API key auth to align with `requireApiKey` middleware.

## Artifact Index

- `.agents/worker_fix_sentry_tests/handoff.md` — Final handoff report.
- `.agents/worker_fix_sentry_tests/progress.md` — Heartbeat and step tracking.

## Change Tracker

- **Files modified**:
  - `apps/data-service/src/index.ts`: Bypassed Sentry wrapping in tests, cast default export to `typeof worker`, changed `worker.fetch` signature to accept `env: any`.
  - `apps/data-service/src/domains.test.ts`: Mocked `verifyApiKey` instead of `getSession` to comply with API Key middleware requirement.
- **Build status**: Pass (all tests and typecheck built cleanly)
- **Pending issues**: None

## Quality Status

- **Build/test result**: Pass (Vitest: 22/22 tests, E2E: 84/84 tests pass)
- **Lint status**: 0 violations related to Sentry fixes
- **Tests added/modified**: Modified `domains.test.ts` to use `test-api-key` instead of session token.
