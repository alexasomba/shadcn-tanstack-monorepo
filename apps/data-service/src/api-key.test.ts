/* eslint-disable */
import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vite-plus/test";

import { getAuth } from "./auth";
import worker from "./index";

// Mock the auth module to bypass Better Auth's token parsing and hashing
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
          getSession: vi.fn().mockResolvedValue(null), // Force fallback to API Key auth
          verifyApiKey: vi.fn().mockImplementation(async ({ body }) => {
            if (body && body.key === "test-api-key") {
              return {
                key: {
                  id: "key-123",
                  referenceId: "org-123", // Matches organizationId for domains
                  prefix: "test",
                  key: "test-api-key",
                },
              };
            }
            if (body && body.key === "api-key-without-key-property") {
              return {
                otherProperty: "unexpected-structure",
              } as any;
            }
            return null;
          }),
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

  // Apply all sql files sequentially from nested directories
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

describe("API Key Authentication Middleware", () => {
  it("authenticates and authorizes custom domains endpoint via Bearer API key", async () => {
    const d1 = await setupTestDb();
    const orgId = "org-123";

    // Seed mock organization
    await d1
      .prepare("INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
      .bind(orgId, "Test Org", "test-org", Date.now())
      .run();

    const env = {
      DATABASE: d1,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
    };

    // 1. Unauthenticated request should fail
    const unauthRes = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "GET",
      }),
      env,
    );
    expect(unauthRes.status).toBe(401);

    // 2. Request with invalid API key should fail
    const invalidRes = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid-api-key",
        },
      }),
      env,
    );
    expect(invalidRes.status).toBe(401);

    // 2.5. Request with API key having no key property in verification result should fail with 401 and not log stack trace
    const consoleErrorSpy = vi.spyOn(console, "error");
    const incompleteRes = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "GET",
        headers: {
          Authorization: "Bearer api-key-without-key-property",
        },
      }),
      env,
    );
    expect(incompleteRes.status).toBe(401);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();

    // 3. Request with valid Bearer API key should succeed
    const validBearerRes = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "GET",
        headers: {
          Authorization: "Bearer test-api-key",
        },
      }),
      env,
    );
    expect(validBearerRes.status).toBe(200);
    const domainList = (await validBearerRes.json()) as Array<any>;
    expect(domainList.length).toBe(0); // Valid but empty list

    // 4. Request with valid x-api-key header should succeed
    const validHeaderRes = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "GET",
        headers: {
          "x-api-key": "test-api-key",
        },
      }),
      env,
    );
    expect(validHeaderRes.status).toBe(200);
  });
});
