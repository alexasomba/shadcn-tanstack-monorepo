import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";

/** Helper to create a mock D1Database object using better-sqlite3 */
export function createMockD1(dbPath = ":memory:"): D1Database {
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

  return mockD1 as D1Database;
}

/** Helper to bootstrap test database schemas from SQL migrations */
export async function setupTestDb(): Promise<D1Database> {
  const d1 = createMockD1();

  // Robust path resolving for migrations directory
  let migrationsDir = "";
  const pathsToTry = [
    path.resolve(__dirname, "../../packages/data-ops/src/drizzle/migrations"),
    path.resolve(__dirname, "../../../packages/data-ops/src/drizzle/migrations"),
    path.resolve(process.cwd(), "packages/data-ops/src/drizzle/migrations"),
    path.resolve(process.cwd(), "../packages/data-ops/src/drizzle/migrations"),
  ];

  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      migrationsDir = p;
      break;
    }
  }

  if (!migrationsDir) {
    throw new Error("Could not locate Drizzle migrations directory");
  }

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

/** Mock implementation for Cloudflare R2Bucket */
export class MockR2Bucket {
  private store = new Map<
    string,
    {
      value: ArrayBuffer;
      metadata: any;
      uploaded: Date;
      customMetadata?: any;
      httpMetadata?: any;
    }
  >();

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: any,
  ): Promise<any> {
    let bytes: ArrayBuffer;
    if (value === null) {
      bytes = new ArrayBuffer(0);
    } else if (typeof value === "string") {
      bytes = new TextEncoder().encode(value).buffer as ArrayBuffer;
    } else if (value instanceof ArrayBuffer) {
      bytes = value;
    } else if (ArrayBuffer.isView(value)) {
      bytes = value.buffer.slice(
        value.byteOffset,
        value.byteOffset + value.byteLength,
      ) as ArrayBuffer;
    } else if (value instanceof Blob) {
      bytes = await value.arrayBuffer();
    } else {
      // ReadableStream
      const reader = value.getReader();
      const chunks: Array<Uint8Array> = [];
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        chunks.push(chunk);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }
      bytes = combined.buffer;
    }

    const obj = {
      key,
      version: Math.random().toString(36).substring(2),
      size: bytes.byteLength,
      etag: Math.random().toString(36).substring(2),
      httpEtag: Math.random().toString(36).substring(2),
      uploaded: new Date(),
      httpMetadata: options?.httpMetadata || {},
      customMetadata: options?.customMetadata || {},
    };

    this.store.set(key, {
      value: bytes,
      metadata: obj,
      uploaded: obj.uploaded,
      customMetadata: obj.customMetadata,
      httpMetadata: obj.httpMetadata,
    });

    return obj;
  }

  async get(key: string, _options?: any): Promise<any | null> {
    const item = this.store.get(key);
    if (!item) return null;

    const r2obj = {
      ...item.metadata,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(item.value));
          controller.close();
        },
      }),
      async text() {
        return new TextDecoder().decode(item.value);
      },
      async json() {
        return JSON.parse(new TextDecoder().decode(item.value));
      },
      async arrayBuffer() {
        return item.value;
      },
      async blob() {
        return new Blob([item.value]);
      },
    };

    return r2obj;
  }

  async delete(keys: string | Array<string>): Promise<void> {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keysArray) {
      this.store.delete(key);
    }
  }

  async list(options?: any): Promise<any> {
    let objects = Array.from(this.store.values()).map((item) => item.metadata);
    if (options?.prefix) {
      objects = objects.filter((o) => o.key.startsWith(options.prefix));
    }
    if (options?.limit) {
      objects = objects.slice(0, options.limit);
    }
    return {
      objects,
      truncated: false,
      cursor: undefined,
    };
  }
}

/** Mock Cloudflare Workflow instance execution and status tracking */
export class MockWorkflowInstance {
  id: string;
  params: any;
  statusState: "running" | "complete" | "failed" = "running";
  stepsRun: Array<{ name: string; status: "success" | "failure"; output?: any; error?: any }> = [];

  constructor(id: string, params: any) {
    this.id = id;
    this.params = params;
  }

  async status() {
    return {
      status: this.statusState,
      error: this.statusState === "failed" ? "Mock workflow execution failed" : undefined,
    };
  }
}

/** Mock Cloudflare Workflow definition class */
export class MockWorkflow {
  instances = new Map<string, MockWorkflowInstance>();
  workflowName: string;

  constructor(workflowName: string) {
    this.workflowName = workflowName;
  }

  async create(options?: { id?: string; params?: any }): Promise<MockWorkflowInstance> {
    const id = options?.id || `${this.workflowName}-${Math.random().toString(36).substring(2)}`;
    const instance = new MockWorkflowInstance(id, options?.params);
    this.instances.set(id, instance);

    // Simulate execution steps
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

// Concrete workflow classes requested
export class UserOnboardingWorkflow extends MockWorkflow {
  constructor() {
    super("UserOnboardingWorkflow");
  }
}

export class OrgOnboardingWorkflow extends MockWorkflow {
  constructor() {
    super("OrgOnboardingWorkflow");
  }
}

/** Sentry spy for captured exceptions and messages */
export class SentrySpy {
  static exceptions: Array<{ exception: any; hint?: any }> = [];
  static messages: Array<{ message: string; level?: any; hint?: any }> = [];

  static clear() {
    this.exceptions = [];
    this.messages = [];
  }

  static captureException(exception: any, hint?: any) {
    this.exceptions.push({ exception, hint });
    return "mock-event-id";
  }

  static captureMessage(message: string, level?: any, hint?: any) {
    this.messages.push({ message, level, hint });
    return "mock-event-id";
  }
}

/** Create a Sentry mock transport object that pipes exceptions into SentrySpy */
export function createMockSentryTransport() {
  return {
    send(envelope: any) {
      try {
        const [, items] = envelope;
        for (const item of items) {
          const [itemHeader, itemPayload] = item;
          if (itemHeader.type === "event" && itemPayload.exception) {
            SentrySpy.exceptions.push({ exception: itemPayload.exception });
          }
        }
      } catch {
        // Suppress parser exceptions
      }
      return Promise.resolve({ status: "success" });
    },
    flush() {
      return Promise.resolve(true);
    },
  };
}
