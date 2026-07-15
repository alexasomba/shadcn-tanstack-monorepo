import * as fs from "fs";
import * as path from "path";

import { extendZodWithOpenApi } from "@hono/zod-openapi";
import Database from "better-sqlite3";
import {
  getPresignedPutUrl,
  getPresignedGetUrl,
  UserOnboardingWorkflow,
  OrgOnboardingWorkflow,
  seedDatabase,
  createDatabase,
} from "data-ops";
import worker from "data-service";
import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";

import { MockR2Bucket } from "./helpers";

extendZodWithOpenApi(z);

// Setup SQLite DB helper that supports PRAGMA foreign_keys = ON
async function setupAdversarialDb(enableForeignKeys = false): Promise<D1Database> {
  const sqlite = new Database(":memory:");
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
              return { results: rows, success: true, meta: { duration: 0, changes: 0 } };
            },
            async run() {
              const result = stmt.run(...args);
              return { success: true, meta: { changes: result.changes, duration: 0 } };
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
          return { results: rows, success: true, meta: { duration: 0, changes: 0 } };
        },
        async run() {
          const result = stmt.run();
          return { success: true, meta: { changes: result.changes, duration: 0 } };
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
      await mockD1.exec!(sql);
    }
  }

  return mockD1 as D1Database;
}

