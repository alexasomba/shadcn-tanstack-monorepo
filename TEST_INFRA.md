# E2E Test Infrastructure & Design Specification

This document details the architecture, feature coverage inventory, and execution strategy for the SaaS Expansion End-to-End (E2E) testing framework.

## 1. Test Architecture

The E2E test suite is located in the `apps/e2e-tests` package and integrates directly with other monorepo workspace packages (`data-ops`, `data-service`).

### Runner and Toolchain

- **Test Runner**: Vitest (v4.1.10) managed by Vite+ (`vp test run`).
- **Vite Config**: Aligned with the unified toolchain, targeting `src/**/*.test.ts`.
- **Execution Mode**: Isolated in-memory tests utilizing mock environments to replicate Cloudflare Workers bindings.

### Mocks & Integrations (Harnesses)

- **Mock Database (D1)**: In-memory D1 mock backed by `better-sqlite3` which loads and executes the actual Drizzle migration scripts from `packages/data-ops/src/drizzle/migrations` sequentially.
- **Mock Storage (R2)**: In-memory `MockR2Bucket` simulating standard R2 operations (`put`, `get`, `delete`, `list`) on buffers/streams, including custom/http metadata.
- **Mock Workflows**: Custom `MockWorkflow` binding classes for `UserOnboardingWorkflow` and `OrgOnboardingWorkflow` supporting execution triggers and detailed step/output tracing.
- **Mock Sentry**: Custom `SentrySpy` and Sentry transport to capture and assert on exceptions thrown/handled during execution.

---

## 2. Feature Inventory (Tiers 1-3)

### Tier 1: Feature Coverage

At least 5 test cases per feature to verify the positive paths and core business requirements.

1. **Paystack Subscriptions**
   - Verification of customer code generation and storage.
   - Subscription upgrade webhook trigger processing.
   - Subscription downgrades/cancellations.
   - Active subscription middleware guard verification.
   - Customer transaction billing history queries.
2. **R2 Uploads**
   - Presigned PUT URL generation and authentication.
   - Presigned GET URL access validation.
   - Programmatic file uploads and bucket item lists.
   - File deletion and space reclamation.
   - Content-type and size restriction enforcement.
3. **Tenant Organization**
   - Multi-tenant organization creation and slug routing.
   - Organization invitation issuance and acceptance.
   - Organization custom role and RBAC permission checks.
   - Active tenant scoping checks (preventing cross-tenant access).
   - Organization deletion and associated resource teardown.
4. **Developer API Keys**
   - API key generation and secure hashing.
   - Request authentication via API key headers (`Authorization: Bearer` and `x-api-key`).
   - API key revocation / rotation.
   - Usage limit and rate limit tracking.
   - Inactive/revoked key access denials.
5. **Durable Workflows**
   - UserOnboardingWorkflow execution flow on user registration.
   - OrgOnboardingWorkflow provisioning on organization creation.
   - Step-by-step execution path tracing and state updates.
   - Error recovery and step retry simulation.
   - Querying workflow instance execution status.
6. **Mock Seeding**
   - `drizzle-seed` execution under mock environments.
   - Seeding verification (correct number of tenants, users, and tasks).
   - Duplicate seed execution protection.
   - Clean slate database resetting.
   - Validation of seeded schemas and relations.
7. **Sentry Monitoring**
   - Exception capture tracking via transport interceptors.
   - Validation of tags and contexts attached to errors.
   - Critical error notifications and alerting.
   - Silent exception logging suppression in tests.
   - Server-side route error telemetry integration.

### Tier 2: Boundary & Corner Cases

Verification of edge conditions, extreme limits, invalid inputs, and error states.

1. **API Keys / Request Constraints**
   - Empty / malformed headers and missing keys.
   - Expired key requests.
   - Key usage limit boundaries (exactly at maximum and 1 over maximum).
2. **Billing & Subscriptions**
   - Zero and negative values in transaction checks.
   - Invalid webhook payloads (bad signatures).
   - Concurrent subscription updates.
3. **R2 / File Limits**
   - Zero-byte file uploads.
   - Huge file simulation and chunk limits.
   - Deleting non-existent files.
4. **Tenant Isolation**
   - Querying resources using another tenant's session token.
   - Direct ID injection attacks across organization endpoints.

### Tier 3: Cross-Feature Combinations

Verification of pairwise feature interactions and side effects.

1. **Org Creation + API Key + Workflows**
   - Creating an organization triggers the onboarding workflow, which then generates the default developer API key and verifies that the key is immediately usable.
2. **Subscription Status + API Limits + R2 File Uploads**
   - User uploads files to R2; when the subscription limit is reached, subsequent R2 upload requests are blocked, and Sentry monitors the warning events.
3. **API Key Rotation + active session token validation**
   - Revoking a developer's API key while they are in an active session, ensuring all ongoing background tasks are immediately halted.

---

## 3. Coverage Thresholds

| Metric                          | Target                                                   |
| ------------------------------- | -------------------------------------------------------- |
| **Tier 1 Feature Coverage**     | 100% of defined positive paths (>= 5 cases per feature)  |
| **Tier 2 Edge Cases**           | 100% boundary & corner cases covered                     |
| **Tier 3 Combinations**         | Pairwise coverage of intersecting features               |
| **Integration Helper Coverage** | >= 80% statement coverage of mock infrastructure helpers |
| **Success Criteria**            | All tests pass with exit code 0 under `vp test run`      |
