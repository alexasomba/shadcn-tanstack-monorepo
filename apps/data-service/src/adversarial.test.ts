import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";
/* eslint-disable */
import { describe, expect, it, vi, beforeEach, beforeAll } from "vite-plus/test";

import worker from "./index";

// Mock Sentry captureException
const { sentrySpy, mockSession, mockApiKeyResult, mockHandlerResult, mockListDomainsThrow } =
  vi.hoisted(() => ({
    sentrySpy: vi.fn(),
    mockSession: { value: null as any },
    mockApiKeyResult: { value: null as any },
    mockHandlerResult: { value: null as any },
    mockListDomainsThrow: { value: false },
  }));

vi.mock("@sentry/cloudflare", () => ({
  captureException: sentrySpy,
  withSentry: (config: any, workerObj: any) => workerObj,
}));

vi.mock("data-ops", async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    listDomains: async (db: any, orgId: any) => {
      if (mockListDomainsThrow.value) {
        throw new Error("Simulated unhandled domain error");
      }
      return original.listDomains(db, orgId);
    },
    listDomainsWithOrganization: async (db: any, orgId: any, options?: any) => {
      if (mockListDomainsThrow.value) {
        throw new Error("Simulated unhandled domain error");
      }
      return original.listDomainsWithOrganization(db, orgId, options);
    },
  };
});

vi.mock("./auth.js", async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    getAuth: vi.fn().mockImplementation(() => {
      return {
        api: {
          getSession: async () => mockSession.value,
          verifyApiKey: async () => mockApiKeyResult.value,
        },
        handler: async (request: Request) => {
          if (mockHandlerResult.value) {
            return mockHandlerResult.value(request);
          }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        },
      };
    }),
  };
});

