/* eslint-disable */
import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vite-plus/test";

import { getAuth } from "./auth";
import worker from "./index";

// Mock the auth module to bypass Better Auth's token parsing and hashing
vi.mock("./auth.js", async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    getAuth: vi.fn().mockImplementation((d1, options, bindings) => {
      const originalAuth = original.getAuth(d1, options, bindings);
      return {
        ...originalAuth,
        api: {
          ...originalAuth.api,
          getSession: vi.fn().mockResolvedValue(null),
          verifyApiKey: vi.fn().mockImplementation(async ({ body }) => {
            if (body && body.key === "test-api-key") {
              return {
                key: {
                  id: "key-123",
                  referenceId: "org-123", // org-scoped key → activeOrganizationId
                  configId: "organization",
                  prefix: "sk_org_",
                  key: "test-api-key",
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

describe("Custom Domain Management API", () => {
  it("manages domain lifecycle correctly", async () => {
    const d1 = await setupTestDb();
    const orgId = "org-123";

    // Seed organization (slug is product identity custom domains map to)
    await d1
      .prepare("INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
      .bind(orgId, "Test Org", "test-org", Date.now())
      .run();

    // Domains are a paid feature — seed active pro subscription for org-123
    await d1
      .prepare(
        `INSERT INTO subscription (
          id, plan, reference_id, status, period_start, period_end
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind("sub-1", "pro", orgId, "active", Date.now(), Date.now() + 86400000)
      .run();

    const env = {
      DATABASE: d1,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
      PLATFORM_BASE_DOMAIN: "app.example.com",
      DOMAIN_SDK_MODE: "memory",
    };

    const testHeaders = new Headers({
      "Content-Type": "application/json",
      Authorization: "Bearer test-api-key",
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
    expect(domainDetails.organizationSlug).toBe("test-org");
    expect(domainDetails.platformHostname).toBe("test-org.app.example.com");

    // 2. List domains (includes org slug mapping)
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
    expect(domainList[0].organizationSlug).toBe("test-org");
    expect(domainList[0].platformHostname).toBe("test-org.app.example.com");

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

  it("resolves platform subdomain and active custom domain to organization slug", async () => {
    const d1 = await setupTestDb();
    const orgId = "org-resolve";
    const slug = "acme";

    await d1
      .prepare("INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
      .bind(orgId, "Acme Co", slug, Date.now())
      .run();

    // Platform vanity: {slug}.PLATFORM_BASE_DOMAIN (no domains row needed)
    const vanityRes = await worker.fetch(
      new Request("http://localhost/tenant/resolve?host=acme.app.example.com"),
      {
        DATABASE: d1,
        PLATFORM_BASE_DOMAIN: "app.example.com",
        BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
        BETTER_AUTH_URL: "http://localhost",
      },
    );
    expect(vanityRes.status).toBe(200);
    const vanity = (await vanityRes.json()) as any;
    expect(vanity.organizationSlug).toBe("acme");
    expect(vanity.match).toBe("platform_subdomain");

    // Custom domain only resolves when status=active
    await d1
      .prepare(
        "INSERT INTO domains (id, organization_id, hostname, status, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind("dom-1", orgId, "www.customer.com", "pending", Date.now())
      .run();

    const pendingRes = await worker.fetch(
      new Request("http://localhost/tenant/resolve?host=www.customer.com"),
      {
        DATABASE: d1,
        PLATFORM_BASE_DOMAIN: "app.example.com",
        BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
        BETTER_AUTH_URL: "http://localhost",
      },
    );
    expect(pendingRes.status).toBe(404);

    await d1
      .prepare("UPDATE domains SET status = ? WHERE hostname = ?")
      .bind("active", "www.customer.com")
      .run();

    const customRes = await worker.fetch(
      new Request("http://localhost/tenant/resolve?host=www.customer.com"),
      {
        DATABASE: d1,
        PLATFORM_BASE_DOMAIN: "app.example.com",
        BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
        BETTER_AUTH_URL: "http://localhost",
      },
    );
    expect(customRes.status).toBe(200);
    const custom = (await customRes.json()) as any;
    expect(custom.organizationSlug).toBe("acme");
    expect(custom.match).toBe("custom_domain");
    expect(custom.domainStatus).toBe("active");
  });
});
