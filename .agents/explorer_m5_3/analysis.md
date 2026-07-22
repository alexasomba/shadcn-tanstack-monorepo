# Database Seeding Integration Test Design Analysis

This report outlines the design, rationale, and implementation for the database seeding integration tests (`apps/data-service/src/seed.test.ts`) under **Milestone 5 (R4)**.

---

## 1. Summary of Findings

- **Existing Test Setup**: Tests in `apps/data-service` (like `domains.test.ts` and `api-key.test.ts`) utilize `better-sqlite3` to instantiate an in-memory SQL database mapping to Cloudflare's `D1Database` binding. All test files run via the Vite+ unified toolchain command `vp test run` (wrapping Vitest).
- **Schema & Migrations**: SQL migrations are located under `packages/data-ops/src/drizzle/migrations/`. In-memory D1 test environments bootstrap their schema by reading and executing these `.sql` files sequentially.
- **Integration Scope**: The integration tests verify the Hono endpoints `/database/seed` (POST) and `/database/seed/verify` (GET), verifying seed counts, idempotency, foreign key constraint enforcement, and error handling for missing migrations.

---

## 2. Test Suite Design

The integration test suite in `apps/data-service/src/seed.test.ts` covers the following key scenarios:

### A. Initial Seeding Success & Counts Verification

- **Process**:
  1. Bootstraps a clean in-memory SQLite database and applies all migrations.
  2. Issues `GET /database/seed/verify` to ensure initial counts are `0` for users, organizations, and todos.
  3. Issues `POST /database/seed` to execute database seeding.
  4. Issues `GET /database/seed/verify` again.
- **Expected Outcome**:
  - POST returns `200 OK` with `{ success: true }`.
  - GET returns `{ success: true, counts: { users: 2, organizations: 1, todos: 1 } }`.

### B. Idempotency Checking

- **Process**:
  1. Calls `POST /database/seed` to perform the initial seed.
  2. Calls `POST /database/seed` a second time.
  3. Queries `GET /database/seed/verify`.
- **Expected Outcome**:
  - The second POST succeeds without unique constraint or reference conflicts.
  - The verify endpoint returns the exact same counts `{ users: 2, organizations: 1, todos: 1 }`, ensuring that executing the seed twice is safe and does not duplicate or stack data.

### C. Missing Migrations Error Handling

- **Process**:
  1. Instantiates a mock SQLite D1 database connection _without_ executing any schema migrations.
  2. Requests `POST /database/seed` and `GET /database/seed/verify`.
- **Expected Outcome**:
  - The endpoints capture the database error (e.g., `no such table: user`) and return a `500 Internal Server Error`.
  - Response body aligns with the Open API `ErrorSchema` format: `{ success: false, error: { code: "INTERNAL_ERROR", message: "Migrations not applied" } }`.

### D. Foreign Key Constraint Validation

- **Process**:
  1. Configures the test database to enforce foreign key constraints by executing `PRAGMA foreign_keys = ON;`.
  2. Verifies that constraint validation is active by attempting an invalid write (e.g., inserting a row in the `member` table referencing non-existent parent records). Expects a `FOREIGN KEY constraint failed` error.
  3. Runs `POST /database/seed` with foreign keys enabled.
- **Expected Outcome**:
  - The orphaned insertion is rejected with a SQLite constraint error, confirming that foreign keys are enforced by the database.
  - The seeding endpoint succeeds without triggering any foreign key violations, proving that the seeding script inserts tables in correct dependency order (parents before children) and preserves schema integrity.

---

## 3. Proposed Integration Test File

The proposed implementation is saved as `.agents/explorer_m5_3/proposed_seed.test.ts`. Below is the complete content of this file:

```typescript
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
```

---

## 4. Verification Methods

1. **Test Execution**: Once routes and endpoints are implemented in `apps/data-service`, this file can be renamed or written directly to `apps/data-service/src/seed.test.ts`.
2. Run the tests from the root or inside the directory:
   ```bash
   pnpm --filter data-service test
   ```
   Or via the Vite+ CLI:
   ```bash
   vp test run
   ```
3. Ensure all tests in `data-service` (including `seed.test.ts`) pass cleanly.
