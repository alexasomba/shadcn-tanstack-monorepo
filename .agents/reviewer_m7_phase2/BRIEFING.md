# BRIEFING — 2026-07-15T16:45:00Z

## Mission

Review the changes implemented for Milestone 7 Phase 2 and issue a verdict.

## 🔒 My Identity

- Archetype: reviewer_and_critic
- Roles: reviewer, critic
- Working directory: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/reviewer_m7_phase2
- Original parent: 43242d62-69a5-4c6e-9e1d-efb3f2103db4
- Milestone: Milestone 7 Phase 2
- Instance: 1 of 1

## 🔒 Key Constraints

- Review-only — do NOT modify implementation code
- CODE_ONLY network mode: no external HTTP/HTTPS clients

## Current Parent

- Conversation ID: 43242d62-69a5-4c6e-9e1d-efb3f2103db4
- Updated: 2026-07-15T16:45:00Z

## Review Scope

- **Files to review**:
  - `packages/data-ops/src/auth/plugins.ts`
  - `packages/data-ops/src/drizzle/schema/core.ts`
  - `packages/data-ops/src/queries/todos.ts`
  - `apps/data-service/src/endpoints/todos/*`
  - `apps/data-service/src/endpoints/domains/*`
  - `apps/data-service/src/middleware/api-key.ts`
  - `apps/user-web/src/lib/todos.functions.ts`
  - `apps/admin-web/src/lib/todos.functions.ts`
  - `apps/data-service/src/adversarial.test.ts`
- **Interface contracts**: PROJECT.md / AGENTS.md
- **Review criteria**: correctness, completeness, robustness, and interface compliance (Paystack subscription, Todos tenant isolation, API key middleware response codes, Sentry database exceptions reporting)

## Key Decisions Made

- Issue `REQUEST_CHANGES` verdict due to E2E test suite failure regressions caused by the new `todos.organization_id` NOT NULL constraint schema modification.

## Artifact Index

- `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/reviewer_m7_phase2/handoff.md` — Final review report and verdict

## Review Checklist

- **Items reviewed**:
  - `packages/data-ops/src/auth/plugins.ts` (pass)
  - `packages/data-ops/src/drizzle/schema/core.ts` (pass)
  - `packages/data-ops/src/queries/todos.ts` (pass)
  - `apps/data-service/src/endpoints/todos/*` (pass)
  - `apps/data-service/src/endpoints/domains/*` (pass)
  - `apps/data-service/src/middleware/api-key.ts` (pass)
  - `apps/user-web/src/lib/todos.functions.ts` (pass)
  - `apps/admin-web/src/lib/todos.functions.ts` (pass)
  - `apps/data-service/src/adversarial.test.ts` (pass)
  - E2E Tests in `apps/e2e-tests` (FAIL)
- **Verdict**: request_changes
- **Unverified claims**: None

## Attack Surface

- **Hypotheses tested**:
  - Missing/Expired API Key requests → verified returns 401 (pass)
  - Revoked/Limit Exceeded API Key requests → verified returns 403 (pass)
  - Cross-tenant access on domains and todos → verified blocked with 403 / 401 (pass)
- **Vulnerabilities found**:
  - Regression in the E2E test database inserts, which fail to supply `organization_id` to `todos` table since it is now configured as a NOT NULL column.
- **Untested angles**: None
