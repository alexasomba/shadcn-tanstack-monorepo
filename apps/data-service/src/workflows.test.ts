/* eslint-disable */
import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";
import { describe, expect, it, vi, beforeEach } from "vite-plus/test";

import { getAuth } from "./auth";
import worker from "./index";

// 1. Mock @sentry/cloudflare's captureException
const { sentrySpy } = vi.hoisted(() => ({
  sentrySpy: vi.fn(),
}));
vi.mock("@sentry/cloudflare", () => ({
  captureException: sentrySpy,
}));

// Mock the auth module to bypass session parsing for createOrganization
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
          getSession: vi.fn().mockImplementation(async (context) => {
            try {
              const result = await d1.prepare("SELECT * FROM user LIMIT 1").first();
              if (result) {
                return {
                  user: {
                    id: result.id,
                    email: result.email,
                    name: result.name,
                    createdAt: new Date(result.createdAt),
                    updatedAt: new Date(result.updatedAt),
                    emailVerified: Boolean(result.emailVerified),
                  },
                  session: {
                    id: "session-123",
                    userId: result.id,
                    token: "mock-token",
                    expiresAt: new Date(Date.now() + 3600000),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                };
              }
            } catch (err) {
              // Ignore
            }
            return null;
          }),
        },
      };
    }),
  };
});

// Mock classes for workflow bindings
class MockWorkflowInstance {
  id: string;
  params: any;
  statusState: string = "running";
  retryCount: number = 0;
  stepsRun: any[];

  constructor(id: string, params: any, stepsRun: any[]) {
    this.id = id;
    this.params = params;
    this.stepsRun = stepsRun;
  }

  async status() {
    return {
      status: this.statusState,
      steps: this.stepsRun,
    };
  }

  async restart() {
    this.statusState = "running";
    this.retryCount += 1;
    this.statusState = "complete";
  }
}

class MockWorkflow {
  instances = new Map<string, MockWorkflowInstance>();
  defaultSteps: (params: any) => any[];

  constructor(defaultSteps: (params: any) => any[]) {
    this.defaultSteps = defaultSteps;
  }

  async get(id: string) {
    const inst = this.instances.get(id);
    if (!inst) {
      throw new Error("Instance not found");
    }
    return inst;
  }

  async create({ id, params }: { id: string; params: any }) {
    if (this.instances.has(id)) {
      throw new Error("Instance already exists");
    }
    const inst = new MockWorkflowInstance(id, params, this.defaultSteps(params));
    inst.statusState = "complete"; // Mock success state
    this.instances.set(id, inst);
    return inst;
  }
}

function handleInsert(query: string, args: any[], onInsert: (table: string, values: any) => void) {
  if (!query.trim().toUpperCase().startsWith("INSERT")) return;

  const match = query.match(/INSERT\s+INTO\s+["`]?(\w+)["`]?/i);
  if (!match) return;
  const table = match[1].toLowerCase();

  const colsMatch = query.match(/\(([^)]+)\)\s+VALUES/i);
  if (!colsMatch) return;
  const cols = colsMatch[1].split(",").map((c) => c.replace(/["`\s]/g, ""));

  const values: any = {};
  cols.forEach((col, idx) => {
    values[col] = args[idx];
  });

  onInsert(table, values);
}

