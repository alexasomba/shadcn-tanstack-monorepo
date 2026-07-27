# BRIEFING — 2026-07-15T07:02:26Z

## Mission

Implement database seeding configurations using drizzle-seed in packages/data-ops and expose them via data-service endpoints, verified by tests.

## 🔒 My Identity

- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m5_seed
- Original parent: 912e894a-cd38-4167-bb99-6f15c69527ea
- Milestone: Milestone 5 (R4)

## 🔒 Key Constraints

- CODE_ONLY network mode: no external HTTP/HTTPS requests.
- No dummy/facade implementations or hardcoded test results.
- Keep changes minimal and follow layout compliance.
- Run `vp check` and `vp test` to verify changes.

## Current Parent

- Conversation ID: 912e894a-cd38-4167-bb99-6f15c69527ea
- Updated: not yet

## Task Summary

- **What to build**:
  - `packages/data-ops/src/database/seed.ts` implementing `seedDatabase(db)` using `drizzle-seed` for users, organization, and todos.
  - Expose seeding utility in packages/data-ops package.json and index.ts.
  - Rebuild packages/data-ops.
  - Create Hono route endpoints in `apps/data-service` under `/database/seed` (POST) and `/database/seed/verify` (GET).
  - Register the route router under `/database` in `apps/data-service/src/index.ts`.
  - Implement and run tests in `apps/data-service/src/seed.test.ts`.
- **Success criteria**:
  - Seeding endpoint correctly resets and seeds 2 users, 1 org, 1 todo.
  - Seeding verification returns correct counts.
  - Test suite passes, clean code style/formatting/linting.
- **Interface contracts**: `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/AGENTS.md`
- **Code layout**: packages/data-ops, apps/data-service

## Key Decisions Made

- [TBD]

## Change Tracker

- **Files modified**: [TBD]
- **Build status**: [TBD]
- **Pending issues**: [TBD]

## Quality Status

- **Build/test result**: [TBD]
- **Lint status**: [TBD]
- **Tests added/modified**: [TBD]

## Loaded Skills

- [TBD]

## Artifact Index

- /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m5_seed/handoff.md — Handoff report
