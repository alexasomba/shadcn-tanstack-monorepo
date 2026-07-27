# Handoff Report — 2026-07-15T07:14:50Z

## 1. Observation

- **Implementation Files**:
  - Better Auth plugins: `packages/data-ops/src/auth/plugins.ts`
  - Hono API Key Auth middleware: `apps/data-service/src/middleware/api-key.ts`
  - Mounting of middleware: `apps/data-service/src/index.ts`
- **Verbatim Code & Configuration**:
  - In `api-key.ts` lines 9-12:
    ```typescript
    if (c.get("user")) {
      await next();
      return;
    }
    ```
  - In `index.ts` lines 88-93:
    ```typescript
    app.use("/todos", requireApiKey);
    app.use("/todos/*", requireApiKey);
    app.use("/notifications", requireApiKey);
    app.use("/notifications/*", requireApiKey);
    app.use("/domains", requireApiKey);
    app.use("/domains/*", requireApiKey);
    ```
  - In `api-key.ts` catch block at lines 63-72:
    ```typescript
    } catch (error) {
      console.error("[data-service] API key verification failed:", error);
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid API key" },
        },
        401,
      );
    }
    ```
- **Test Execution Failures**:
  - Running `pnpm --filter data-service test` resulted in 3 failures in `src/challenger-stress.test.ts`:

    ```
    FAIL  src/challenger-stress.test.ts > API Key Authentication - Adversarial Challenger stress tests > 3. Bypasses/Ignores cookies: Rejects request with valid cookie session but NO key
    AssertionError: expected 200 to be 401

    FAIL  src/challenger-stress.test.ts > API Key Authentication - Adversarial Challenger stress tests > 4. Bypasses/Ignores cookies: Rejects request with valid cookie session AND invalid API key
    AssertionError: expected 200 to be 401

    FAIL  src/challenger-stress.test.ts > API Key Authentication - Adversarial Challenger stress tests > 5. Bypasses/Ignores cookies: Rejects request with valid cookie session in Authorization header but NO key
    AssertionError: expected 200 to be 401
    ```

  - Running `pnpm --filter e2e-tests test` resulted in 1 failure in `src/tier2.test.ts`:
    ```
    FAIL  src/tier2.test.ts > Tier 2 E2E Boundary & Corner Cases Tests > Developer API Keys (Tier 2) > 4.4 should enforce usage limit boundaries and block access exactly 1 request after limit is exceeded
    AssertionError: expected 401 to be 200 // at req2 (the 2nd request)
    ```

---

## 2. Logic Chain

1. **Vulnerability 1 (Cookie Bypass)**:
   - The global middleware `app.use("*")` in `index.ts` runs first, resolving user sessions from cookies or session headers via `auth.api.getSession` and setting `c.set("user", user)` on the Hono context.
   - When the request reaches the `requireApiKey` middleware, the middleware checks `c.get("user")`. Because a valid cookie session was set, `c.get("user")` is truthy, so the middleware executes `await next(); return;`, bypassing all key validation checks.
   - Consequently, requests authenticated only by cookies can fully access the developer API endpoints without needing or verifying developer API keys.

2. **Vulnerability 2 (Double Middleware Execution)**:
   - In `index.ts`, `requireApiKey` is mounted twice for each developer endpoint group: once for `/todos` and once for `/todos/*`.
   - For a request to `/todos`, both route patterns match, causing `requireApiKey` to be executed twice in the middleware chain.
   - Since the context might get cloned or variables might be evaluated before the second run (or the `c.get("user")` check is bypassed), `verifyApiKey` is invoked twice on Better Auth for a single HTTP request.
   - This double invocation decrements the API key's rate limit or usage count twice as fast, causing a key with a limit of 2 to hit its limit on the very first request. The second request then fails with 401/429.

3. **Vulnerability 3 (Error Handling Status Mismatch)**:
   - When the API key's limit is exceeded, Better Auth throws an `APIError` with status code 429 (`TOO_MANY_REQUESTS` / `USAGE_EXCEEDED`).
   - The `catch` block in `requireApiKey` catches this and returns a generic `401 Unauthorized` with an "Invalid API key" message, which hides the fact that the limit was reached and returns the wrong status code.

---

## 3. Caveats

- We operated strictly under a **review-only** constraint and did not modify any codebase files.
- The SQL schema details (like `apikey` table constraints) are assumed to be handled correctly by Better Auth's internals.

