# Handoff Report - Tier 1 E2E Test Review

This report provides the verification findings, logic chain, and review verdict for the Tier 1 E2E test suite in `apps/e2e-tests/src/tier1.test.ts`.

---

## 1. Observation

Direct observations of the codebase and test execution:

- **Bypassed Route Handlers**: In `apps/e2e-tests/src/tier1.test.ts`, a custom `fetchWrapper` is implemented (lines 184-679) that intercepts and mocks requests at the HTTP request boundary:

  ```typescript
  async function fetchWrapper(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    // 1. Paystack Subscriptions
    if (path === "/subscriptions/customer-code" && method === "POST") { ... }
    if (path === "/subscriptions/upgrade" && method === "POST") { ... }
    ...
    // 2. R2 Uploads
    if (path === "/r2/presigned-put" && method === "POST") { ... }
    ...
  ```

  Only if a path doesn't match any of these (like `/todos`) does it fall through to the actual worker (line 678):

  ```typescript
  return worker.fetch(request, testEnv);
  ```

- **Screaming Snake Case / PascalCase Binding Discrepancy**: In `tier1.test.ts`, the mock `testEnv` provides workflows bindings in PascalCase (lines 686-687):

  ```typescript
  UserOnboardingWorkflow: new UserOnboardingWorkflow(),
  OrgOnboardingWorkflow: new OrgOnboardingWorkflow(),
  ```

  However, the actual routes in `apps/data-service/src/endpoints/workflows/trigger.ts` expect the bindings in Screaming Snake Case (lines 72 and 174):

  ```typescript
  const workflow = c.env.USER_ONBOARDING_WORKFLOW;
  const workflow = c.env.ORG_ONBOARDING_WORKFLOW;
  ```

  If these requests fell through to the real worker, they would fail immediately with `500: USER_ONBOARDING_WORKFLOW binding not configured` because the casing does not match.

- **Aliased / Mocked drizzle-seed**: In `apps/e2e-tests/vite.config.ts`, the `drizzle-seed` library is aliased to a mock implementation that does nothing (line 12):

  ```typescript
  "drizzle-seed": path.resolve(__dirname, "../user-web/src/mocks/drizzle-seed-mock.ts"),
  ```

  Consequently, the actual `/database/seed` endpoint inside `data-service` (which calls `seedDatabase` using `drizzle-seed`) would seed 0 rows in the test project, whereas the test expects counts of 2, 1, 1. To make the test pass, the seeding endpoint is intercepted in `fetchWrapper` and custom seeding logic is hardcoded inside the test file (lines 585-634).

- **Sentry Capture Exception Facade**: In `fetchWrapper`, the route `/api/debug/sentry-test` is mocked to call `SentrySpy.captureException(error, ...)` (lines 636-642) rather than letting it throw inside the worker, because the actual Sentry SDK used in the worker cannot be intercepted by the local `SentrySpy` without setting up the mock transport in the worker.

---

## 2. Logic Chain

1. **Premise**: E2E testing must verify the actual application behavior of the system under test (`data-service` and `data-ops`).
2. **Observation**: 6 out of the 7 features in `tier1.test.ts` (Paystack Subscriptions, R2 Uploads, Tenant Organization, Durable Workflows, Database Seeding, and Sentry Monitoring) have their endpoint handlers intercepted in `fetchWrapper` and completely mocked within the test file.
3. **Observation**: Changing the implementation of any of these endpoints in `data-service` (e.g. breaking R2 delete, or database seeding) has zero impact on the test results because they never run the real handlers.
4. **Observation**: Bindings cased in PascalCase (`UserOnboardingWorkflow`) instead of the required Screaming Snake Case (`USER_ONBOARDING_WORKFLOW`) would cause real executions of the workflow trigger endpoints to fail, but they pass because they are mocked.
5. **Conclusion**: The test suite uses a facade mock layer that bypasses the actual code of `data-service` and `data-ops` for almost all features. This constitutes an **integrity violation** (specifically: dummy or facade implementations that look correct but implement no real logic, and shortcuts that bypass the intended task).

---

## 3. Caveats

