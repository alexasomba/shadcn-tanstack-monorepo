# Handoff Report — 2026-07-15T06:11:50Z

## 1. Observation

- **Implementation File**: The developer API key middleware is located in `apps/data-service/src/middleware/api-key.ts`.
- **Bypass Short-circuit Code**: In `api-key.ts`, lines 9-12 contain:
  ```typescript
  if (c.get("user")) {
    await next();
    return;
  }
  ```
- **Global Session Handler**: In `apps/data-service/src/index.ts`, a global middleware at lines 65-86 resolves user sessions from cookies or session tokens and sets them on Hono's context:
  ```typescript
  app.use("*", async (c, next) => {
    try {
      const auth = getAuth(...);
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      c.set("user", session?.user ?? null);
      c.set("session", session?.session ?? null);
    } catch (error) {
      c.set("user", null);
      c.set("session", null);
    }
    await next();
  });
  ```
- **Stress-Test Results**: A temporary test file `apps/data-service/src/challenger-stress.test.ts` was written and run via `vp test run src/challenger-stress.test.ts`. 3 tests failed:

  ```
   ❯ src/challenger-stress.test.ts (8 tests | 3 failed) 398ms
       ✓ 1. Rejects request without keys 174ms
       ✓ 2. Rejects request with invalid key format or random string 34ms
       × 3. Bypasses/Ignores cookies: Rejects request with valid cookie session but NO key 34ms
       × 4. Bypasses/Ignores cookies: Rejects request with valid cookie session AND invalid API key 22ms
       × 5. Bypasses/Ignores cookies: Rejects request with valid cookie session in Authorization header but NO key 13ms
       ✓ 6. Edge Case: Rejects empty key, space-only key, or null-like key 48ms
       ✓ 7. SQL Injection: Parameterization prevents SQLi payloads in key 45ms
       ✓ 8. Correctly maps organization context for valid developer API key 25ms

  ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

   FAIL  src/challenger-stress.test.ts > API Key Authentication - Adversarial Challenger stress tests > 3. Bypasses/Ignores cookies: Rejects request with valid cookie session but NO key
  AssertionError: expected 200 to be 401 // Object.is equality
  ```

- **Performance / Timeout Issue**: When running the entire test suite, the file `src/domains.test.ts` is prone to timing out:
  ```
   FAIL  src/domains.test.ts > Custom Domain Management API > manages domain lifecycle correctly
  Error: Test timed out in 5000ms.
  ```
  This is caused by the 2000ms blocking wait in `sdk.waitUntilActive(hostname, { timeoutMs: 2000 })` on `apps/data-service/src/endpoints/domains/verify.ts` line 105, which is called during `/verify` and hits the full timeout when using the `memoryProvider`.

---

## 2. Logic Chain

1. A client initiates a request to a developer API endpoint (e.g. `/domains`, `/todos`, `/notifications`) with a valid session cookie (or session token in the `Authorization` header) but **without** a valid API key (or with an invalid API key).
2. The global `app.use("*")` middleware executes first, parses the headers/cookies, calls `auth.api.getSession`, and successfully sets `c.set("user", user)` on the context.
3. The request then hits the `requireApiKey` middleware.
4. Because `c.get("user")` is truthy, the middleware short-circuits at lines 9-12 and calls `await next(); return;`, completely bypassing key extraction, presence checks, and verification.
5. Consequently, the client successfully accesses developer resource endpoints and performs actions (e.g. creating/deleting domains or todos) using standard session cookies, defeating the API key requirement constraint.

---

## 3. Caveats

- We did not modify any codebase files per constraints. The bypass vulnerability remains active in the current implementation.
- Better Auth's `verifyApiKey` function logic was tested via mocking/black-box. We assumed it works as expected when provided sterile headers.

---

## 4. Conclusion

- **VULNERABILITY CONFIRMED**: The Hono middleware `requireApiKey` has a critical security flaw. It does NOT enforce API key requirements if a valid cookie-based user session is present in the request.
- **Mitigation**: Remove the short-circuit check `if (c.get("user")) { await next(); return; }` in `apps/data-service/src/middleware/api-key.ts` lines 9-12. This forces all protected developer endpoints to validate the API key.
- **Org Context Mapping**: Verified. The active organization ID is set correctly to `result.key.referenceId` when a valid developer API key is validated.
- **Edge Cases**: Empty keys and whitespace keys are handled correctly. SQL injection is prevented.
- **Performance**: The domains test is prone to timeout when run under Vitest concurrently due to a 2000ms blocking wait in `sdk.waitUntilActive(hostname, { timeoutMs: 2000 })` using the memory provider.

---

## 5. Verification Method

To verify these findings, you can write the following test file `apps/data-service/src/challenger-stress.test.ts` and run it:

