# Handoff Report - Milestone 7 Phase 2 Review

## 1. Observation

- **Command executed**: `vp run --filter data-service test`
  - Result: Successful
  - output: `Test Files  8 passed (8)`, `Tests  38 passed (38)`
- **Command executed**: `vp run --filter e2e-tests test`
  - Result: Failed (exit code 1)
  - output:
    ```
    FAIL  src/tier1.test.ts > Tier 1 E2E Feature Coverage Tests > Developer API Keys > 4.2 should access a protected endpoint using Authorization: Bearer <key>
    SqliteError: NOT NULL constraint failed: todos.organization_id
     ❯ Object.run src/helpers.ts:22:35
     ...
    FAIL  src/tier1.test.ts > Tier 1 E2E Feature Coverage Tests > Database Seeding > 6.1 should trigger database seed
    SqliteError: NOT NULL constraint failed: todos.organization_id
     ❯ Object.run src/helpers.ts:22:35
     ...
    FAIL  src/tier1.test.ts > Tier 1 E2E Feature Coverage Tests > Database Seeding > 6.4 should verify seeded todos/tasks exist
    AssertionError: expected 0 to be greater than 0
     ❯ src/tier1.test.ts:1234:33
     ...
    FAIL  src/tier1.test.ts > Tier 1 E2E Feature Coverage Tests > Database Seeding > 6.5 should prevent duplicate seeding or verify clean reset
    SqliteError: NOT NULL constraint failed: todos.organization_id
     ...
    FAIL  src/tier2.test.ts > Tier 2 E2E Boundary & Corner Cases Tests > Tenant Organization (Tier 2) > 3.5 should return 403 when trying to access todo of Org A using Org B's session
    SqliteError: NOT NULL constraint failed: todos.organization_id
     ...
    FAIL  src/tier2.test.ts > Tier 2 E2E Boundary & Corner Cases Tests > Database Seeding (Tier 2) > 6.1 should seed the database successfully on first run
    SqliteError: NOT NULL constraint failed: todos.organization_id
     ...
    FAIL  src/tier2.test.ts > Tier 2 E2E Boundary & Corner Cases Tests > Database Seeding (Tier 2) > 6.2 should run seed script idempotently on already populated database without doubling
    SqliteError: NOT NULL constraint failed: todos.organization_id
     ...
    FAIL  src/tier2.test.ts > Tier 2 E2E Boundary & Corner Cases Tests > Database Seeding (Tier 2) > 6.4 should run seed script with zero configuration parameters (defaults)
    SqliteError: NOT NULL constraint failed: todos.organization_id
    ```

- **File content observed**: `apps/e2e-tests/src/tier1.test.ts` (lines 608-611):
  ```ts
  await db
    .prepare("INSERT INTO todos (id, title, created_at) VALUES (?, ?, ?)")
    .bind(101, "Seed Todo 1", Math.floor(Date.now() / 1000))
    .run();
  ```
- **File content observed**: `packages/data-ops/src/drizzle/schema/core.ts` (lines 14-16):
  ```ts
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  ```

---

## 2. Logic Chain

1. **Premise**: In Milestone 7 Phase 2, the `todos` table was updated to support tenant isolation by adding an `organizationId` foreign key column which is marked as `notNull()` (see core schema observation).
2. **Finding**: The E2E tests in `apps/e2e-tests` (e.g. `tier1.test.ts` and `tier2.test.ts`) perform direct database inserts on the `todos` table using raw SQL prepare statements (see observation).
3. **Problem**: These raw SQL prepare statements do not specify or provide a value for `organization_id`.
4. **Conclusion**: Since the column is marked `notNull()` and has no default value, SQLite rejects the inserts with `SqliteError: NOT NULL constraint failed: todos.organization_id`. This causes 8 tests in the E2E test suite to fail.

---

## 3. Caveats

- We observed that the core implementation code in packages and data-service endpoints is correct, complete, and robust. Only the test helper/test scripts directly inserting into SQLite are breaking.
- Sentry and Paystack requirements are correctly implemented and verified.
- The `seed.test.ts` does not fail because `drizzle-seed` generates a random non-null string for `organization_id` which satisfies the SQLite NOT NULL constraint (since `PRAGMA foreign_keys = ON` is not explicitly executed in the mock environment, the random string doesn't fail foreign key checks).

---

## 4. Conclusion

The implementation code is correct, but the changes introduced a major test regression. The E2E test suite fails due to missing `organization_id` values on raw SQL `todos` inserts.

Therefore, the verdict is **REQUEST_CHANGES**.

---

## 5. Verification Method

To verify the regression:

1. Run the test command:
   ```bash
   vp run --filter e2e-tests test
   ```
2. Verify that the 8 tests listed in the observations fail with `SqliteError: NOT NULL constraint failed: todos.organization_id`.

To verify when fixed:

1. Update `apps/e2e-tests/src/tier1.test.ts` (lines 609, 1065) and `apps/e2e-tests/src/tier2.test.ts` (lines 776, 1270) to include a valid `organization_id` during the inserts.
2. Re-run `vp run --filter e2e-tests test` and check that all 94/94 tests pass.

---

# Quality Review Report

## Review Summary

**Verdict**: REQUEST_CHANGES

## Findings

### [Major] Finding 1

- **What**: SQLite NOT NULL constraint failure on `todos.organization_id` in E2E tests
- **Where**: `apps/e2e-tests/src/tier1.test.ts` (lines 609, 1065) and `apps/e2e-tests/src/tier2.test.ts` (lines 776, 1270)
- **Why**: The schema update made `organizationId` a NOT NULL column, but direct inserts in E2E tests were not updated to supply this column.
- **Suggestion**: Update these raw insert statements in the test files to supply a valid organization ID (e.g., `seed-org-1` or `org-A` depending on test context).

## Verified Claims

- Paystack subscription options correctly enable subscription → verified via `packages/data-ops/src/auth/plugins.ts` code inspection → **PASS**
- Todos tenant isolation prevents cross-tenant access → verified via `apps/data-service/src/adversarial.test.ts` test case 2.4 → **PASS**
- API key middleware returns 403 Forbidden for revoked/exceeded keys → verified via `apps/data-service/src/adversarial.test.ts` test case 3.2 → **PASS**
- API key middleware returns 401 for invalid/expired keys → verified via `apps/data-service/src/adversarial.test.ts` test case 3.1 → **PASS**
- Database failure early-returns report exceptions to Sentry → verified via `apps/data-service/src/adversarial.test.ts` test case 4.2 → **PASS**

## Coverage Gaps

- None.

## Unverified Items

- None.

---

# Adversarial Review Report

## Challenge Summary

**Overall risk assessment**: MEDIUM (restricted to test environments)

## Challenges

### [Medium] Challenge 1

- **Assumption challenged**: Seeding via drizzle-seed guarantees schema/constraint validity across the entire workspace.
- **Attack scenario**: Raw SQL seed scripts bypass Drizzle's type safety and fail when schemas evolve without developer awareness.
- **Blast radius**: The E2E tests fail to run, halting CI/CD and integration verification.
- **Mitigation**: Standardize all database test setups to use query helpers or Drizzle insert methods rather than raw SQL strings.

## Stress Test Results

- API key rate limit scenario → 403 Forbidden is returned → **PASS**
- API key expired scenario → 401 Unauthorized is returned → **PASS**
- Cross-tenant domain retrieval → 403 Forbidden is returned → **PASS**
- Cross-tenant todo query → Empty array or undefined todo is returned → **PASS**