- No caveats. The findings are based on a direct review of the source code of `apps/e2e-tests/src/tier1.test.ts`, `apps/e2e-tests/vite.config.ts`, and the router endpoints in `apps/data-service`.

---

## 4. Conclusion & Review Verdict

**Verdict**: **FAIL (REQUEST_CHANGES)**
**Finding Tag**: **INTEGRITY VIOLATION**

### Quality Review Report

#### Critical Finding 1: Facade Mocking of Data Service Endpoints

- **What**: The E2E tests mock almost all endpoints in the test file (`fetchWrapper`) instead of invoking the actual worker handlers.
- **Where**: `apps/e2e-tests/src/tier1.test.ts` (lines 184-679)
- **Why**: Bypasses the actual implementation under test. If the actual routes under `data-service` are broken or removed, the tests still pass.
- **Suggestion**: The tests must call `worker.fetch(request, testEnv)` for all routes that are implemented in the data-service (such as `/r2/*`, `/workflows/*`, `/database/*`). The test bindings in `testEnv` must be set up correctly (e.g. cased in Screaming Snake Case, and correct mock objects provided) so that the real handlers can execute successfully.

#### Major Finding 2: Mocked Seeding library in E2E tests

- **What**: `drizzle-seed` is mocked via alias to a no-op implementation.
- **Where**: `apps/e2e-tests/vite.config.ts` (line 12)
- **Why**: Prevents testing of the actual `/database/seed` endpoint.
- **Suggestion**: Remove the alias in `apps/e2e-tests/vite.config.ts` and use inline/mock configuration of `drizzle-seed` like in `apps/data-service/vite.config.ts`.

#### Major Finding 3: PascalCase vs. Screaming Snake Case Binding Mismatch

- **What**: Workflow bindings are supplied as PascalCase (`UserOnboardingWorkflow`) in the test environment but the data-service codebase accesses them as Screaming Snake Case (`USER_ONBOARDING_WORKFLOW`).
- **Where**: `apps/e2e-tests/src/tier1.test.ts` (lines 686-687) vs `apps/data-service/src/endpoints/workflows/trigger.ts` (lines 72 and 174)
- **Why**: Bypassing this via mock hid a routing bug/crash.
- **Suggestion**: Align the test environment keys with the actual worker bindings (`USER_ONBOARDING_WORKFLOW`, `ORG_ONBOARDING_WORKFLOW`).

---

### Adversarial Review Report

**Overall risk assessment**: **CRITICAL**

#### Critical Challenge 1: Bypassing the system under test

- **Assumption challenged**: The test suite validates the endpoints of the data-service.
- **Attack scenario**: A developer deletes `/r2/delete` endpoint or breaks its logic in `data-service`. The test suite still reports 100% success because `/r2/delete` is intercepted and mocked inside the test file.
- **Blast radius**: The application could ship to production with broken, missing, or insecure endpoints, despite E2E tests passing.
- **Mitigation**: Route all test requests to the actual worker (using `worker.fetch(request, testEnv)`) rather than bypassing them.

---

### Verified Claims

- **35 tests passing** → Verified via running `vp run --filter e2e-tests test -- src/tier1.test.ts` → **PASS** (but verified to be running against mock endpoints).
- **Correct database migrations applied** → Verified via inspecting `setupTestDb` (applied sequentially) → **PASS**.
- **Mock implementation of R2 bucket** → Verified via inspecting `MockR2Bucket` in `helpers.ts` → **PASS**.

---

## 5. Verification Method

To independently verify this finding:

1. Open `apps/e2e-tests/src/tier1.test.ts`.
2. Inspect the `fetchWrapper` function (starting at line 184). Observe that it intercepts routes for `/subscriptions/*`, `/r2/*`, `/organizations/*`, `/workflows/*`, `/database/*`, and `/sentry/*`, and returns a mock `Response` directly without calling `worker.fetch`.
3. To prove that these routes bypass the system, make a breaking change in one of these files (e.g. throw an error inside the handler of `apps/data-service/src/endpoints/r2/delete.ts`).
4. Run:
   ```bash
   vp run --filter e2e-tests test -- src/tier1.test.ts
   ```
5. Confirm that the test suite still passes successfully with 0 failures, proving that the real endpoint code is bypassed.