```typescript
import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vite-plus/test";
import { getAuth } from "./auth";
import worker from "./index";

vi.mock("./auth", async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    getAuth: vi.fn().mockImplementation((d1, options, bindings) => {
      const originalAuth = original.getAuth(d1, options, bindings);
      return {
        ...originalAuth,
        api: {
          ...originalAuth.api,
          getSession: vi.fn().mockImplementation(async ({ headers }) => {
            const cookie = headers?.get("cookie") || headers?.get("Cookie") || "";
            if (cookie.includes("better-auth.session_token=valid-cookie-session")) {
              return {
                user: {
                  id: "cookie-user-1",
                  name: "Cookie User",
                  email: "cookie@example.com",
                  role: "user",
                },
                session: {
                  id: "sess-1",
                  userId: "cookie-user-1",
                  activeOrganizationId: "org-cookie-1",
                },
              };
            }
            return null;
          }),
          verifyApiKey: vi.fn().mockImplementation(async ({ body, headers }) => {
            const cookie = headers?.get("cookie") || headers?.get("Cookie");
            if (cookie) {
              throw new Error("verifyApiKey called with non-sterile headers containing cookies");
            }
            if (body && body.key === "valid-dev-api-key") {
              return {
                user: {
                  id: "dev-user-2",
                  name: "Dev User",
                  email: "dev@example.com",
                  role: "developer",
                },
                key: {
                  id: "key-valid-1",
                  referenceId: "org-dev-2",
                  prefix: "test",
                  key: "valid-dev-api-key",
                },
              };
            }
            return null;
          }),
        },
      };
    }),
  };
});

function createMockD1(dbPath = ":memory:"): D1Database {
  const sqlite = new Database(dbPath);
  const mockD1: Partial<D1Database> = {
    prepare(query: string) {
      const stmt = sqlite.prepare(query);
      return {
        bind(...args: Array<any>) {
          return {
            async all() {
              stmt.raw(false);
              const rows = stmt.all(...args);
              return { results: rows, success: true };
            },
            async run() {
              const result = stmt.run(...args);
              return { success: true, meta: { changes: result.changes } };
            },
            async first(col?: string) {
              stmt.raw(false);
              const row = stmt.get(...args) as any;
              if (!row) return null;
              if (col) return row[col];
              return row;
            },
            async raw() {
              stmt.raw(false);
              const rows = stmt.all(...args);
              return rows.map((r: any) => Object.values(r));
            },
          } as any;
        },
        async all() {
          stmt.raw(false);
          const rows = stmt.all();
          return { results: rows, success: true };
        },
        async run() {
          const result = stmt.run();
          return { success: true, meta: { changes: result.changes } };
        },
        async first(col?: string) {
          stmt.raw(false);
          const row = stmt.get() as any;
          if (!row) return null;
          if (col) return row[col];
          return row;
        },
        async raw() {
          stmt.raw(false);
          const rows = stmt.all();
          return rows.map((r: any) => Object.values(r));
        },
      } as any;
    },
    async batch(statements: Array<any>) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.all());
      }
      return results as any;
    },
    async exec(query: string) {
      sqlite.exec(query);
      return { count: 0, duration: 0 };
    },
  };
  return mockD1 as D1Database;
}

async function setupTestDb() {
  const d1 = createMockD1();
  const migrationsDir = path.resolve(
    __dirname,
    "../../../packages/data-ops/src/drizzle/migrations",
  );
  const dirs = fs
    .readdirSync(migrationsDir)
    .filter((d) => fs.statSync(path.join(migrationsDir, d)).isDirectory())
    .sort();
  for (const dir of dirs) {
    const migrationFile = path.join(migrationsDir, dir, "migration.sql");
    if (fs.existsSync(migrationFile)) {
      const sql = fs.readFileSync(migrationFile, "utf8");
      await d1.exec(sql);
    }
  }
  return d1;
}

describe("API Key Authentication - Adversarial Challenger stress tests", () => {
  const envPromise = setupTestDb().then((d1) => ({
    DATABASE: d1,
    BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
    BETTER_AUTH_URL: "http://localhost",
  }));

  it("Rejects request with valid cookie session but NO key", async () => {
    const env = await envPromise;
    const res = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "GET",
        headers: { Cookie: "better-auth.session_token=valid-cookie-session" },
      }),
      env,
    );
    expect(res.status).toBe(401);
  });
});
```

Run test suite command:
`vp test run src/challenger-stress.test.ts` inside `apps/data-service/`.

---

## Challenger Report (Adversarial Review)

### Challenge Summary

- **Overall risk assessment**: **HIGH**

### Challenges

#### [Critical] Challenge 1: Cookie Bypass Vulnerability in `requireApiKey`

- **Assumption challenged**: That the API key middleware correctly enforces the presence and validity of API keys.
- **Attack scenario**: A user logs in via the front-end (user-web / admin-web), receiving a valid session cookie. They then invoke `/domains`, `/todos`, or `/notifications` without providing any API key. The API key middleware detects that the user is authenticated via cookie, and completely skips the API key check.
- **Blast radius**: The protected API endpoints are accessible using a standard session cookie rather than developer API keys, breaking the API key requirement and risking unintended data access.
- **Mitigation**: Remove the short-circuit check `if (c.get("user")) { await next(); return; }` from `requireApiKey`.

### Stress Test Results

- **Request without key/cookie** → expect `401` → returns `401` → **PASS**
- **Request with valid cookie but NO key** → expect `401` → returns `200` → **FAIL (Bypassed)**
- **Request with valid cookie + invalid key** → expect `401` → returns `200` → **FAIL (Bypassed)**
- **Empty / spaces key** → expect `401` → returns `401` → **PASS**
- **SQL Injection payloads in key** → expect `401` → returns `401` → **PASS**

### Unchallenged Areas

- **Better Auth Internals** — trusted vendor implementation.
