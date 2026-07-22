import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";
import { describe, expect, it, vi, beforeAll, beforeEach } from "vite-plus/test";

import worker from "./index";

// Array to store Sentry exception captures for assertion
const sentryExceptions: Array<{ exception: any; hint?: any }> = [];

// 1. Mock Sentry Cloudflare SDK to capture and assert on exceptions
vi.mock("@sentry/cloudflare", () => {
  return {
    init: vi.fn(),
    captureException: vi.fn().mockImplementation((exception: any, hint: any) => {
      sentryExceptions.push({ exception, hint });
      return "mock-event-id-123";
    }),
  };
});

// 2. Mock the Auth module to bypass API key checking and provide a valid API key reference
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
          getSession: vi.fn().mockResolvedValue(null),
          verifyApiKey: vi.fn().mockImplementation(async ({ body }) => {
            if (body && body.key === "test-api-key") {
              return {
                key: {
                  id: "key-123",
                  referenceId: "org-123",
                  prefix: "test",
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

// 3. Mock Workflow instance representation
class MockWorkflowInstance {
  id: string;
  params: any;
  statusState: "queued" | "running" | "paused" | "errored" | "terminated" | "complete" = "running";
  stepsRun: Array<{ name: string; status: "success" | "failure"; output?: any; error?: any }> = [];

  constructor(id: string, params: any) {
    this.id = id;
    this.params = params;
  }

  async status() {
    return {
      status: this.statusState,
      error: this.statusState === "errored" ? "Workflow execution failed" : undefined,
    };
  }
}

// 4. Mock Cloudflare Workflow binding class
class MockWorkflow {
  instances = new Map<string, MockWorkflowInstance>();
  workflowName: string;

  constructor(workflowName: string) {
    this.workflowName = workflowName;
  }

  async create(options?: { id?: string; params?: any }): Promise<MockWorkflowInstance> {
    const id = options?.id || `${this.workflowName}-${Math.random().toString(36).substring(2)}`;
    const instance = new MockWorkflowInstance(id, options?.params);
    this.instances.set(id, instance);

    // Simulate normal step-by-step onboarding execution
    instance.statusState = "complete";
    instance.stepsRun.push({ name: "workflow_started", status: "success" });

    if (this.workflowName === "UserOnboardingWorkflow") {
      instance.stepsRun.push({
        name: "create_user_profile",
        status: "success",
        output: { userId: options?.params?.userId },
      });
      instance.stepsRun.push({ name: "send_welcome_email", status: "success" });
    } else if (this.workflowName === "OrgOnboardingWorkflow") {
      instance.stepsRun.push({
        name: "provision_org_workspace",
        status: "success",
        output: { orgId: options?.params?.orgId },
      });
      instance.stepsRun.push({ name: "initialize_billing", status: "success" });
    }

    instance.stepsRun.push({ name: "workflow_completed", status: "success" });
    return instance;
  }

  async get(id: string): Promise<MockWorkflowInstance | null> {
    return this.instances.get(id) || null;
  }
}

// 5. Mock database helpers
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

async function setupTestDb(): Promise<D1Database> {
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

describe("Workflows Integration Endpoints", () => {
  let db: D1Database;
  let env: any;
  const testHeaders = new Headers({
    "Content-Type": "application/json",
    Authorization: "Bearer test-api-key",
  });

  beforeAll(async () => {
    db = await setupTestDb();
  });

  beforeEach(() => {
    // Clear Sentry exception captures before each test
    sentryExceptions.length = 0;

    // Reset workflow bindings
    env = {
      DATABASE: db,
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
      USER_ONBOARDING_WORKFLOW: new MockWorkflow("UserOnboardingWorkflow"),
      ORG_ONBOARDING_WORKFLOW: new MockWorkflow("OrgOnboardingWorkflow"),
    };
  });

  describe("Trigger Endpoints", () => {
    it("should trigger UserOnboardingWorkflow successfully", async () => {
      const res = await worker.fetch(
        new Request("http://localhost/workflows/trigger/user-signup", {
          method: "POST",
          headers: testHeaders,
          body: JSON.stringify({ userId: "user-123" }),
        }),
        env,
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.instanceId).toBeDefined();

      // Check instance was registered in mock binding
      const instance = await env.USER_ONBOARDING_WORKFLOW.get(json.instanceId);
      expect(instance).toBeDefined();
      expect(instance.params.userId).toBe("user-123");
    });

    it("should trigger OrgOnboardingWorkflow successfully", async () => {
      const res = await worker.fetch(
        new Request("http://localhost/workflows/trigger/org-creation", {
          method: "POST",
          headers: testHeaders,
          body: JSON.stringify({ orgId: "org-123" }),
        }),
        env,
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.instanceId).toBeDefined();

      const instance = await env.ORG_ONBOARDING_WORKFLOW.get(json.instanceId);
      expect(instance).toBeDefined();
      expect(instance.params.orgId).toBe("org-123");
    });
  });

  describe("Status Checks and Steps Verification", () => {
    it("should retrieve workflow instance status and steps", async () => {
      // 1. Trigger UserOnboardingWorkflow
      const triggerRes = await worker.fetch(
        new Request("http://localhost/workflows/trigger/user-signup", {
          method: "POST",
          headers: testHeaders,
          body: JSON.stringify({ userId: "user-456" }),
        }),
        env,
      );
      const triggerJson = (await triggerRes.json()) as any;
      const instanceId = triggerJson.instanceId;

      // 2. Fetch status
      const statusRes = await worker.fetch(
        new Request(`http://localhost/workflows/instances/${instanceId}/status`, {
          method: "GET",
          headers: testHeaders,
        }),
        env,
      );
      expect(statusRes.status).toBe(200);
      const statusJson = (await statusRes.json()) as any;
      expect(statusJson.success).toBe(true);
      expect(statusJson.status).toBe("complete");

      // 3. Fetch steps history
      const stepsRes = await worker.fetch(
        new Request(`http://localhost/workflows/instances/${instanceId}/steps`, {
          method: "GET",
          headers: testHeaders,
        }),
        env,
      );
      expect(stepsRes.status).toBe(200);
      const stepsJson = (await stepsRes.json()) as any;
      expect(stepsJson.success).toBe(true);
      expect(stepsJson.stepsRun).toEqual([
        { name: "workflow_started", status: "success" },
        { name: "create_user_profile", status: "success", output: { userId: "user-456" } },
        { name: "send_welcome_email", status: "success" },
        { name: "workflow_completed", status: "success" },
      ]);
    });
  });

  describe("Retry Verification", () => {
    it("should simulate retrying a workflow instance successfully", async () => {
      // 1. Trigger UserOnboardingWorkflow
      const triggerRes = await worker.fetch(
        new Request("http://localhost/workflows/trigger/user-signup", {
          method: "POST",
          headers: testHeaders,
          body: JSON.stringify({ userId: "user-789" }),
        }),
        env,
      );
      const triggerJson = (await triggerRes.json()) as any;
      const instanceId = triggerJson.instanceId;

      // 2. Manually set state to failed on mock instance
      const instance = await env.USER_ONBOARDING_WORKFLOW.get(instanceId);
      instance.statusState = "failed";

      // 3. Trigger retry via Hono endpoint
      const retryRes = await worker.fetch(
        new Request(`http://localhost/workflows/instances/${instanceId}/retry`, {
          method: "POST",
          headers: testHeaders,
        }),
        env,
      );
      expect(retryRes.status).toBe(200);
      const retryJson = (await retryRes.json()) as any;
      expect(retryJson.success).toBe(true);

      // 4. Verify instance status has updated to complete and has the retry step in steps list
      expect(instance.statusState).toBe("complete");
      expect(instance.stepsRun.some((step: any) => step.name === "retry_success")).toBe(true);
    });
  });

  describe("Crash Simulation and Sentry Verification", () => {
    it("should capture and report to Sentry when workflow execution crashes", async () => {
      // 1. Trigger UserOnboardingWorkflow
      const triggerRes = await worker.fetch(
        new Request("http://localhost/workflows/trigger/user-signup", {
          method: "POST",
          headers: testHeaders,
          body: JSON.stringify({ userId: "user-crash-test" }),
        }),
        env,
      );
      const triggerJson = (await triggerRes.json()) as any;
      const instanceId = triggerJson.instanceId;

      // 2. Trigger crash simulation via Hono endpoint
      const crashRes = await worker.fetch(
        new Request(`http://localhost/workflows/instances/${instanceId}/crash`, {
          method: "POST",
          headers: testHeaders,
        }),
        env,
      );
      expect(crashRes.status).toBe(200);
      const crashJson = (await crashRes.json()) as any;
      expect(crashJson.success).toBe(true);

      // 3. Verify mock instance state is failed
      const instance = await env.USER_ONBOARDING_WORKFLOW.get(instanceId);
      expect(instance.statusState).toBe("failed");

      // 4. Verify exception was captured in Sentry with correct metadata/context
      expect(sentryExceptions.length).toBe(1);
      expect(sentryExceptions[0].exception.message).toContain(
        `Workflow instance ${instanceId} crashed`,
      );
      expect(sentryExceptions[0].hint.tags.workflowInstanceId).toBe(instanceId);
    });
  });
});
