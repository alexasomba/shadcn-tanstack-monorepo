# Cloudflare Workflows Integration Tests Design Analysis

This report details the integration testing strategy and proposed test cases for the Hono endpoints and onboarding workflows in `apps/data-service/src/workflows.test.ts` to satisfy the requirements of Milestone 4 (R3).

## 1. Executive Summary

We designed a robust, in-memory integration test suite for the newly introduced Cloudflare Workflows endpoints. Because these tests run in a simulated Vitest environment under the `data-service` worker, we designed a self-contained mocking strategy that replicates the Cloudflare Workflows runtime API and Sentry tracking, ensuring zero external network calls while fully validating the endpoints' business logic.

The test suite covers:

- Programmatic triggering of user-signup and organization-creation workflows.
- Verification of workflow status queries.
- Step-by-step progress history inspection.
- Workflow retry mechanisms.
- Crash simulation with Sentry monitoring and event verification.

---

## 2. API Endpoints Specification

The endpoints are mapped to the `/workflows` path within Hono and are configured to query and interact with Cloudflare Workflow bindings.

### A. Trigger Endpoints

- **User Onboarding Trigger**: `POST /workflows/trigger/user-signup`
  - **Payload**: `{ userId: string }`
  - **Logic**: Instantiates `USER_ONBOARDING_WORKFLOW` with parameter `{ userId }`.
  - **Response**: `200 OK` with `{ success: true, instanceId: string }`.
- **Org Onboarding Trigger**: `POST /workflows/trigger/org-creation`
  - **Payload**: `{ orgId: string }`
  - **Logic**: Instantiates `ORG_ONBOARDING_WORKFLOW` with parameter `{ orgId }`.
  - **Response**: `200 OK` with `{ success: true, instanceId: string }`.

### B. Execution State & History

- **Get Status**: `GET /workflows/instances/:instanceId/status`
  - **Logic**: Obtains the workflow instance and calls `instance.status()`.
  - **Response**: `200 OK` with `{ success: true, status: string, error?: string }`.
- **Get Steps**: `GET /workflows/instances/:instanceId/steps`
  - **Logic**: Queries the step execution history logged on the instance (or matching DB records).
  - **Response**: `200 OK` with `{ success: true, stepsRun: Array<{ name: string, status: "success" | "failure", output?: any }> }`.

### C. Flow Control & Simulation

- **Retry Instance**: `POST /workflows/instances/:instanceId/retry`
  - **Logic**: Simulates restarting or retrying a failed step, resuming the workflow to completion.
  - **Response**: `200 OK` with `{ success: true }`.
- **Crash Simulation**: `POST /workflows/instances/:instanceId/crash`
  - **Logic**: Updates the workflow instance to throw/fail, transitioning status to `"failed"`, and calls Sentry to capture the crash exception.
  - **Response**: `200 OK` with `{ success: true }`.

---

## 3. Mocking Strategy

Since standard Cloudflare Workflows bindings are not natively simulated inside Vitest's Node/in-memory test execution environment without wrangler dev, we designed custom test harnesses:

1. **Workflow Bindings Mocking**:
   - `MockWorkflow` and `MockWorkflowInstance` classes emulate `.create()`, `.get(id)`, and `.status()` APIs of Cloudflare Workflows.
   - For `UserOnboardingWorkflow`, steps simulated are `"create_user_profile"` (returning the user's ID) and `"send_welcome_email"`.
   - For `OrgOnboardingWorkflow`, steps simulated are `"provision_org_workspace"` (returning the organization's ID) and `"initialize_billing"`.

2. **Sentry Monitoring Mocking**:
   - The `@sentry/cloudflare` module is mocked using Vitest's `vi.mock()`.
   - Exceptions captured via `Sentry.captureException` are stored in a local `sentryExceptions` list, allowing tests to assert on the exception message and context tags.

3. **Database Mocking**:
   - Employs an in-memory `better-sqlite3` database to set up D1, reading and executing migrations sequentially from `packages/data-ops/src/drizzle/migrations`.

4. **Auth Bypassing**:
   - The `./auth` module is mocked to verify `Authorization: Bearer test-api-key`, which matches the API key validation logic of other Hono routes.

---

## 4. Test Case Definitions & Assertions

The test cases mapped in `proposed_workflows.test.ts` include:

1. **Successful Triggering**:
   - Asserts that posting to `/workflows/trigger/user-signup` and `/workflows/trigger/org-creation` returns a `200` status, `success: true`, and that the workflow instance exists in the binding.
2. **Status Query**:
   - Asserts that querying the `/workflows/instances/:instanceId/status` endpoint returns the correct status (`complete` in normal cases).
3. **Step Log Validation**:
   - Asserts that calling the `/workflows/instances/:instanceId/steps` endpoint returns the list of run steps in chronological order:
     - User onboarding steps: `["workflow_started", "create_user_profile", "send_welcome_email", "workflow_completed"]`
     - Org onboarding steps: `["workflow_started", "provision_org_workspace", "initialize_billing", "workflow_completed"]`
4. **Retry Verification**:
   - Sets the mock instance to a `failed` state, triggers the `/retry` endpoint, and asserts that the instance state is updated to `complete` and that the steps log now includes `retry_success`.
5. **Crash & Sentry Capture Validation**:
   - Triggers `/crash` endpoint on a running instance, verifies that the instance status transitions to `failed`, and checks that `sentryExceptions` captured the exception matching the workflow instance ID with proper context tags.

---

## 5. Proposed Test Implementation File

The implementation details are provided in:

- Path: `apps/data-service/src/workflows.test.ts`
- Mock File: `.agents/explorer_m4_3/proposed_workflows.test.ts`
