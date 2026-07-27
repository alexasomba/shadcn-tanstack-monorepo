# Progress

Last visited: 2026-07-15T06:58:00Z

- [x] Create `packages/data-ops/src/workflows/onboarding.ts` containing `UserOnboardingWorkflow` and `OrgOnboardingWorkflow`.
- [x] Expose the workflows in `packages/data-ops`:
  - Add exports to `package.json`.
  - Add tsdown entries to `vite.config.ts`.
  - Re-export onboarding types and workflows in `src/index.ts`.
- [x] Configure databaseHooks in Better Auth `createAuth` inside `packages/data-ops/src/auth/create-auth.ts`.
- [x] Add Cloudflare Workflows bindings in `apps/data-service/wrangler.jsonc` and `apps/user-web/wrangler.jsonc`.
- [x] Register Hono routes inside `apps/data-service` to query workflow status/steps and trigger workflow executions.
- [x] Implement robust integration tests in `apps/data-service/src/workflows.test.ts`.
- [x] Fix all lint/type errors and ensure test suite passes completely.
