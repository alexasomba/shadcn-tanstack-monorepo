# Adversarial Challenge Report — Tier 3 E2E Tests

## Challenge Summary

**Overall risk assessment**: LOW

The test suite is highly resilient because it is designed to run hermetically using an in-memory SQLite instance initialized directly from the Drizzle SQL migrations.

---

## Challenges

### [Low] Challenge 1: Prefix-Only R2 Matcher

- **Assumption challenged**: The simulation assumes that any path starting with `/bucket/` and containing `tenant_` is associated with a customer subscription and checked for upload limit.
- **Attack scenario**: If a client sends a request to `/bucket/tenant_cust-basic-tenant-other/file.txt`, the regex `^tenant_([^/]+)\/` extracts `cust-basic-tenant-other` as the customer ID. If this customer ID does not exist in the seeded database, the limit checks default to `100` uploads instead of matching `prod-basic` (limit 2).
- **Blast radius**: Low. In a test environment, the mock client inputs are hardcoded, but if testing real-world dynamic user paths, incorrect tenant prefixes might bypass subscription limits.
- **Mitigation**: Add a fallback rule rejecting uploads or asserting `404/403` if a customer ID pattern is found in the path but does not correspond to an existing database customer record.

### [Low] Challenge 2: Sequential-only database execution of seeding

- **Assumption challenged**: Seeding clears the database tables using non-cascading `DELETE FROM` statements in sequence.
- **Attack scenario**: If Drizzle schemas add hard foreign key constraints with `ON DELETE RESTRICT` or similar non-cascade actions, deleting tables in arbitrary order might trigger database constraint violations.
- **Blast radius**: Low/Medium. If database schema tables are updated in the future, the sequential DELETE list inside `/database/seed` will fail to clear the tables unless ordered correctly or using `PRAGMA foreign_keys = OFF;` before clearing.
- **Mitigation**: Wrap the table clearing logic inside a block that temporarily disables foreign keys during seeding:
  ```sql
  PRAGMA foreign_keys = OFF;
  -- DELETEs
  PRAGMA foreign_keys = ON;
  ```

---

## Stress Test Results

- **Scenario 1: Upload Limit Verification**
  - _Expected behavior_: Uploads are capped at exactly 2 for basic plans, and the third upload returns a 403.
  - _Actual behavior_: Hitting the endpoint returns exactly 403 on the third request. Pass.
- **Scenario 2: Sentry Log Extraction**
  - _Expected behavior_: Exception captured in Sentry contains exact tags (`workflowName`, `stepName`, `instanceId`).
  - _Actual behavior_: SentrySpy validates tags correctly. Pass.

---

## Unchallenged Areas

- **Real Miniflare / wrangler dev network calls**: Not challenged, as it is outside the scope of hermetic Vitest E2E tests, which use `fetchWrapper` by design.
