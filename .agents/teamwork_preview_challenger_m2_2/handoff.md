# Handoff Report — 2026-07-15T05:08:50Z

## 1. Observation

- **Implementation Location**: The Hono API key middleware is implemented in `apps/data-service/src/middleware/api-key.ts`.
- **Short-circuit Bypass Code**: In `api-key.ts`, lines 9-12 short-circuit the key verification process:
  ```typescript
  if (c.get("user")) {
    await next();
    return;
  }
  ```
- **Global Session Middleware**: In `apps/data-service/src/index.ts`, a global middleware is mounted on `*` at lines 65-86, which attempts to resolve user session from cookies:
  ```typescript
  app.use("*", async (c, next) => {
    try {
      const auth = getAuth(c.env.DATABASE, ...);
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
- **Stress-Test Failures**: We executed a temporary stress-test suite (`apps/data-service/src/api-key-stress.test.ts`) using the project's Vitest runner via `vp test run src/api-key-stress.test.ts`. Two tests failed:

  ```
  FAIL  src/api-key-stress.test.ts > API Key Authentication - Challenger Stress Tests > 6. VULNERABILITY TEST: Rejects request with valid cookie session but NO key
  AssertionError: expected 200 to be 401

  FAIL  src/api-key-stress.test.ts > API Key Authentication - Challenger Stress Tests > 7. VULNERABILITY TEST: Rejects request with valid cookie session AND invalid API key
  AssertionError: expected 200 to be 401
  ```

---

## 2. Logic Chain

1. A client initiates a request to a protected developer endpoint (e.g. `/domains`, `/todos`, `/notifications`) with a valid session cookie (from `user-web` or `admin-web`) but either NO API key or an invalid API key.
2. The global `app.use("*")` middleware intercepts the request first. It calls `auth.api.getSession` with the raw request headers (including the cookie), successfully resolves the session, and sets `c.set("user", user)` and `c.set("session", session)` in Hono's context.
3. The request then hits the `requireApiKey` middleware.
4. Because `c.get("user")` is truthy due to the global cookie session resolution, `requireApiKey` immediately does `await next(); return;`, completely bypassing key extraction, key presence check, and key verification.
5. As a result, the request is allowed to proceed and succeed with a `200` status, accessing tenant-specific data without a valid developer API key. This is an authentication bypass.

---

## 3. Caveats

- We did not modify any codebase files (per the review-only / do not modify files constraint). Thus, the bypass vulnerability is still active in the current implementation.
- Better Auth's internals of the `verifyApiKey` function itself (part of `@better-auth/api-key`) were not fully audited beyond black-box and mock verification since they are part of the external vendor library.

---

## 4. Conclusion

- **VULNERABILITY IDENTIFIED**: The `requireApiKey` middleware has a security flaw. It does NOT enforce API key requirements if a valid cookie-based user session is present in the request.
- **Mitigation**: Remove the short-circuit check `if (c.get("user")) { await next(); return; }` in `apps/data-service/src/middleware/api-key.ts` lines 9-12. This will force all API requests hitting protected developer resource endpoints to provide a valid API key.
- **Edge Cases & SQL Injection**: Safe. Trim controls handle empty/whitespace keys correctly. SQLite/Drizzle parameterization prevents SQL injection payloads.
- **Org Context Mapping**: Correct. When the API key is verified, `session.activeOrganizationId` is set to the key's `referenceId`, which maps the tenant context accurately for downstream route handlers.

---

## 5. Verification Method

To verify these findings, you can write the following test file `apps/data-service/src/api-key-stress.test.ts` and run it:

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
            const cookie = headers?.get("cookie") || headers?.get("Cookie");
            if (cookie && cookie.includes("better-auth.session_token=valid-session-cookie")) {
              return {
                user: {
                  id: "cookie-user-123",
                  name: "Cookie User",
                  email: "cookie@example.com",
                  role: "user",
                },
                session: {
                  id: "session-123",
                  userId: "cookie-user-123",
                  activeOrganizationId: "org-cookie-456",
                },
              };
            }
            return null;
          }),
          verifyApiKey: vi.fn().mockImplementation(async ({ body, headers }) => {
            const cookie = headers?.get("cookie") || headers?.get("Cookie");
            if (cookie) {
              throw new Error(
                "verifyApiKey was called with non-sterile headers (contained cookies)!",
              );
            }
            if (body && body.key === "valid-api-key") {
              return {
                user: {
                  id: "key-user-789",
                  name: "API Key User",
                  email: "apikey@example.com",
                  role: "developer",
                },
                key: {
                  id: "key-123",
                  referenceId: "org-key-789",
                  prefix: "test",
                  key: "valid-api-key",
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

describe("API Key Authentication - Challenger Stress Tests", () => {
  const envPromise = setupTestDb().then((d1) => ({
    DATABASE: d1,
    BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
    BETTER_AUTH_URL: "http://localhost",
  }));

  it("VULNERABILITY TEST: Rejects request with valid cookie session but NO key", async () => {
    const env = await envPromise;
    const res = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "GET",
        headers: { Cookie: "better-auth.session_token=valid-session-cookie" },
      }),
      env,
    );
    expect(res.status).toBe(401);
  });
});
```

Run command:
`vp test run src/api-key-stress.test.ts` inside `apps/data-service/` directory.

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
