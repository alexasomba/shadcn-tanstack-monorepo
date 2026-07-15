/* eslint-disable */
import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";
import { describe, expect, it } from "vite-plus/test";

import worker from "./index";

/** Helper to create a mock D1Database object using better-sqlite3 */
function createMockD1(dbPath = ":memory:", enableForeignKeys = false): D1Database {
  const sqlite = new Database(dbPath);

  if (enableForeignKeys) {
    sqlite.exec("PRAGMA foreign_keys = ON;");
  }

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
async function setupTestDb(enableForeignKeys = false) {
  const d1 = createMockD1(":memory:", enableForeignKeys);
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

describe("Database Seeding Integration Tests", () => {
  it("successfully seeds database and verifies initial counts", async () => {
    // 1. Setup a migrated database with foreign keys disabled (standard setup)
    const d1 = await setupTestDb(false);
    const env = {
      DATABASE: d1,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
    };

    // 2. Before seeding, counts should be zero
    const beforeVerifyRes = await worker.fetch(
      new Request("http://localhost/database/seed/verify", {
        method: "GET",
      }),
      env,
    );
    expect(beforeVerifyRes.status).toBe(200);
    const beforeBody = (await beforeVerifyRes.json()) as any;
    expect(beforeBody.success).toBe(true);
    expect(beforeBody.counts).toEqual({
      users: 0,
      organizations: 0,
      todos: 0,
    });

    // 3. POST to /database/seed to execute seeding
    const seedRes = await worker.fetch(
      new Request("http://localhost/database/seed", {
        method: "POST",
      }),
      env,
    );
    expect(seedRes.status).toBe(200);
    const seedBody = (await seedRes.json()) as any;
    expect(seedBody.success).toBe(true);

    // 4. GET /database/seed/verify to ensure seeding succeeded with correct counts (2 users, 1 organization, 1 todo)
    const afterVerifyRes = await worker.fetch(
      new Request("http://localhost/database/seed/verify", {
        method: "GET",
      }),
      env,
    );
    expect(afterVerifyRes.status).toBe(200);
    const afterBody = (await afterVerifyRes.json()) as any;
    expect(afterBody.success).toBe(true);
    expect(afterBody.counts).toEqual({
      users: 2,
      organizations: 1,
      todos: 1,
    });
  });

  it("checks seeding idempotency (running twice does not double counts)", async () => {
    const d1 = await setupTestDb(false);
    const env = {
      DATABASE: d1,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
    };

    // 1. First seeding pass
    const seedRes1 = await worker.fetch(
      new Request("http://localhost/database/seed", {
        method: "POST",
      }),
      env,
    );
    expect(seedRes1.status).toBe(200);

    // 2. Second seeding pass
    const seedRes2 = await worker.fetch(
      new Request("http://localhost/database/seed", {
        method: "POST",
      }),
      env,
    );
    expect(seedRes2.status).toBe(200);

    // 3. Verify counts remain exactly at target counts instead of doubling
    const verifyRes = await worker.fetch(
      new Request("http://localhost/database/seed/verify", {
        method: "GET",
      }),
      env,
    );
    expect(verifyRes.status).toBe(200);
    const body = (await verifyRes.json()) as any;
    expect(body.success).toBe(true);
    expect(body.counts).toEqual({
      users: 2,
      organizations: 1,
      todos: 1,
    });
  });

  it("handles missing migrations gracefully with a 500 error", async () => {
    // Create database instance but do NOT run setupTestDb migrations
    const d1 = createMockD1(":memory:", false);
    const env = {
      DATABASE: d1,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
    };

    // 1. POST /database/seed should return 500
    const seedRes = await worker.fetch(
      new Request("http://localhost/database/seed", {
        method: "POST",
      }),
      env,
    );
    expect(seedRes.status).toBe(500);
    const seedBody = (await seedRes.json()) as any;
    expect(seedBody.success).toBe(false);
    expect(seedBody.error.message).toMatch(/migrations not applied|no such table/i);

    // 2. GET /database/seed/verify should return 500
    const verifyRes = await worker.fetch(
      new Request("http://localhost/database/seed/verify", {
        method: "GET",
      }),
      env,
    );
    expect(verifyRes.status).toBe(500);
    const verifyBody = (await verifyRes.json()) as any;
    expect(verifyBody.success).toBe(false);
    expect(verifyBody.error.message).toMatch(/migrations not applied|no such table/i);
  });

  it("validates foreign key constraints are enforced and respected by seed script", async () => {
    // 1. Setup database with foreign keys enabled
    const d1 = await setupTestDb(true);
    const env = {
      DATABASE: d1,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
    };

    // 2. Confirm foreign keys are enforced by attempting to insert orphaned record in member table
    await expect(
      d1
        .prepare(
          "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind("member-1", "non-existent-org", "non-existent-user", "member", Date.now())
        .run(),
    ).rejects.toThrow(/FOREIGN KEY constraint failed/);

    // 3. Run the seed endpoint
    const seedRes = await worker.fetch(
      new Request("http://localhost/database/seed", {
        method: "POST",
      }),
      env,
    );

    // 4. The seed endpoint must complete successfully without throwing foreign key violations
    expect(seedRes.status).toBe(200);

    // 5. Verify counts matches target configuration
    const verifyRes = await worker.fetch(
      new Request("http://localhost/database/seed/verify", {
        method: "GET",
      }),
      env,
    );
    expect(verifyRes.status).toBe(200);
    const body = (await verifyRes.json()) as any;
    expect(body.success).toBe(true);
    expect(body.counts).toEqual({
      users: 2,
      organizations: 1,
      todos: 1,
    });
  });
});