---

## 4. Conclusion

The implementation of Milestone 2 (R1) contains critical security and correctness defects. Our verdict is **REQUEST_CHANGES**.

### Quality Review Report

**Verdict**: REQUEST_CHANGES

#### Findings

##### [Critical] Finding 1: Cookie-Bypass Security Vulnerability

- **What**: If a user has a valid browser cookie session, the `requireApiKey` middleware bypasses the developer API key check completely.
- **Where**: `apps/data-service/src/middleware/api-key.ts` lines 9-12.
- **Why**: The check `if (c.get("user")) { await next(); return; }` short-circuits. If the global `getSession` middleware sets `c.set("user", user)` first, any request with a valid cookie bypasses API key verification.
- **Suggestion**: Remove lines 9-12 from `api-key.ts`.

##### [Major] Finding 2: Redundant Mounting & Double Execution

- **What**: Redundant mounting of `requireApiKey` on the parent app causes it to be executed twice for requests matching the base routes.
- **Where**: `apps/data-service/src/index.ts` lines 88-93.
- **Why**: `app.use("/todos", requireApiKey)` and `app.use("/todos/*", requireApiKey)` both match `/todos`, running the middleware twice, which double-counts API key usage limits.
- **Suggestion**: Mount `requireApiKey` directly on the sub-routers instead, i.e., `todosApp.use(requireApiKey)`, `notificationsApp.use(requireApiKey)`, and `domainsApp.use(requireApiKey)`. This executes it exactly once.

##### [Major] Finding 3: Incorrect Status Code for Usage Limit Exceeded (429 mapped to 401)

- **What**: Exceeded usage limits on developer API keys return a 401 status code instead of a 429.
- **Where**: `apps/data-service/src/middleware/api-key.ts` catch block at lines 63-72.
- **Why**: The catch block swallows all errors (including `APIError` from Better Auth with status 429) and maps them to a generic 401.
- **Suggestion**: Inspect the caught error, and if the error has a status code of 429, propagates a 429 status code with a descriptive error payload.

#### Verified Claims

- Better Auth plugin configuration matches requirements -> verified via `view_file` on `packages/data-ops/src/auth/plugins.ts` and `packages/data-ops/src/auth/client-plugins.ts` -> PASS.
- Organization context mapping -> verified via checking `c.set("session", { activeOrganizationId: result.key.referenceId })` in `requireApiKey` -> PASS.

#### Coverage Gaps

- None.

#### Unverified Items

- None.

---

### Adversarial Review Report

**Overall risk assessment**: HIGH

#### Challenges

##### [Critical] Challenge 1: Cookie bypass on developer endpoints

- **Assumption challenged**: Protected API endpoints are only accessible with a valid developer API key.
- **Attack scenario**: An authenticated frontend user (with session cookie) calls `/todos` or `/domains` without sending an API key, succeeding because the middleware short-circuits.
- **Blast radius**: Frontend session hijacking or CSRF attacks could target developer API endpoints.
- **Mitigation**: Enforce API Key checking for all requests on developer endpoints, regardless of frontend session state.

##### [High] Challenge 2: API key rate limit double-counting

- **Assumption challenged**: Middleware execution is atomic and executed once per request.
- **Attack scenario**: Calling `/todos` executes the middleware twice, decrementing the API key usage/rate limit counter twice for a single API call.
- **Blast radius**: Legitimate users will have their API keys rate-limited or blocked twice as fast as expected.
- **Mitigation**: Move middleware mounting to the sub-routers.

#### Stress Test Results

- Request with valid session cookie but no API key -> expected `401` -> got `200` -> **FAIL**.
- Request with valid session cookie + invalid API key -> expected `401` -> got `200` -> **FAIL**.
- Request with rate-limited key -> expected `429` on 3rd request -> got `401` on 2nd request -> **FAIL**.

#### Unchallenged Areas

- D1 database connections and query sanitization (assumed safe).

---

## 5. Verification Method

To independently verify these findings:

1. Run the data-service unit tests:
   `pnpm --filter data-service test`
   Observe the failing tests in `src/challenger-stress.test.ts`.
2. Run the E2E boundary tests:
   `pnpm --filter e2e-tests test`
   Observe the failure in `src/tier2.test.ts` for rate limit enforcement at request 2 instead of request 3.
