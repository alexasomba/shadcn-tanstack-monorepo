/* eslint-disable */
import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import * as fs from "fs";
import * as path from "path";

import * as Sentry from "@sentry/cloudflare";
import Database from "better-sqlite3";
import { describe, expect, it, vi, beforeEach } from "vite-plus/test";

import worker from "./index";
import type { Bindings } from "./types";

// Mock @sentry/cloudflare's captureException
const { sentrySpy, mockSend } = vi.hoisted(() => ({
  sentrySpy: vi.fn(),
  mockSend: vi.fn().mockRejectedValue(new Error("Simulated notification send failure")),
}));

vi.mock("@sentry/cloudflare", () => ({
  captureException: sentrySpy,
  withSentry: (config: any, workerObj: any) => workerObj,
}));

vi.mock("data-ops", async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    getNotifyClient: () => ({
      testRoute: {
        send: mockSend,
      },
    }),
  };
});

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

describe("Sentry Observability Integration Tests", () => {
  beforeEach(() => {
    sentrySpy.mockClear();
    mockSend.mockClear();
  });

  // 1. Hono router exception capture
  it("captures exceptions for Hono router unhandled errors", async () => {
    const d1 = await setupTestDb();
    const env = {
      DATABASE: d1,
    };

    const res = await worker.fetch(new Request("http://localhost/api/debug/sentry-test"), env);

    expect(res.status).toBe(500);
    const data: any = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INTERNAL_ERROR");

    // Sentry should have been called (at least once by the route, and once by app.onError)
    expect(sentrySpy).toHaveBeenCalled();
    const calls = sentrySpy.mock.calls;
    const errors = calls.map((call: any) => call[0]);
    expect(errors.some((err: any) => err.message === "Sentry test exception")).toBe(true);
  });

  // 2. Workflows exception capture
  it("captures exceptions for workflows with workflowInstanceId tag", async () => {
    const d1 = await setupTestDb();

    // Mock Workflow binding
    const mockWorkflowInstance = {
      statusState: "running",
      stepsRun: [],
      async status() {
        return { status: this.statusState, steps: this.stepsRun };
      },
    };

    const mockWorkflow = {
      async get(id: string) {
        return mockWorkflowInstance;
      },
    };

    const env = {
      DATABASE: d1,
      USER_ONBOARDING_WORKFLOW: mockWorkflow,
    } as unknown as Bindings;

    const res = await worker.fetch(
      new Request("http://localhost/workflows/instances/wf-test-id/crash", {
        method: "POST",
      }),
      env,
    );

    expect(res.status).toBe(500);
    expect(sentrySpy).toHaveBeenCalled();
    const calls = sentrySpy.mock.calls;
    const crashCall = calls.find((call: any) => call[0].message === "Workflow step crashed");
    expect(crashCall).toBeDefined();
    expect(crashCall![1]?.tags?.workflowInstanceId).toBe("wf-test-id");
  });

  // 3. Queue/Outbox jobs exception capture
  it("captures exceptions for queue outbox jobs with jobType and jobId tags", async () => {
    // Create a database mock that throws on query execution to fail outbox draining
    const dbMockWithException = {
      prepare() {
        return {
          bind() {
            return {
              async all() {
                throw new Error("Simulated outbox query failure");
              },
            };
          },
        };
      },
    } as unknown as D1Database;

    const env = {
      DATABASE: dbMockWithException,
    };

    const mockMessage = {
      id: "msg-outbox-123",
      body: { type: "outbox.drain" },
      ack: vi.fn(),
      retry: vi.fn(),
    };

    const batch = {
      messages: [mockMessage],
      queue: "jobs-queue",
    } as unknown as MessageBatch<any>;

    await worker.queue(batch, env);

    // Verify Sentry captured the exception
    expect(sentrySpy).toHaveBeenCalled();
    const calls = sentrySpy.mock.calls;
    const queueCall = calls.find(
      (call: any) => call[0].message === "Simulated outbox query failure",
    );
    expect(queueCall).toBeDefined();
    expect(queueCall![1]?.tags?.jobType).toBe("outbox.drain");
    expect(queueCall![1]?.tags?.jobId).toBe("msg-outbox-123");

    // The message should have been retried
    expect(mockMessage.retry).toHaveBeenCalled();
    expect(mockMessage.ack).not.toHaveBeenCalled();
  });

  // 4. Cron tasks exception capture
  it("captures exceptions for cron tasks with cronTask tag", async () => {
    // Create a database mock that throws on query execution
    const dbMockWithException = {
      prepare() {
        return {
          bind() {
            return {
              async all() {
                throw new Error("Simulated cron query failure");
              },
            };
          },
        };
      },
    } as unknown as D1Database;

    const env = {
      DATABASE: dbMockWithException,
    };

    const event = {
      cron: "*/5 * * * *",
      scheduledTime: Date.now(),
    } as ScheduledEvent;

    const ctx = {
      waitUntil: vi.fn(),
    } as unknown as ExecutionContext;

    // The scheduled handler should rethrow the error
    await expect(worker.scheduled(event, env, ctx)).rejects.toThrow("Simulated cron query failure");

    // Verify Sentry captured the exception
    expect(sentrySpy).toHaveBeenCalled();
    const calls = sentrySpy.mock.calls;
    const cronCall = calls.find((call: any) => call[0].message === "Simulated cron query failure");
    expect(cronCall).toBeDefined();
    expect(cronCall![1]?.tags?.cronTask).toBe("outbox.drain");
  });

  // 5. Tier 1 / Tier 2 Deduplication Test
  it("captures outbox processing exception via Tier 1 and prevents duplicate Tier 2 capture", async () => {
    const d1 = await setupTestDb();

    // Seed a pending outbox notification event
    await d1
      .prepare(
        "INSERT INTO outbox_events (type, payload, created_at, processed_at) VALUES (?, ?, ?, ?)",
      )
      .bind(
        "notification",
        JSON.stringify({
          route: "testRoute",
          to: "user@example.com",
          input: { name: "Test User" },
        }),
        Date.now(),
        null,
      )
      .run();

    const env = {
      DATABASE: d1,
    };

    const mockMessage = {
      id: "msg-outbox-dedup",
      body: { type: "outbox.drain" },
      ack: vi.fn(),
      retry: vi.fn(),
    };

    const batch = {
      messages: [mockMessage],
      queue: "jobs-queue",
    } as unknown as MessageBatch<any>;

    await worker.queue(batch, env);

    // Verify Sentry was called exactly once
    expect(sentrySpy).toHaveBeenCalledTimes(1);

    const call = sentrySpy.mock.calls[0];
    expect(call[0].message).toBe("Simulated notification send failure");
    expect(call[1]?.tags?.jobType).toBe("outbox.drain");
    expect(call[1]?.tags?.eventType).toBe("notification");
    expect(call[1]?.tags?.eventId).toBeDefined();
    expect(call[1]?.extra?.eventPayload).toContain("testRoute");

    // Outer queue capture should NOT have been called, so jobId msg-outbox-dedup is NOT in tags
    expect(call[1]?.tags?.jobId).toBeUndefined();

    // The message should have been retried
    expect(mockMessage.retry).toHaveBeenCalled();
    expect(mockMessage.ack).not.toHaveBeenCalled();
  });

  // 6. Cron path Tier 1 / Tier 2 Deduplication Test for Database error
  it("prevents duplicate Sentry captures in cron task when outbox drain throws a database error", async () => {
    const d1 = await setupTestDb();

    // Seed a pending outbox notification event
    await d1
      .prepare(
        "INSERT INTO outbox_events (type, payload, created_at, processed_at) VALUES (?, ?, ?, ?)",
      )
      .bind(
        "notification",
        JSON.stringify({
          route: "testRoute",
          to: "user@example.com",
          input: { name: "Test User" },
        }),
        Date.now(),
        null,
      )
      .run();

    const env = {
      DATABASE: d1,
    };

    // Temporarily mock the send function to throw a database error
    mockSend.mockRejectedValueOnce(new Error("Database deadlock error during notification send"));

    const event = {
      cron: "*/5 * * * *",
      scheduledTime: Date.now(),
    } as ScheduledEvent;

    const ctx = {
      waitUntil: vi.fn(),
    } as unknown as ExecutionContext;

    // The scheduled handler should rethrow the error
    await expect(worker.scheduled(event, env, ctx)).rejects.toThrow(
      "Database deadlock error during notification send",
    );

    // Verify Sentry was called exactly once (Tier 1 inside drainOutbox, not Tier 2 in cronTask)
    expect(sentrySpy).toHaveBeenCalledTimes(1);

    const call = sentrySpy.mock.calls[0];
    expect(call[0].message).toBe("Database deadlock error during notification send");
    expect(call[1]?.tags?.eventType).toBe("notification");
    expect(call[1]?.tags?.jobType).toBe("outbox.drain");

    // The cron task name should not be present in the captured exception tags since it was handled at Tier 1
    expect(call[1]?.tags?.cronTask).toBeUndefined();
  });
});
