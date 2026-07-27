# BRIEFING — 2026-07-15T07:47:00+01:00

## Mission

Investigate and design Hono route endpoints, wrangler configs, and Better Auth hooks for Cloudflare Workflows to satisfy Milestone 4 (R3).

## 🔒 My Identity

- Archetype: explorer
- Roles: Teamwork explorer
- Working directory: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m4_2
- Original parent: 912e894a-cd38-4167-bb99-6f15c69527ea
- Milestone: Milestone 4 (R3)

## 🔒 Key Constraints

- Read-only investigation — do NOT implement
- Network mode: CODE_ONLY (No external API calls or HTTP client execution)
- Strictly comply with AGENTS.md package rules (D1 bindings, service bindings, packages, OpenAPI schemas composition)

## Current Parent

- Conversation ID: 912e894a-cd38-4167-bb99-6f15c69527ea
- Updated: 2026-07-15T07:47:00+01:00

## Investigation State

- **Explored paths**:
  - `apps/data-service/wrangler.jsonc` — Wrangler configurations for data-service
  - `apps/user-web/wrangler.jsonc` — Wrangler configurations for user-web
  - `packages/data-ops/src/auth/create-auth.ts` — Better Auth factory function
  - `apps/data-service/src/auth.ts` — Data-service auth setup helper
  - `apps/user-web/src/lib/auth.ts` — User-web auth setup helper
  - `apps/e2e-tests/src/tier1.test.ts`, `tier2.test.ts`, `tier3.test.ts` — E2E test suites for durable workflows and Sentry telemetry
  - `apps/e2e-tests/src/helpers.ts` — Mock testing environments and helper classes
  - `templates/workflows-starter-template/` — Cloudflare Workflows reference template
- **Key findings**:
  - Identified the 6 exact workflow endpoints, request/response formats, and HTTP status requirements (`/workflows/trigger/user-signup`, `/workflows/trigger/org-creation`, `/workflows/instances/:id/status`, `/workflows/instances/:id/steps`, `/workflows/instances/:id/retry`, `/workflows/instances/:id/crash`).
  - Sentry exceptions captured on step crash require specific metadata tags (e.g. `workflowInstanceId`).
  - To prevent tight coupling of runtime worker environment variables to the database package, we designed optional callback interfaces (`onUserSignup` and `onOrgCreate`) on `CreateAuthEnv` to bridge Better Auth database events and Cloudflare bindings triggers.
- **Unexplored areas**:
  - Specific internal steps of `UserOnboardingWorkflow` and `OrgOnboardingWorkflow` (to be developed by the implementer agent).

## Key Decisions Made

- Deployed a decoupled callback trigger pattern in `createAuth` to enable both `user-web` and `data-service` workers to invoke Cloudflare Workflows via bindings when processing signup and organization creation.

## Artifact Index

- `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m4_2/ORIGINAL_REQUEST.md` — Original request context.
- `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m4_2/analysis.md` — Complete design and findings report.
