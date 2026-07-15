# Handoff Report — explorer_m4_3

## 1. Observation

- **Project Tests Configuration**: In `apps/data-service/vite.config.ts`, tests are configured to run with:
  ```typescript
  export default defineConfig({
    test: {
      include: ["src/**/*.test.ts"],
    },
  });
  ```
- **Existing Integration Tests structure**: In `apps/data-service/src/domains.test.ts`, D1 is mocked using `better-sqlite3` and SQL migrations applied:
  ```typescript
  const migrationFile = path.join(migrationsDir, dir, "migration.sql");
  if (fs.existsSync(migrationFile)) {
    const sql = fs.readFileSync(migrationFile, "utf8");
    await d1.exec(sql);
  }
  ```
  The endpoint tests invoke the worker directly using:
  ```typescript
  const createRes = await worker.fetch(new Request(...), env);
  ```
- **E2E Workflow Mocks**: In `apps/e2e-tests/src/helpers.ts`, `MockWorkflowInstance` is defined at line 242 and `MockWorkflow` at line 262. The mock instance provides a status checker and stores step logs:
  ```typescript
  export class MockWorkflowInstance {
    id: string;
    params: any;
    statusState: "running" | "complete" | "failed" = "running";
    stepsRun: Array<{ name: string; status: "success" | "failure"; output?: any; error?: any }> = [];
    ...
  }
  ```
- **Sentry Capture Requirement**: The original request specifies that Sentry capture verification must be implemented to check crash simulations.
- **Workflow Steps Requirements**:
  - `UserOnboardingWorkflow`: steps `"create_user_profile"` (returns `{ userId }`) and `"send_welcome_email"`.
  - `OrgOnboardingWorkflow`: steps `"provision_org_workspace"` (returns `{ orgId }`) and `"initialize_billing"`.

---

## 2. Logic Chain

1. **Test Environment Compatibility**: Based on `apps/data-service/vite.config.ts` and `apps/data-service/src/domains.test.ts` (Observation 1, 2), any test named `src/workflows.test.ts` will automatically be executed by the `vp test run` command in the `data-service` workspace.
2. **Mocking External Bindings**: Since the testing environment runs locally and in-memory, actual Cloudflare Workflow bindings cannot be run live. We must inject mock bindings (`MockWorkflow`) into the `env` object when calling `worker.fetch()` (Observation 2, 3), mirroring the pattern used in E2E tests.
3. **Endpoint Matching**: The integration test suite needs to trigger `/workflows` endpoints in Hono. The request parameters and paths must match the E2E mock implementation requirements: `POST /workflows/trigger/user-signup`, `POST /workflows/trigger/org-creation`, `GET /workflows/instances/:id/status`, `GET /workflows/instances/:id/steps`, `POST /workflows/instances/:id/retry`, and `POST /workflows/instances/:id/crash` (Observation 3).
4. **Sentry Spy Verification**: For Sentry capture verification (Observation 4), we mock the `@sentry/cloudflare` SDK using Vitest's `vi.mock` API to intercept calls to `captureException` and record them into a test-scoped array.
5. **Workflow Steps Verification**: The mock workflow instances must log the correct steps (Observation 5) to allow `GET /workflows/instances/:instanceId/steps` to assert on step completions.

---

## 3. Caveats

- **Mock Fidelity**: The tests rely on mocked workflow and Sentry modules. While this ensures code execution inside in-memory Vitest, it does not execute the actual Cloudflare Workflows runtime. Live integration testing will depend on Miniflare/Wrangler in the E2E test suite.
- **Dependency on Hono Routes**: We assume Hono routes for workflows will be implemented under `/workflows` in `data-service` as designed by `explorer_m4_2`. If the final route paths differ, the URLs in `proposed_workflows.test.ts` will need to be updated.

---

## 4. Conclusion

We have designed a complete, in-memory integration test suite for `apps/data-service/src/workflows.test.ts` that satisfies Milestone 4 (R3). The suite sets up mock D1 databases, mock Sentry capturing, and custom MockWorkflow bindings, verifying triggering, status queries, steps history, retries, and crash simulation in a sandboxed, network-free Vitest runner.

The proposed test implementation is written to:

- `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/explorer_m4_3/proposed_workflows.test.ts`

---

## 5. Verification Method

To verify the test design:

1. Review the proposed test file at `.agents/explorer_m4_3/proposed_workflows.test.ts`.
2. Inspect the design analysis at `.agents/explorer_m4_3/analysis.md`.
3. Once the workflows and endpoints are implemented in the main repository branch, copy `.agents/explorer_m4_3/proposed_workflows.test.ts` to `apps/data-service/src/workflows.test.ts` and run:
   ```bash
   pnpm --filter data-service test
   ```
   Or run the global check script:
   ```bash
   vp check
   ```
