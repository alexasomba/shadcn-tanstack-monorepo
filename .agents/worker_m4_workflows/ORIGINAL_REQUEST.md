## 2026-07-15T06:47:26Z

Objective:
Implement Cloudflare Workflows onboarding sequences in `packages/data-ops` and register the corresponding Hono OpenAPI endpoints in `apps/data-service` to satisfy Milestone 4 (R3).

Details of implementation:

1. Create `packages/data-ops/src/workflows/onboarding.ts` containing `UserOnboardingWorkflow` and `OrgOnboardingWorkflow` extending `WorkflowEntrypoint`.
   - `UserOnboardingWorkflow` has steps: "create_user_profile" (returns `{ userId }`) and "send_welcome_email".
   - `OrgOnboardingWorkflow` has steps: "provision_org_workspace" (returns `{ orgId }`) and "initialize_billing".
2. Expose the workflows in `packages/data-ops`:
   - Add `"./workflows"` to the `exports` block in `packages/data-ops/package.json`.
   - Add `"src/workflows/onboarding.ts"` to `entry` in `packages/data-ops/vite.config.ts`.
   - Re-export everything from `./workflows/onboarding` in `packages/data-ops/src/index.ts`.
3. Rebuild `packages/data-ops`: `pnpm --filter data-ops build`.
4. Configure databaseHooks in Better Auth `createAuth`:
   - In `packages/data-ops/src/auth/create-auth.ts`, add `onUserSignup`, `onOrgCreate`, and `onOrgJoin` to `CreateAuthEnv`.
   - Add `databaseHooks` for `user.create.after`, `organization.create.after`, and `member.create.after` invoking the respective callbacks if defined.
5. Bind workflow hooks in auth files:
   - In `apps/data-service/src/auth.ts`, map `onUserSignup` and `onOrgCreate` to trigger `bindings.USER_ONBOARDING_WORKFLOW` and `bindings.ORG_ONBOARDING_WORKFLOW` if present.
   - In `apps/user-web/src/lib/auth.ts` and `apps/admin-web/src/lib/auth.ts`, map the same to trigger `env.USER_ONBOARDING_WORKFLOW` and `env.ORG_ONBOARDING_WORKFLOW` if present.
6. Configure wrangler configs:
   - In `apps/data-service/wrangler.jsonc` and `apps/user-web/wrangler.jsonc`, add `"workflows"` binding blocks for `USER_ONBOARDING_WORKFLOW` and `ORG_ONBOARDING_WORKFLOW`.
7. Create Hono route endpoints under `apps/data-service/src/endpoints/workflows/` (schemas, trigger, status, steps, retry, crash) and mount them at `/workflows` in `apps/data-service/src/index.ts`. Ensure route handlers check bindings at runtime and are compatible with both MockWorkflow (from tests) and real Cloudflare workflow handles.
8. Create `apps/data-service/src/workflows.test.ts` to verify all workflow endpoints and triggers. Mock `@sentry/cloudflare`'s `captureException` and spy on it.
9. Verify by running formatting, type checks, linting, and tests in `apps/data-service` and packages using:
   - `vp check`
   - `vp test` (or `vp run --filter data-service test` / `vp test run apps/data-service/src/workflows.test.ts`)
10. Write a detailed handoff report to `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m4_workflows/handoff.md`.