/** Helper to create a mock D1Database object using better-sqlite3 */
function createMockD1(dbPath = ":memory:"): D1Database {
  const sqlite = new Database(dbPath);

  const mockD1: Partial<D1Database> = {
    prepare(query: string) {
      // console.log("MOCK D1 PREPARE:", query);
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

/** Helper to bootstrap test database schemas from SQL migrations */
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

describe("Milestone 7 Phase 2: Adversarial Coverage Hardening Tests (Tier 5)", () => {
  let d1: D1Database;
  let env: any;

  beforeAll(async () => {
    d1 = await setupTestDb();
    env = {
      DATABASE: d1,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
    };
  });

  beforeEach(() => {
    sentrySpy.mockClear();
    mockSession.value = null;
    mockApiKeyResult.value = null;
    mockHandlerResult.value = null;
  });

  // ==========================================
  // 1. Paystack Webhook and Subscription Limits
  // ==========================================
  describe("Paystack Subscription Webhook and Downgrade/Upgrade Webhooks", () => {
    it("1.1 should route paystack webhook POST requests to Better Auth handler", async () => {
      let handlerCalled = false;
      mockHandlerResult.value = (req: Request) => {
        handlerCalled = true;
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      };

      const res = await worker.fetch(
        new Request("http://localhost/api/auth/paystack/webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-paystack-signature": "test-signature",
          },
          body: JSON.stringify({ event: "charge.success", data: {} }),
        }),
        env,
      );

      expect(res.status).toBe(200);
      expect(handlerCalled).toBe(true);
      const json = (await res.json()) as any;
      expect(json.received).toBe(true);
    });

    it("1.2 should route subscription upgrade POST request to Better Auth", async () => {
      let handlerCalled = false;
      mockHandlerResult.value = (req: Request) => {
        handlerCalled = true;
        return new Response(JSON.stringify({ upgraded: true }), { status: 200 });
      };

      const res = await worker.fetch(
        new Request("http://localhost/api/auth/paystack/upgrade-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: "premium-plan" }),
        }),
        env,
      );

      expect(res.status).toBe(200);
      expect(handlerCalled).toBe(true);
      const json = (await res.json()) as any;
      expect(json.upgraded).toBe(true);
    });
  });

  // ==========================================
  // 2. Tenant Isolation & Cross-Tenant Access
  // ==========================================
  describe("Tenant Isolation on Organizations & Domains", () => {
    const orgIdA = "org-A";
    const orgIdB = "org-B";
    const hostnameA = "domain-belonging-to-org-a.com";

    beforeAll(async () => {
      // Seed organizations
      await d1
        .prepare("INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
        .bind(orgIdA, "Org A", "org-a", Date.now())
        .run();
      await d1
        .prepare("INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
        .bind(orgIdB, "Org B", "org-b", Date.now())
        .run();

      // Paid plan required for /domains/* (entitlements gate)
      for (const [subId, orgId] of [
        ["sub-a", orgIdA],
        ["sub-b", orgIdB],
      ] as const) {
        await d1
          .prepare(
            `INSERT INTO subscription (id, plan, reference_id, status, period_start, period_end)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(subId, "pro", orgId, "active", Date.now(), Date.now() + 86400000)
          .run();
      }

      // Seed a custom domain belonging to Org A
      await d1
        .prepare(
          "INSERT INTO domains (id, organization_id, hostname, status, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind("dom-123", orgIdA, hostnameA, "pending", Date.now())
        .run();
    });

    it("2.1 should reject cross-tenant domain read access with 403 Forbidden", async () => {
      // Set active session organization to Org B via API key
      mockApiKeyResult.value = {
        key: {
          id: "apikey-B",
          referenceId: orgIdB,
          configId: "organization",
          prefix: "sk_org_",
          key: "api-key-B",
        },
      };

      const res = await worker.fetch(
        new Request(`http://localhost/domains/${hostnameA}`, {
          method: "GET",
          headers: { "x-api-key": "api-key-B" },
        }),
        env,
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
      expect(json.error.message).toContain("Domain does not belong to active organization");
    });

    it("2.2 should reject cross-tenant domain verification POST request with 403 Forbidden", async () => {
      mockApiKeyResult.value = {
        key: {
          id: "apikey-B",
          referenceId: orgIdB,
          configId: "organization",
          prefix: "sk_org_",
          key: "api-key-B",
        },
      };

      const res = await worker.fetch(
        new Request(`http://localhost/domains/${hostnameA}/verify`, {
          method: "POST",
          headers: { "x-api-key": "api-key-B" },
        }),
        env,
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("2.3 should reject cross-tenant domain delete request with 403 Forbidden", async () => {
      mockApiKeyResult.value = {
        key: {
          id: "apikey-B",
          referenceId: orgIdB,
          configId: "organization",
          prefix: "sk_org_",
          key: "api-key-B",
        },
      };

      const res = await worker.fetch(
        new Request(`http://localhost/domains/${hostnameA}`, {
          method: "DELETE",
          headers: { "x-api-key": "api-key-B" },
        }),
        env,
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("2.4 should isolate todos by organization in Hono data-service", async () => {
      // 1. Create a todo using Org A API key
      mockApiKeyResult.value = {
        key: {
          id: "apikey-A",
          referenceId: orgIdA,
          configId: "organization",
          prefix: "sk_org_",
          key: "api-key-A",
        },
      };

      // Create todo
      const createRes = await worker.fetch(
        new Request("http://localhost/todos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer api-key-A",
          },
          body: JSON.stringify({ title: "Secret Org A Todo" }),
        }),
        env,
      );
      expect(createRes.status).toBe(201);
      const createdTodo = (await createRes.json()) as any;

      // 2. Query/List todos using Org B session (we mock the session but Hono has requireApiKey middleware on /todos/*)
      // So we must use an API key for Org B
      mockApiKeyResult.value = {
        key: {
          id: "apikey-B",
          referenceId: orgIdB, // active organization is Org B
          configId: "organization",
          prefix: "sk_org_",
          key: "api-key-B",
        },
      };

      const listRes = await worker.fetch(
        new Request("http://localhost/todos", {
          method: "GET",
          headers: {
            Authorization: "Bearer api-key-B",
          },
        }),
        env,
      );

      expect(listRes.status).toBe(200);
      const todoList = (await listRes.json()) as Array<any>;

      // Verification: Org B CANNOT see the todo created by Org A! This verifies tenant isolation!
      const foundSecretTodo = todoList.find((t) => t.id === createdTodo.id);
      expect(foundSecretTodo).toBeUndefined();
    });
  });

  // ==========================================
  // 3. Developer API Keys Limits and Expiration
  // ==========================================
  describe("Developer API Keys Limitations and Error Handling Gaps", () => {
    it("3.1 should return a generic 401 Unauthorized for expired or revoked keys", async () => {
      // When Better Auth verifyApiKey returns null (signifying invalid/expired/revoked key)
      mockApiKeyResult.value = null;

      const res = await worker.fetch(
        new Request("http://localhost/todos", {
          method: "GET",
          headers: { "x-api-key": "expired-or-revoked-key" },
        }),
        env,
      );

      // Verify that Hono returns 401 with a generic message and does not distinguish the error
      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
      expect(json.error.message).toBe("Invalid API key");
    });

    it("3.2 should return a 403 Forbidden when key verification throws a usage limit error", async () => {
      // Simulating a database exception or a plugin throw
      vi.mocked(mockApiKeyResult).value = Promise.reject(
        new Error("API Key has reached its usage limit"),
      );

      const res = await worker.fetch(
        new Request("http://localhost/todos", {
          method: "GET",
          headers: { "x-api-key": "rate-limited-or-limit-exceeded-key" },
        }),
        env,
      );

      // Verify that the error is caught and converted to a 403 Forbidden
      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
      expect(json.error.message).toBe("API Key has reached its usage limit");
    });
  });

  // ==========================================
  // 4. Sentry Exception Monitoring
  // ==========================================
  describe("Sentry Exception Monitoring Telemetry", () => {
    it("4.1 should capture debug sentry-test exceptions and report them to Sentry", async () => {
      const res = await worker.fetch(
        new Request("http://localhost/api/debug/sentry-test", {
          method: "GET",
        }),
        env,
      );

      expect(res.status).toBe(500);
      expect(sentrySpy).toHaveBeenCalled();
      const lastError = sentrySpy.mock.calls[0][0];
      expect(lastError.message).toBe("Sentry test exception");
    });

    it("4.2 should capture unhandled route execution exceptions and report them to Sentry", async () => {
      // Org + paid plan so we pass requireApiKey / requireFeature into the list handler
      await d1
        .prepare(
          "INSERT OR IGNORE INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)",
        )
        .bind("org-123", "Sentry Org", "sentry-org", Date.now())
        .run();
      await d1
        .prepare(
          `INSERT OR IGNORE INTO subscription (id, plan, reference_id, status, period_start, period_end)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind("sub-sentry", "pro", "org-123", "active", Date.now(), Date.now() + 86400000)
        .run();

      mockApiKeyResult.value = {
        key: {
          id: "apikey-123",
          referenceId: "org-123",
          configId: "organization",
          prefix: "sk_org_",
          key: "valid-key-but-db-fails",
        },
      };

      // Set the flag to throw unhandled error inside listDomains
      mockListDomainsThrow.value = true;

      const res = await worker.fetch(
        new Request("http://localhost/domains", {
          method: "GET",
          headers: { "x-api-key": "valid-key-but-db-fails" },
        }),
        env,
      );

      expect(res.status).toBe(500);
      // Sentry should capture this unhandled DB error
      expect(sentrySpy).toHaveBeenCalled();
      const lastError = sentrySpy.mock.calls.find((c) =>
        c[0].message.includes("Simulated unhandled domain error"),
      );
      expect(lastError).toBeDefined();

      // Reset the flag
      mockListDomainsThrow.value = false;
    });
  });
});
