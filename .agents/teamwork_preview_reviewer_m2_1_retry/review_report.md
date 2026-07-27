# Quality Review Report

## Review Summary

**Verdict**: REQUEST_CHANGES

This review evaluates the implementation of Milestone 2 (R1) against correctness, completeness, and robustness constraints. We found a critical integration bug where Hono routes are mounted twice, and the authentication context is set to undefined due to a mock mismatch. This causes E2E tests to fail.

---

## Findings

### [Critical] Duplicate Middleware Mounting & Mock Mismatch

- **What**: The Hono API Key middleware is mounted twice on path prefixes (e.g. `/todos` and `/todos/*`), and the Better Auth API Key plugin `verifyApiKey` endpoint does not return a `user` property (unlike what the unit test mocks).
- **Where**:
  - `apps/data-service/src/index.ts` (lines 88-93)
  - `apps/data-service/src/middleware/api-key.ts` (line 60)
  - `apps/data-service/src/api-key.test.ts` (line 23)
- **Why**:
  1. Hono matches and executes both `/todos` and `/todos/*` middleware functions for a request to `/todos`.
  2. Because the first run sets `c.set("user", result.user)` to `undefined` (as `result.user` is not returned by the real Better Auth API), the second middleware execution sees `c.get("user")` as falsy and calls `verifyApiKey` a second time.
  3. This double invocation causes rate limits/quotas to double-increment on every single request, leading to premature key exhaustion and a 401 response on the second request in E2E tests.
  4. The unit tests did not catch this because they mocked `verifyApiKey` to return a `user` field, masking the issue.
- **Suggestion**:
  - Mount the middleware only once using wildcards (`/todos/*`, `/notifications/*`, `/domains/*`).
  - Set a truthy context user object explicitly using the owner's ID: `c.set("user", { id: result.key.referenceId } as any)`.
  - Fix the unit test mock to match the real Better Auth response schema.

---

## Verified Claims

- **D1 Database Shared Queries and Zod Schemas Conformance** → verified via source code analysis of `packages/data-ops/src/auth/plugins.ts` → **PASS** (Correctly registers all requested plugins and configuration parameters).
- **Hono API Key Auth Middleware presence and endpoints mount check** → verified via source code analysis of `apps/data-service/src/index.ts` and `apps/data-service/src/middleware/api-key.ts` → **PASS** (It is present and mounted, albeit redundantly).
- **Compile and Unit Test health of packages/data-ops and apps/data-service** → verified via `npx tsc --noEmit` and `vp test run` → **PASS** (Compile succeeded, and isolated unit tests with mock passed).
- **E2E Integration Health** → verified via `vp test run` in `apps/e2e-tests` → **FAIL** (E2E API Key Limit Enforcement test failed).

---

## Coverage Gaps

- **Permissions Handling**: Better Auth API Key support permissions scopes, but permissions checking is not yet integrated or stress-tested in data-service route handlers.
  - _Risk Level_: Medium.
  - _Recommendation_: Investigate permissions validation once role-based access control is fully rolled out.

---

## Unverified Items

- **Actual Resend Email Sending integration**: Email sending options (`sendInvitationEmail`, `sendOTP`) are registered but falling back to logger in tests.
  - _Reason not verified_: External network access is restricted, and there are no SMTP credentials in local test environment.
