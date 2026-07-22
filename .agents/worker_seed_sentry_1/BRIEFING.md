# BRIEFING — 2026-07-15T12:20:00+01:00

## Mission

Complete R4 (Database Seeding) and R5 (Sentry monitoring) in the monorepo and verify via unit/E2E tests.

## 🔒 My Identity

- Archetype: worker
- Roles: worker
- Working directory: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_seed_sentry_1
- Original parent: orchestrator
- Original parent conversation ID: ec11c915-9fa4-45c5-aa49-0e41d0aba138

## 🔒 My Workflow

- **Pattern**: Direct (iteration loop)
- **Scope document**: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/PROJECT.md

1. **Decompose**: Implement database seeding in packages/data-ops, update endpoints in apps/data-service, integrate Sentry in frontend apps and backend services, add sentry-test endpoint.
2. **Execute**: Edit codebase files using replace_file_content or write_to_file. Run tests using run_command.
3. **On failure**: Fix types/lint/tests errors iteratively.
4. **Succession**: Write handoff.md on completion.

## 🔒 Key Constraints

- DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results or create dummy/facade implementations.
- Write only to your own working directory (.agents/worker_seed_sentry_1) for agent files.
- Rebuild packages/data-ops after schema or seed changes.
