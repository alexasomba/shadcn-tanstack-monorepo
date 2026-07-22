import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";
import { describe, expect, it, afterAll } from "vite-plus/test";

import worker from "./index";

const dbsToClose: Array<Database.Database> = [];

/** Helper to create a mock D1Database object using better-sqlite3 */
function createMockD1(dbPath = ":memory:"): D1Database {
  const sqlite = new Database(dbPath);
  dbsToClose.push(sqlite);

  const mockD1: Partial<D1Database> = {
    prepare(query: string) {
      const stmt = sqlite.prepare(query);
      return {
        bind(...args: Array<unknown>) {
          return {
            async all() {
              stmt.raw(false);
              const rows = stmt.all(...args);
              return {
                results: rows,
                success: true,
                meta: { duration: 0, size: 0, rows_read: 0, rows_written: 0 },
              };
            },
            async run() {
              const result = stmt.run(...args);
              return {
                success: true,
                meta: {
                  changes: result.changes,
                  duration: 0,
                  size: 0,
                  rows_read: 0,
                  rows_written: 0,
                },
              };
            },
            async first(col?: string) {
              stmt.raw(false);
              const row = stmt.get(...args) as Record<string, unknown> | undefined;
              if (!row) return null;
              if (col) return row[col];
              return row;
            },
            async raw() {
              stmt.raw(false);
              const rows = stmt.all(...args);
              return rows.map((r) => Object.values(r as Record<string, unknown>));
            },
          } as unknown as D1PreparedStatement;
        },
        async all() {
          stmt.raw(false);
          const rows = stmt.all();
          return {
            results: rows,
            success: true,
            meta: { duration: 0, size: 0, rows_read: 0, rows_written: 0 },
          };
        },
        async run() {
          const result = stmt.run();
          return {
            success: true,
            meta: { changes: result.changes, duration: 0, size: 0, rows_read: 0, rows_written: 0 },
          };
        },
        async first(col?: string) {
          stmt.raw(false);
          const row = stmt.get() as Record<string, unknown> | undefined;
          if (!row) return null;
          if (col) return row[col];
          return row;
        },
        async raw() {
          stmt.raw(false);
          const rows = stmt.all();
          return rows.map((r) => Object.values(r as Record<string, unknown>));
        },
      } as unknown as D1PreparedStatement;
    },
    async batch<T = unknown>(statements: Array<D1PreparedStatement>): Promise<Array<D1Result<T>>> {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.all());
      }
      return results as unknown as Array<D1Result<T>>;
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

describe("Database Seeding API", () => {
  interface ErrorResponse {
    success: false;
    error: {
      code: string;
      message: string;
    };
  }

  interface VerifyResponse {
    users: number;
    organizations: number;
    todos: number;
    domains?: number;
    crmContacts?: number;
    crmCompanies?: number;
    crmDeals?: number;
    crmNotes?: number;
    crmTickets?: number;
    crmTasks?: number;
  }

  interface SeedResponse {
    success: true;
    message: string;
  }

  it("fails to seed if migrations have not been applied", async () => {
    // 1. Create a mock database without migrations applied
    const d1 = createMockD1();

    const env = {
      DATABASE: d1,
    };

    const res = await worker.fetch(
      new Request("http://localhost/database/seed", {
        method: "POST",
      }),
      env,
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as ErrorResponse;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("MIGRATIONS_NOT_APPLIED");
    expect(body.error.message).toBe("Migrations not applied");
  });

  it("successfully seeds and verifies the database when migrations are applied", async () => {
    // 1. Setup D1 database with migrations
    const d1 = await setupTestDb();

    const env = {
      DATABASE: d1,
    };

    // 2. Initial verification (should have 0 counts)
    const verifyBeforeRes = await worker.fetch(
      new Request("http://localhost/database/seed/verify", {
        method: "GET",
      }),
      env,
    );
    expect(verifyBeforeRes.status).toBe(200);
    const verifyBeforeBody = (await verifyBeforeRes.json()) as VerifyResponse;
    expect(verifyBeforeBody.users).toBe(0);
    expect(verifyBeforeBody.organizations).toBe(0);
    expect(verifyBeforeBody.todos).toBe(0);

    // 3. Seed database
    const seedRes = await worker.fetch(
      new Request("http://localhost/database/seed", {
        method: "POST",
      }),
      env,
    );
    expect(seedRes.status).toBe(200);
    const seedBody = (await seedRes.json()) as SeedResponse;
    expect(seedBody.success).toBe(true);
    expect(seedBody.message).toBe("Database seeded successfully");

    // 4. Verify counts after seed
    const verifyAfterRes = await worker.fetch(
      new Request("http://localhost/database/seed/verify", {
        method: "GET",
      }),
      env,
    );
    expect(verifyAfterRes.status).toBe(200);
    const verifyAfterBody = (await verifyAfterRes.json()) as VerifyResponse;
    expect(verifyAfterBody.users).toBe(2);
    expect(verifyAfterBody.organizations).toBe(1);
    expect(verifyAfterBody.todos).toBe(1);
    expect(verifyAfterBody.domains).toBe(1);
    expect(verifyAfterBody.crmContacts).toBe(1);
    expect(verifyAfterBody.crmCompanies).toBe(1);
    expect(verifyAfterBody.crmDeals).toBe(1);
    expect(verifyAfterBody.crmNotes).toBe(1);
    expect(verifyAfterBody.crmTickets).toBe(1);
    expect(verifyAfterBody.crmTasks).toBe(1);
  });

  afterAll(() => {
    for (const db of dbsToClose) {
      try {
        db.close();
      } catch (err) {
        console.error("Failed to close sqlite DB:", err);
      }
    }
  });
});
