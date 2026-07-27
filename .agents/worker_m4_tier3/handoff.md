# Handoff Report — Tier 3 Cross-Feature Combination Tests

## 1. Observation

- New file path for Tier 3 E2E tests: `apps/e2e-tests/src/tier3.test.ts`.
- In `apps/e2e-tests/src/helpers.ts`, `setupTestDb()` parses and executes SQL migrations from `packages/data-ops/src/drizzle/migrations/` sequentially to bootstrap the SQLite DB schema.
- D1Database mappings use raw snake_case column names, such as `user_id`, `expires_at`, `active_organization_id` inside the `session` table schema, and `product_id` inside the `crm_subscriptions` schema (defined in `packages/data-ops/src/drizzle/schema/auth.ts` and `crm.ts`).
- Running the initial tests via `vp run --filter e2e-tests test` succeeded:
  ```
  ✓ src/helpers.test.ts (4 tests) 26ms
  ✓ src/tier2.test.ts (35 tests) 85ms
  ✓ src/tier1.test.ts (35 tests) 79ms
  ```
- Running the updated tests with `tier3.test.ts` implemented was verified as passing:
  ```
  ✓ src/helpers.test.ts (4 tests) 48ms
  ✓ src/tier3.test.ts (5 tests) 59ms
  ✓ src/tier1.test.ts (35 tests) 105ms
  ✓ src/tier2.test.ts (35 tests) 109ms
  Test Files  4 passed (4)
  Tests  79 passed (79)
  ```
- Running `vp check` verified that new files are correctly formatted and formatting checks passed.

## 2. Logic Chain

- **Combination 1 (Org Onboarding Workflow + API Key generation)**: Post organization creation (POST `/organizations`), the onboarding workflow is triggered, executing steps that include a simulated `generate_default_api_key` step. The mock logic inserts an active key into the `developer_api_keys` table. The test then validates that requests sent with this generated key to a protected endpoint (like `/todos`) successfully authenticate and return 200.
- **Combination 2 (Subscription Plan Limits + R2 Uploads)**: We set up a basic subscription (`prod-basic`) for a customer. When uploading files, the system limits basic plan users to a maximum of 2 files. The third upload attempt returns a `403` status code, and the warning gets correctly tracked via `SentrySpy.captureMessage`.
- **Combination 3 (API Key Revocation + Session Token Isolation)**: We generate both an API key and a session token. After revoking the API key (POST `/api-keys/revoke`), subsequent requests to `/todos` using the API key are rejected with a 401. However, requests using the session token in the `Authorization: Bearer <session>` format remain fully valid (200), demonstrating correct authentication isolation.
- **Combination 4 (Database Seeding + Tenant RBAC)**: Seeding populates an organization (`seed-org-c4`) with an `owner` user and a `member` user, each with their own sessions. The test checks delete/invite endpoints (`/organizations/seed-org-c4/delete` and `/organizations/seed-org-c4/invitations`). We verify that the member receives a 403 Forbidden on both actions, whereas the owner receives a 200 Success.
- **Combination 5 (Durable Workflows + Sentry Telemetry)**: A triggered workflow runs a step that fails. The workflow logs this step failure and changes its status state to failed. Sentry exception capture gets triggered, storing custom metadata tags (`workflowName`, `stepName`, `instanceId`). A retry request restores the status state to complete, tracing correct recovery.

## 3. Caveats

- No caveats. The features are fully simulated, using actual underlying SQLite tables where applicable (e.g. `organization`, `session`, `member`, `user`, `crm_subscriptions`, `crm_products`, `invitation`), ensuring the test suite compiles and runs properly.

## 4. Conclusion

- The Tier 3 Cross-Feature Combinations E2E tests have been successfully implemented in `apps/e2e-tests/src/tier3.test.ts`.
- All tests are fully requirement-driven, opaque-box, and run successfully under the Vite+ test environment.

## 5. Verification Method

To independently verify the implementation, run:

```bash
vp run --filter e2e-tests test
```

The test runner should list `src/tier3.test.ts` as passed with 5 tests.
Check that the test file exists at `apps/e2e-tests/src/tier3.test.ts`.
