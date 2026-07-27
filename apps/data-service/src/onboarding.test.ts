/**
 * M15: free-plan provisioning + profile defaults (data-ops helpers).
 */
import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";
import {
  applyUserProfileDefaults,
  createDatabase,
  ensureFreeSubscription,
  ensureOrgFreePlanMetadata,
} from "data-ops";
import { afterAll, describe, expect, it } from "vite-plus/test";

const dbsToClose: Array<Database.Database> = [];

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

afterAll(() => {
  for (const db of dbsToClose) {
    db.close();
  }
});

describe("M15 onboarding helpers", () => {
  it("ensureFreeSubscription is idempotent and creates local free plan", async () => {
    const d1 = await setupTestDb();
    const db = createDatabase(d1);

    const first = await ensureFreeSubscription(db, "user-ref-1");
    expect(first.created).toBe(true);
    expect(first.plan).toBe("free");
    expect(first.status).toBe("active");
    expect(first.subscriptionId.length).toBeGreaterThan(0);

    const second = await ensureFreeSubscription(db, "user-ref-1");
    expect(second.created).toBe(false);
    expect(second.subscriptionId).toBe(first.subscriptionId);
  });

  it("applyUserProfileDefaults sets displayUsername from email", async () => {
    const d1 = await setupTestDb();
    const db = createDatabase(d1);
    const now = Date.now();

    await d1
      .prepare(
        `INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind("u-profile-1", "Alex", "alex.kit@example.com", 1, now, now)
      .run();

    const result = await applyUserProfileDefaults(db, "u-profile-1");
    expect(result.updated).toBe(true);
    expect(result.displayUsername).toBe("alex.kit");
  });

  it("ensureOrgFreePlanMetadata tags plan=free when missing", async () => {
    const d1 = await setupTestDb();
    const db = createDatabase(d1);
    const now = Date.now();

    await d1
      .prepare(
        `INSERT INTO organization (id, name, slug, created_at, metadata)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind("org-meta-1", "Acme", "acme-meta", now, null)
      .run();

    const first = await ensureOrgFreePlanMetadata(db, "org-meta-1");
    expect(first.updated).toBe(true);

    const second = await ensureOrgFreePlanMetadata(db, "org-meta-1");
    expect(second.updated).toBe(false);
  });
});
