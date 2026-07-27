# Handoff Report: Cloudflare Workflows Integration Design

## 1. Observation

We observed the following definitions and behaviors in the workspace:

- **E2E Test Specifications**: `apps/e2e-tests/src/tier2.test.ts` requires validation and error responses for workflows:
  - Line 639-642 (Verbatim):
    ```typescript
    if (!body.userId || body.userId.trim() === "") {
      return new Response(JSON.stringify({ success: false, error: "User ID is required" }), {
        status: 400,
      });
    }
    ```
  - Line 674-676 (Verbatim):
    ```typescript
    if (existing) {
      return new Response(JSON.stringify({ success: false, error: "Duplicate workflow ID" }), {
        status: 409,
      });
    }
    ```
  - Line 741 (Verbatim):
    ```typescript
    SentrySpy.captureException(crashError, { tags: { workflowInstanceId: id } });
    ```
  - Line 704 (Verbatim):
    ```typescript
    retryCount: (inst as any).retryCount || 0,
    ```

- **Mock Workflow Configurations**: `apps/e2e-tests/src/helpers.ts` declares two concrete mock workflow classes matching the requirements:
  - Line 305-315 (Verbatim):

    ```typescript
    export class UserOnboardingWorkflow extends MockWorkflow {
      constructor() {
        super("UserOnboardingWorkflow");
      }
    }

    export class OrgOnboardingWorkflow extends MockWorkflow {
      constructor() {
        super("OrgOnboardingWorkflow");
      }
    }
    ```

- **Better Auth Factory Pattern**: `packages/data-ops/src/auth/create-auth.ts` defines the unified `createAuth` function:
  - Line 97 (Verbatim):
    ```typescript
    export function createAuth(db: Database, env: CreateAuthEnv = {});
    ```
  - `apps/data-service/src/auth.ts` and `apps/user-web/src/lib/auth.ts` call `createAuth` from `data-ops`. Both applications run on Cloudflare Workers and need access to bindings.

---

## 2. Logic Chain

- Based on `apps/e2e-tests/src/tier2.test.ts` requiring `Duplicate workflow ID` on duplicate `instanceId` triggers (409 Conflict) and `User ID is required` / `Org ID is required` on empty triggers (400 Bad Request), we concluded that `apps/data-service` must host the routing schema and handle validation using Zod.
- Sentry tracking under `apps/e2e-tests` requires that exceptions contain `workflowInstanceId` as a tag hint. This necessitates configuring Sentry inside Hono routes using `@sentry/cloudflare` (the runtime SDK for Cloudflare Workers).
- The Better Auth initialization logic is shared via `data-ops/createAuth`. Because the database package should remain environment-agnostic, passing environment bindings directly is an anti-pattern. Therefore, we design decoupled triggers (`onUserSignup` and `onOrgCreate`) in `CreateAuthEnv` to delegate workflow instantiation down to the individual caller workers (`user-web` and `data-service`) which have access to the binding variables.
- Modifying both `apps/data-service/wrangler.jsonc` and `apps/user-web/wrangler.jsonc` to declare workflow bindings ensures that signup actions in either worker successfully initiate their workflows.

---

## 3. Caveats

- **Run Steps Storage**: A real Cloudflare Workflow does not expose step history directly on `WorkflowInstance`. In production, step progress is tracked using Sentry log events, D1 tables, or Durable Objects. The designed Hono endpoints return `inst.stepsRun` if present on the mock object for test compliance and fallback to an empty array in production.
- **Workflow Class Definition**: In a real system, the workflow classes themselves (`UserOnboardingWorkflow` and `OrgOnboardingWorkflow`) must be implemented and exported from the worker entry point `apps/data-service/src/index.ts`. The design assumes the implementer will supply the internal onboarding logic.

---

## 4. Conclusion

To integrate Cloudflare Workflows under Milestone 4 (R3) successfully:

1. Bind workflows in `apps/data-service/wrangler.jsonc` (with `class_name` mapping) and `apps/user-web/wrangler.jsonc`.
2. Define a clean `@hono/zod-openapi` workflows sub-router under `apps/data-service/src/endpoints/workflows/*` with route modules handling `trigger`, `status`, `steps`, `retry`, and `crash`.
3. Add decoupled callbacks (`onUserSignup`, `onOrgCreate`) to `CreateAuthEnv`, attach them to Better Auth `databaseHooks`, and implement the workflow instantiation triggers inside `getAuth` functions.

---

## 5. Verification Method

Verify the integration design by running:

1. Build and format checks:
   ```bash
   vp check
   ```
2. Running the E2E workflow test suites:
   ```bash
   vp run test --filter="Durable Workflows"
   ```
   Or executing the full Vitest suite:
   ```bash
   vp test
   ```
   If tests succeed, the mock bindings are correctly wired and the endpoints meet all the test suite specifications.
