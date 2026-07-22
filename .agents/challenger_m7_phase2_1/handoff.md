# Handoff Report — Milestone 7 Phase 2: Adversarial Coverage Hardening

## 1. Observation

- **Paystack Schema Configuration**:
  In `packages/data-ops/src/auth/plugins.ts`, the paystack plugin is registered under lines 84-85:
  ```typescript
  paystack({ secretKey: readEnv("PAYSTACK_SECRET_KEY") ?? "" }),
  apiKey(),
  ```
  The option `subscription: { enabled: true }` is not present, meaning that the `subscription` table is omitted from the generated database schema.
- **Fictitious Tables and Webhook Interceptions**:
  In `apps/e2e-tests/src/tier2.test.ts` (lines 887-897), the test runner intercepts `/todos` requests and verifies tenant isolation using a nonexistent table `todo_organizations`:

  ```typescript
  const todoOrg = await db
    .prepare("SELECT * FROM todo_organizations WHERE todo_id = ?")
    .bind(todoId)
    .first<any>();
  if (todoOrg && todoOrg.organization_id !== sessionRecord.active_organization_id) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 });
  }
  ```

  Additionally, the E2E tests intercept `/subscriptions/webhook` inside the custom `fetchWrapper` (lines 253-272) instead of testing the actual `/api/auth/paystack/webhook` route in Hono.

- **API Key Exceptions Conversion**:
  **RESOLVED**. In `apps/data-service/src/middleware/api-key.ts`, the middleware now successfully returns a `403 Forbidden` response for key verification failures related to usage limits, returning `"API Key has reached its usage limit"`.

- **Todo Tenant Isolation**:
  **RESOLVED**. The Hono data-service endpoints for `/todos` now enforce strict active organization isolation, ensuring one tenant's API key cannot see or modify todos belonging to another tenant.

- **Sentry Database Error Swallowing**:
  In Hono endpoints (e.g., `src/endpoints/domains/list.ts`, lines 58-60), Drizzle queries are wrapped in `Result.tryPromise` which catches errors:

  ```typescript
  if (Result.isError(dbResult)) {
    return c.json(appErrorBody(dbResult.error), 500);
  }
  ```

  Because the error is caught and resolved to a `500` JSON response instead of being rethrown, the Hono router's `app.onError` (which calls `Sentry.captureException`) is never triggered.

- **Adversarial Test Execution**:
  The updated adversarial test suite `apps/data-service/src/adversarial.test.ts` compiles, registers, and runs successfully under Vitest:
  ```
  Test Files  8 passed (8)
  Tests  38 passed (38)
  ```

---

## 2. Logic Chain

1. **Missing Paystack Table Bug**:
   - _Observation_: The Paystack plugin is configured without enabling the `subscription` option. Drizzle migrations do not include a `subscription` table.
   - _Observation_: The Better Auth Paystack webhook handler attempts to write to and update a `subscription` table.
   - _Inference_: In production, Paystack renewal or churn webhooks will crash with database errors when attempting to query or update the non-existent `subscription` table.
2. **Todo Tenant Isolation**:
   - _Observation_: The modified test suite verified that Org B can no longer see todos created by Org A.
   - _Inference_: Tenant isolation for todos has been successfully verified.
3. **API Key Limits**:
   - _Observation_: The modified test suite verified that key usage limit throws now correctly return `403 Forbidden` with the specific reason payload.
   - _Inference_: Error handling has been refined.
4. **Observability Defect**:
   - _Observation_: The Hono endpoints early-return a 500 response on `Result.isError` instead of throwing the database deadlock or query exception.
   - _Inference_: Database query errors are silently swallowed and never logged to Sentry.

---

## 3. Caveats

The E2E tests mocking `/todos` via `todo_organizations` in `fetchWrapper` still represent a discrepancy between the test runtime environment and production code (though now Hono enforces tenant isolation natively). No other caveats.

---

## 4. Conclusion

The critical gaps in multi-tenant isolation on `/todos` and developer API key limit responses have been resolved and verified by the passing tests. The Paystack plugin configuration gap and Sentry database error swallowing are the remaining open issues.

---

## 5. Verification Method

1. Run the data-service tests (which include the newly added adversarial cases):
   ```bash
   vp run --filter data-service test
   ```
2. Verify that all 38 tests (including the 10 Milestone 7 Phase 2 adversarial tests) pass successfully.
3. Inspect `apps/data-service/src/adversarial.test.ts` to examine the detailed test assertions.
