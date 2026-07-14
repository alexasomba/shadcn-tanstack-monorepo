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
          getSession: vi.fn().mockImplementation(async ({ headers }) => {
            const authHeader =
              typeof (headers as any)?.get === "function"
                ? (headers as any).get("Authorization")
                : (headers as any)?.Authorization;

            if (authHeader === "Bearer test-session-token") {
              return {
                user: {
                  id: "user-123",
                  name: "Test User",
                  email: "test@example.com",
                  role: "user",
                },
                session: {
                  id: "session-123",
                  userId: "user-123",
                  activeOrganizationId: "org-123",
                  expiresAt: new Date(Date.now() + 3600 * 1000),
                  token: "test-session-token",
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
  const migrationsDir = path.resolve(__dirname, "../../../packages/data-ops/src/drizzle");

  // Apply all sql files sequentially
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await d1.exec(sql);
  }
  return d1;
}

describe("Custom Domain Management API", () => {
  it("manages domain lifecycle correctly", async () => {
    const d1 = await setupTestDb();
    const orgId = "org-123";

    // 1. Seed mock organization
    await d1
      .prepare("INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
      .bind(orgId, "Test Org", "test-org", Date.now())
      .run();

    const env = {
      DATABASE: d1,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
    };

    const testHeaders = new Headers({
      "Content-Type": "application/json",
      Authorization: "Bearer test-session-token",
    });

    // 1. Create a domain
    const createRes = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "POST",
        headers: testHeaders,
        body: JSON.stringify({ hostname: "test.customer.com" }),
      }),
      env,
    );

    expect(createRes.status).toBe(201);
    const domainDetails = (await createRes.json()) as any;
    expect(domainDetails.hostname).toBe("test.customer.com");
    expect(domainDetails.status).toMatch(/^pending/);
    expect(domainDetails.records.length).toBeGreaterThan(0);

    // 2. List domains
    const listRes = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "GET",
        headers: testHeaders,
      }),
      env,
    );

    expect(listRes.status).toBe(200);
    const domainList = (await listRes.json()) as Array<any>;
    expect(domainList.length).toBe(1);
    expect(domainList[0].hostname).toBe("test.customer.com");

    // 3. Read domain details
    const readRes = await worker.fetch(
      new Request("http://localhost/domains/test.customer.com", {
        method: "GET",
        headers: testHeaders,
      }),
      env,
    );

    if (readRes.status !== 200) {
      console.log("READ DOMAIN ERROR RES:", await readRes.clone().json());
    }
    expect(readRes.status).toBe(200);
    const details = (await readRes.json()) as any;
    expect(details.hostname).toBe("test.customer.com");
    expect(details.records.length).toBeGreaterThan(0);

    // 4. Verify domain status (waitUntilActive resolves mock status)
    const verifyRes = await worker.fetch(
      new Request("http://localhost/domains/test.customer.com/verify", {
        method: "POST",
        headers: testHeaders,
      }),
      env,
    );

    expect(verifyRes.status).toBe(200);
    const verifiedDetails = (await verifyRes.json()) as any;
    expect(verifiedDetails.hostname).toBe("test.customer.com");

    // 5. Delete domain
    const deleteRes = await worker.fetch(
      new Request("http://localhost/domains/test.customer.com", {
        method: "DELETE",
        headers: testHeaders,
      }),
      env,
    );

    expect(deleteRes.status).toBe(200);
    expect(await deleteRes.json()).toEqual({ success: true });

    // 6. Verify listed domains is empty
    const listEmptyRes = await worker.fetch(
      new Request("http://localhost/domains", {
        method: "GET",
        headers: testHeaders,
      }),
      env,
    );

    expect(listEmptyRes.status).toBe(200);
    expect((await listEmptyRes.json()) as Array<any>).toEqual([]);
  });
});