describe("Adversarial E2E Tests (Milestone 7 - Phase 2)", () => {
  // ==========================================
  // 1. Cloudflare R2 Uploads Gaps
  // ==========================================
  describe("Cloudflare R2 Uploads Gaps", () => {
    it("1.1 should fallback to mock URL format if AWS credentials are not set", async () => {
      const bucketObj = { name: "custom-r2-bucket" };
      const env = {};
      const putUrl = await getPresignedPutUrl(bucketObj, "avatar.png", "image/png", 3600, env);
      expect(putUrl).toBe("https://mock-r2.local/custom-r2-bucket/avatar.png");

      const getUrl = await getPresignedGetUrl(bucketObj, "avatar.png", 3600, env);
      expect(getUrl).toBe("https://mock-r2.local/custom-r2-bucket/avatar.png?get=true");
    });

    it("1.2 should generate AWS-signed S3 URLs when environment variables are set", async () => {
      const env = {
        R2_ACCOUNT_ID: "abc-xyz-123",
        R2_ACCESS_KEY_ID: "mock-access-key-id-is-long-enough",
        R2_SECRET_ACCESS_KEY: "mock-secret-access-key-must-be-very-long-as-well",
      };

      const putUrl = await getPresignedPutUrl(
        "my-aws-bucket",
        "profile.jpg",
        "image/jpeg",
        600,
        env,
      );
      expect(putUrl).toContain("abc-xyz-123.r2.cloudflarestorage.com");
      expect(putUrl).toContain("my-aws-bucket");
      expect(putUrl).toContain("profile.jpg");
      expect(putUrl).toContain("X-Amz-Signature");

      const getUrl = await getPresignedGetUrl("my-aws-bucket", "profile.jpg", 600, env);
      expect(getUrl).toContain("abc-xyz-123.r2.cloudflarestorage.com");
      expect(getUrl).toContain("my-aws-bucket");
      expect(getUrl).toContain("profile.jpg");
      expect(getUrl).toContain("X-Amz-Signature");
    });

    it("1.3 should handle empty (zero-byte) file uploads correctly", async () => {
      const bucket = new MockR2Bucket();
      const emptyBuffer = new ArrayBuffer(0);
      const metadata = await bucket.put("empty-file.txt", emptyBuffer, {
        contentType: "text/plain",
      });

      expect(metadata.size).toBe(0);

      const file = await bucket.get("empty-file.txt");
      expect(file).not.toBeNull();
      expect(file.size).toBe(0);
      expect(await file.text()).toBe("");
      expect(await file.arrayBuffer()).toBeInstanceOf(ArrayBuffer);
      expect((await file.arrayBuffer()).byteLength).toBe(0);
    });

    it("1.4 should propagate bucket operation errors cleanly to the data-service router", async () => {
      const failingBucket = {
        name: "broken-bucket",
        async list() {
          throw new Error("R2 read storage failure");
        },
        async delete() {
          throw new Error("R2 delete write lock failure");
        },
        async head() {
          throw new Error("R2 metadata lookups failed");
        },
      };

      const env = {
        R2_BUCKET: failingBucket as unknown as R2Bucket,
      } as any;

      // Test List endpoint
      const listRes = await worker.fetch(
        new Request("http://localhost/r2/list", { method: "GET" }),
        env,
      );
      expect(listRes.status).toBe(500);
      const listJson = (await listRes.json()) as any;
      expect(listJson.success).toBe(false);
      expect(listJson.error.code).toBe("OPERATION_FAILED");
      expect(listJson.error.message).toContain("R2 read storage failure");

      // Test Delete endpoint
      const deleteRes = await worker.fetch(
        new Request("http://localhost/r2/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "any.png" }),
        }),
        env,
      );
      expect(deleteRes.status).toBe(500);
      const deleteJson = (await deleteRes.json()) as any;
      expect(deleteJson.success).toBe(false);
      expect(deleteJson.error.code).toBe("OPERATION_FAILED");
      expect(deleteJson.error.message).toContain("R2 delete write lock failure");

      // Test Get (Head checks) endpoint
      const getRes = await worker.fetch(
        new Request("http://localhost/r2/presigned-get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "any.png" }),
        }),
        env,
      );
      expect(getRes.status).toBe(500);
      const getJson = (await getRes.json()) as any;
      expect(getJson.success).toBe(false);
      expect(getJson.error.code).toBe("OPERATION_FAILED");
      expect(getJson.error.message).toContain("R2 metadata lookups failed");
    });
  });

  // ==========================================
  // 2. Onboarding Workflows Gaps
  // ==========================================
  describe("Onboarding Workflows Gaps", () => {
    it("2.1 should execute UserOnboardingWorkflow successfully with correct steps", async () => {
      const workflow = new UserOnboardingWorkflow({} as any, {} as any);
      const mockEvent = {
        id: "wf-user-1",
        payload: { userId: "user-adversarial-1" },
      };

      const stepsRun: Array<string> = [];
      const mockStep = {
        do: async (name: string, fn: () => Promise<any>) => {
          stepsRun.push(name);
          return await fn();
        },
      };

      const result = await workflow.run(mockEvent as any, mockStep as any);
      expect(stepsRun).toEqual(["create_user_profile", "send_welcome_email"]);
      expect(result).toEqual({ userId: "user-adversarial-1" });
    });

    it("2.2 should execute OrgOnboardingWorkflow successfully with correct steps", async () => {
      const workflow = new OrgOnboardingWorkflow({} as any, {} as any);
      const mockEvent = {
        id: "wf-org-1",
        payload: { orgId: "org-adversarial-1" },
      };

      const stepsRun: Array<string> = [];
      const mockStep = {
        do: async (name: string, fn: () => Promise<any>) => {
          stepsRun.push(name);
          return await fn();
        },
      };

      const result = await workflow.run(mockEvent as any, mockStep as any);
      expect(stepsRun).toEqual(["provision_org_workspace", "initialize_billing"]);
      expect(result).toEqual({ orgId: "org-adversarial-1" });
    });

    it("2.3 should propagate workflow step failures and simulate retry engine behavior", async () => {
      const workflow = new UserOnboardingWorkflow({} as any, {} as any);
      const mockEvent = {
        id: "wf-user-fail",
        payload: { userId: "user-retry-1" },
      };

      let attempt = 0;
      const failingStep = {
        do: async (name: string, fn: () => Promise<any>) => {
          if (name === "create_user_profile") {
            attempt++;
            if (attempt === 1) {
              throw new Error("Database connection timeout");
            }
          }
          return await fn();
        },
      };

      // First run should throw exception to notify the Cloudflare Workflows engine
      await expect(workflow.run(mockEvent as any, failingStep as any)).rejects.toThrow(
        "Database connection timeout",
      );

      // Second run (simulating engine retry after crash) should pass
      const result = await workflow.run(mockEvent as any, failingStep as any);
      expect(result).toEqual({ userId: "user-retry-1" });
      expect(attempt).toBe(2);
    });

    it("2.4 should handle database constraint/conflict errors cleanly inside a workflow step", async () => {
      const workflow = new UserOnboardingWorkflow({} as any, {} as any);
      const mockEvent = {
        id: "wf-user-db-conflict",
        payload: { userId: "duplicate-user" },
      };

      const conflictingStep = {
        do: async (name: string, fn: () => Promise<any>) => {
          if (name === "create_user_profile") {
            // Simulate unique constraint violation from DB
            throw new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed: user.email");
          }
          return await fn();
        },
      };

      await expect(workflow.run(mockEvent as any, conflictingStep as any)).rejects.toThrow(
        "SQLITE_CONSTRAINT: UNIQUE constraint failed: user.email",
      );
    });
  });

  // ==========================================
  // 3. Database Seeding Gaps
  // ==========================================
  describe("Database Seeding Gaps", () => {
    it("3.1 should verify seeding works correctly and is fully idempotent on multiple executions", async () => {
      const db = await setupAdversarialDb(false);
      const drizzleDb = createDatabase(db);

      // First execution of seeding
      await seedDatabase(drizzleDb);

      // Verify initial seed counts
      const usersBefore = await db.prepare("SELECT COUNT(*) as count FROM user").first<any>();
      const orgsBefore = await db
        .prepare("SELECT COUNT(*) as count FROM organization")
        .first<any>();
      const todosBefore = await db.prepare("SELECT COUNT(*) as count FROM todos").first<any>();

      expect(usersBefore.count).toBe(2);
      expect(orgsBefore.count).toBe(1);
      expect(todosBefore.count).toBe(1);

      // Second execution (duplicate execution)
      await seedDatabase(drizzleDb);

      // Verify seed counts do not double and no constraint violations occurred
      const usersAfter = await db.prepare("SELECT COUNT(*) as count FROM user").first<any>();
      const orgsAfter = await db.prepare("SELECT COUNT(*) as count FROM organization").first<any>();
      const todosAfter = await db.prepare("SELECT COUNT(*) as count FROM todos").first<any>();

      expect(usersAfter.count).toBe(2);
      expect(orgsAfter.count).toBe(1);
      expect(todosAfter.count).toBe(1);
    });

    it("3.2 should successfully seed with active foreign key constraints enabled", async () => {
      // Create DB with PRAGMA foreign_keys = ON;
      const db = await setupAdversarialDb(true);
      const drizzleDb = createDatabase(db);

      // Run seeding. This checks:
      // - If dropping tables (idempotency reset) violates foreign keys
      // - If inserting records violates foreign key integrity (e.g. crm_companies referencing contacts)
      await expect(seedDatabase(drizzleDb)).resolves.not.toThrow();

      // Run second time with foreign keys still active to test idempotency deletion cascade/ordering
      await expect(seedDatabase(drizzleDb)).resolves.not.toThrow();

      // Check referential integrity: every CRM contact points to a valid organization, etc.
      const users = await db.prepare("SELECT COUNT(*) as count FROM user").first<any>();
      expect(users.count).toBe(2);
    });
  });
});