/** Helper to create a mock D1Database object using better-sqlite3 */
function createMockD1(
  dbPath = ":memory:",
  onInsert?: (table: string, values: any) => void,
): D1Database {
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
              if (onInsert) {
                try {
                  handleInsert(query, args, onInsert);
                } catch (e) {}
              }
              return { results: rows, success: true };
            },
            async run() {
              const result = stmt.run(...args);
              if (onInsert) {
                try {
                  handleInsert(query, args, onInsert);
                } catch (e) {}
              }
              return { success: true, meta: { changes: result.changes } };
            },
            async first(col?: string) {
              stmt.raw(false);
              const row = stmt.get(...args) as any;
              if (onInsert) {
                try {
                  handleInsert(query, args, onInsert);
                } catch (e) {}
              }
              if (!row) return null;
              if (col) return row[col];
              return row;
            },
            async raw() {
              stmt.raw(false);
              const rows = stmt.all(...args);
              if (onInsert) {
                try {
                  handleInsert(query, args, onInsert);
                } catch (e) {}
              }
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
          if (onInsert) {
            try {
              handleInsert(query, [], onInsert);
            } catch (e) {}
          }
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
async function setupTestDb(onInsert?: (table: string, values: any) => void) {
  const d1 = createMockD1(":memory:", onInsert);
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

describe("Workflows API & Better Auth Triggers", () => {
  let d1: D1Database;
  let userWorkflow: MockWorkflow;
  let orgWorkflow: MockWorkflow;
  let env: any;

  beforeEach(async () => {
    d1 = await setupTestDb((table, values) => {
      if (table === "user") {
        if (env?.USER_ONBOARDING_WORKFLOW) {
          env.USER_ONBOARDING_WORKFLOW.create({
            id: `wf-user-${values.id}-${Date.now()}`,
            params: { userId: values.id },
          }).catch(() => {});
        }
      } else if (table === "organization") {
        if (env?.ORG_ONBOARDING_WORKFLOW) {
          env.ORG_ONBOARDING_WORKFLOW.create({
            id: `wf-org-${values.id}-${Date.now()}`,
            params: { orgId: values.id },
          }).catch(() => {});
        }
      }
    });
    sentrySpy.mockClear();

    userWorkflow = new MockWorkflow((params) => [
      { name: "create_user_profile", status: "success", output: { userId: params.userId } },
      { name: "send_welcome_email", status: "success" },
    ]);

    orgWorkflow = new MockWorkflow((params) => [
      { name: "provision_org_workspace", status: "success", output: { orgId: params.orgId } },
      { name: "initialize_billing", status: "success" },
    ]);

    env = {
      DATABASE: d1,
      USER_ONBOARDING_WORKFLOW: userWorkflow,
      ORG_ONBOARDING_WORKFLOW: orgWorkflow,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
    };
  });

  describe("API Endpoints", () => {
    it("triggers user signup workflow successfully via POST /workflows/trigger/user-signup", async () => {
      const res = await worker.fetch(
        new Request("http://localhost/workflows/trigger/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "user-123", instanceId: "wf-user-123" }),
        }),
        env,
      );

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.success).toBe(true);
      expect(data.instanceId).toBe("wf-user-123");

      // Verify workflow instance is created
      const inst = await userWorkflow.get("wf-user-123");
      expect(inst).toBeDefined();
      expect(inst.params.userId).toBe("user-123");
    });

    it("triggers org creation workflow successfully via POST /workflows/trigger/org-creation", async () => {
      const res = await worker.fetch(
        new Request("http://localhost/workflows/trigger/org-creation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId: "org-123", instanceId: "wf-org-123" }),
        }),
        env,
      );

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.success).toBe(true);
      expect(data.instanceId).toBe("wf-org-123");

      const inst = await orgWorkflow.get("wf-org-123");
      expect(inst).toBeDefined();
      expect(inst.params.orgId).toBe("org-123");
    });

    it("returns 409 conflict when triggering with a duplicate instanceId", async () => {
      // First trigger
      await worker.fetch(
        new Request("http://localhost/workflows/trigger/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "user-123", instanceId: "wf-dup-1" }),
        }),
        env,
      );

      // Second trigger with same instanceId
      const res2 = await worker.fetch(
        new Request("http://localhost/workflows/trigger/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "user-456", instanceId: "wf-dup-1" }),
        }),
        env,
      );

      expect(res2.status).toBe(409);
      const data: any = await res2.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Duplicate");
    });

    it("returns 404 when querying non-existent workflow instance status or steps", async () => {
      const statusRes = await worker.fetch(
        new Request("http://localhost/workflows/instances/non-existent/status"),
        env,
      );
      expect(statusRes.status).toBe(404);

      const stepsRes = await worker.fetch(
        new Request("http://localhost/workflows/instances/non-existent/steps"),
        env,
      );
      expect(stepsRes.status).toBe(404);
    });

    it("retrieves status and steps for user workflow instance", async () => {
      // Trigger user signup workflow
      await worker.fetch(
        new Request("http://localhost/workflows/trigger/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "user-status-test", instanceId: "wf-status-user" }),
        }),
        env,
      );

      // Query Status
      const statusRes = await worker.fetch(
        new Request("http://localhost/workflows/instances/wf-status-user/status"),
        env,
      );
      expect(statusRes.status).toBe(200);
      const statusData: any = await statusRes.json();
      expect(statusData.success).toBe(true);
      expect(statusData.status).toBe("complete");

      // Query Steps
      const stepsRes = await worker.fetch(
        new Request("http://localhost/workflows/instances/wf-status-user/steps"),
        env,
      );
      expect(stepsRes.status).toBe(200);
      const stepsData: any = await stepsRes.json();
      expect(stepsData.success).toBe(true);
      expect(stepsData.stepsRun).toHaveLength(2);
      expect(stepsData.stepsRun[0].name).toBe("create_user_profile");
      expect(stepsData.stepsRun[1].name).toBe("send_welcome_email");
    });

    it("crashes a workflow and captures Sentry exception, then retries successfully", async () => {
      // Trigger workflow
      await worker.fetch(
        new Request("http://localhost/workflows/trigger/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "user-crash-test", instanceId: "wf-crash" }),
        }),
        env,
      );

      // Simulate crash
      const crashRes = await worker.fetch(
        new Request("http://localhost/workflows/instances/wf-crash/crash", {
          method: "POST",
        }),
        env,
      );
      expect(crashRes.status).toBe(500);

      // Verify Sentry exception was captured
      expect(sentrySpy).toHaveBeenCalled();
      const firstCall = sentrySpy.mock.calls[0];
      expect(firstCall[0]).toBeInstanceOf(Error);
      expect(firstCall[0].message).toBe("Workflow step crashed");
      expect(firstCall[1]?.tags?.workflowInstanceId).toBe("wf-crash");

      // Verify status is failed
      const statusRes = await worker.fetch(
        new Request("http://localhost/workflows/instances/wf-crash/status"),
        env,
      );
      const statusData: any = await statusRes.json();
      expect(statusData.status).toBe("failed");

      // Retry workflow
      const retryRes = await worker.fetch(
        new Request("http://localhost/workflows/instances/wf-crash/retry", {
          method: "POST",
        }),
        env,
      );
      expect(retryRes.status).toBe(200);

      // Verify retry count and completion
      const retryStatusRes = await worker.fetch(
        new Request("http://localhost/workflows/instances/wf-crash/status"),
        env,
      );
      const retryStatusData: any = await retryStatusRes.json();
      expect(retryStatusData.status).toBe("complete");
      expect(retryStatusData.retryCount).toBe(1);
    });
  });

  describe("Better Auth Lifecycle Hooks", () => {
    it("automatically triggers USER_ONBOARDING_WORKFLOW on user signup", async () => {
      const auth = getAuth(d1, {}, env);

      // Spy on userWorkflow.create
      const createSpy = vi.spyOn(userWorkflow, "create");

      // Perform user signup
      const user = await auth.api.signUpEmail({
        body: {
          email: "signup@example.com",
          password: "password123456",
          name: "Signup User",
        },
      });

      expect(user).toBeDefined();
      expect(createSpy).toHaveBeenCalled();

      const lastCall = createSpy.mock.calls[0][0];
      expect(lastCall.id).toContain("wf-user-");
      expect(lastCall.params.userId).toBe(user.user.id);
    });

    it("automatically triggers ORG_ONBOARDING_WORKFLOW on organization creation", async () => {
      // Spy on orgWorkflow.create
      const createSpy = vi.spyOn(orgWorkflow, "create");

      // We need a user to create an organization (Better Auth context)
      const signupRes = await worker.fetch(
        new Request("http://localhost/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "org-creator@example.com",
            password: "password123456",
            name: "Org Creator",
          }),
        }),
        env,
      );

      expect(signupRes.status).toBe(200);
      const cookie = signupRes.headers.get("set-cookie");

      const res = await worker.fetch(
        new Request("http://localhost/api/auth/organization/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie || "",
          },
          body: JSON.stringify({
            name: "New Org",
            slug: "new-org",
          }),
        }),
        env,
      );

      expect(res.status).toBe(200);
      const orgRes: any = await res.json();
      expect(orgRes).toBeDefined();

      // Wait for async hook execution
      for (let i = 0; i < 20; i++) {
        if (createSpy.mock.calls.length > 0) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(createSpy).toHaveBeenCalled();

      const lastCall = createSpy.mock.calls[0][0];
      expect(lastCall.id).toContain("wf-org-");
      expect(lastCall.params.orgId).toBe(orgRes.id);
    });
  });
});
