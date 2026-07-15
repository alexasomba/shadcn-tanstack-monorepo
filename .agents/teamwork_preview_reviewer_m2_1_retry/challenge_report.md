# Adversarial Challenge Report

## Challenge Summary

**Overall risk assessment**: HIGH

Milestone 2 (R1) successfully incorporates Better Auth plugins and Hono API Key Auth middleware, but exhibits a critical integration risk due to duplicate routing matching and a mock-to-reality mismatch.

---

## Challenges

### [Critical] Integration Mismatch in API Key Context Propagation

- **Assumption challenged**: The assumption that `verifyApiKey` returns a `user` property under `{ result: { user } }` which can be populated via `c.set("user", result.user)`.
- **Attack scenario / Failure mode**:
  - Since Better Auth's real `verifyApiKey` returns `{ valid, error, key }` (without `user`), `result.user` is undefined.
  - Setting `c.set("user", undefined)` breaks subsequent middleware checks of `c.get("user")`.
  - When Hono encounters multiple wildcard matching routes (`/todos` and `/todos/*`), it runs the middleware twice.
  - The second run executes `verifyApiKey` again because `c.get("user")` is falsy.
  - This leads to a double-increment of usage counters. A client requesting a resource is billed/throttled twice for every single request, leading to early depletion of API limits.
- **Blast radius**: Breaks client integrations and violates rate-limiting SLAs by charging 2 requests for every 1 actual request.
- **Mitigation**:
  - Ensure Hono middlewares are deduplicated.
  - Hardcode a placeholder or lookup-based user object to prevent falsy evaluations: `c.set("user", { id: result.key.referenceId } as any)`.

---

## Stress Test Results

- **Duplicate requests processing on /todos** → `/todos` matches both `/todos` and `/todos/*` middleware registrations → `verifyApiKey` called twice → **FAIL** (Usage limits depleted twice as fast).
- **Invalid API Key Rejection** → request made with corrupted bearer token or missing header → returns 401 Unauthorized → **PASS** (Properly rejects unauthorized access).
- **Correct organization-id mapping from API Key** → `c.set("session", { activeOrganizationId: result.key.referenceId })` is evaluated in domains route handlers → correctly scopes data visibility → **PASS** (Correct cross-tenant scope isolation).

---

## Unchallenged Areas

- **Workflows durability under node crash** → workflows engine was mock-tested but not stress-tested against real SQLite corruption or hard worker termination.
  - _Reason not challenged_: Out of scope for Milestone 2 (R1) review.
