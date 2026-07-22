# Milestone 3 (R2) Test Design Analysis

This report outlines the design, environment configuration, and test scenarios for integration and unit testing of R2 helper utilities and Hono API endpoints.

---

## 1. Test Location and Architecture

### Proposed Locations

We propose two levels of testing to ensure both helper isolation and API contract conformance:

1. **Helper Unit Tests (`packages/data-ops/src/r2.test.ts`)**:
   - Focus: Verifies that the presigned URL generation logic compiles, parses inputs correctly, applies expiration times, and handles fallback mock URLs when credentials are not configured.
   - Run context: Pure Vitest, mocking S3 client APIs.

2. **Endpoint Integration Tests (`apps/data-service/src/r2.test.ts`)**:
   - Focus: Verifies that Hono endpoints (`POST /r2/presigned-put`, `POST /r2/presigned-get`, `DELETE /r2/delete`, `GET /r2/list`) perform validation, execute correct helper logic, handle missing keys, delete objects gracefully, and return correct HTTP status codes.
   - Run context: Vitest with `worker.fetch` invocation, using a mocked `R2Bucket` binding and intercepting HTTP calls to the generated presigned URLs.

### Package Exports Setup

To make the helpers accessible to `data-service` and test suites:

- Implement `packages/data-ops/src/r2.ts` defining `getPresignedPutUrl` and `getPresignedGetUrl`.
- Export them from `packages/data-ops/src/index.ts`:
  ```typescript
  export { getPresignedPutUrl, getPresignedGetUrl } from "./r2";
  ```
- Expose the R2 module under exports in `packages/data-ops/package.json` if direct importing is preferred:
  ```json
  "./r2": {
    "types": "./src/r2.ts",
    "import": "./src/r2.ts",
    "default": "./src/r2.ts"
  }
  ```

---

## 2. Local Testing Runtime and Environment Configuration

### Test Runner

All local tests run using **Vitest** via the project's custom toolchain CLI:

- Run all tests in `data-service`: `vp test run` (or `vp run --filter data-service test`).
- Run a specific test file: `vp test run src/r2.test.ts`.

### Mock Environment Variables and Credentials

Because presigned URL generation via `@aws-sdk/s3-request-presigner` is a client-side cryptographic operation, **no network calls are made during URL generation**. Thus, we do not need actual Cloudflare connectivity or real credentials to test the code.

The following mock credentials must be supplied in the test environment (either via `vi.stubEnv` or by passing them to the worker `env` binding):

- `CLOUDFLARE_ACCOUNT_ID="mock-account-id"`
- `R2_ACCESS_KEY_ID="mock-access-key-id"`
- `R2_SECRET_ACCESS_KEY="mock-secret-access-key-longer-than-forty-chars"`
- `R2_BUCKET_NAME="mock-bucket-name"`

### Storage Mocking (Offline Verification)

To test the upload and download behaviors without requiring a live S3/R2 server:

1. Bind a `MockR2Bucket` instance to the worker env (e.g. `{ R2_BUCKET: new MockR2Bucket() }`).
2. Spy on the global `fetch` function (`vi.spyOn(globalThis, "fetch")`) to intercept any HTTP `PUT` or `GET` requests made to the generated presigned URLs (which resolve to R2 hostnames like `*.r2.cloudflarestorage.com` or local mock URLs like `mock-r2.local`).
3. Redirect the request bodies directly into the bound `MockR2Bucket` store to verify size, data integrity, and retrieval.

---

## 3. Proposed Test File: `apps/data-service/src/r2.test.ts`

Here is the complete test file implementation that handles helper unit testing, endpoint validation, and mock network file transfer:

```typescript
/* eslint-disable */
import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from "vite-plus/test";
import { getPresignedPutUrl, getPresignedGetUrl } from "data-ops";
import worker from "./index";

/** Complete Mock implementation for Cloudflare R2Bucket */
class MockR2Bucket {
  private store = new Map<string, { value: ArrayBuffer; size: number; uploaded: Date }>();

  async put(key: string, value: any): Promise<any> {
    let bytes: ArrayBuffer;
    if (value === null) {
      bytes = new ArrayBuffer(0);
    } else if (typeof value === "string") {
      bytes = new TextEncoder().encode(value).buffer;
    } else if (value instanceof ArrayBuffer) {
      bytes = value;
    } else if (ArrayBuffer.isView(value)) {
      bytes = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    } else {
      bytes = new ArrayBuffer(0);
    }

    const obj = {
      key,
      size: bytes.byteLength,
      uploaded: new Date(),
    };
    this.store.set(key, { value: bytes, size: bytes.byteLength, uploaded: obj.uploaded });
    return obj;
  }

  async get(key: string): Promise<any | null> {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      key,
      size: item.size,
      uploaded: item.uploaded,
      async arrayBuffer() {
        return item.value;
      },
      async text() {
        return new TextDecoder().decode(item.value);
      },
    };
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<any> {
    const objects = Array.from(this.store.entries()).map(([key, item]) => ({
      key,
      size: item.size,
      uploaded: item.uploaded,
    }));
    return { objects, truncated: false };
  }
}

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
          } as any;
        },
        async exec(query: string) {
          sqlite.exec(query);
          return { count: 0, duration: 0 };
        },
      } as any;
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
  if (fs.existsSync(migrationsDir)) {
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
  }
  return d1;
}

describe("R2 Helper Utilities & Endpoints Integration", () => {
  let db: D1Database;
  let mockBucket: MockR2Bucket;
  let env: any;
  let fetchSpy: any;

  beforeAll(async () => {
    db = await setupTestDb();
  });

  beforeEach(() => {
    mockBucket = new MockR2Bucket();
    env = {
      DATABASE: db,
      R2_BUCKET: mockBucket,
      CLOUDFLARE_ACCOUNT_ID: "mock-account-id",
      R2_ACCESS_KEY_ID: "mock-access-key-id",
      R2_SECRET_ACCESS_KEY: "mock-secret-access-key-longer-than-forty-chars",
      R2_BUCKET_NAME: "mock-bucket",
      BETTER_AUTH_SECRET: "test-secret-value-longer-than-32-chars-long",
      BETTER_AUTH_URL: "http://localhost",
    };

    // Intercept client PUT/GET requests to simulated R2 endpoint
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const urlStr = typeof input === "string" ? input : (input as Request).url;
      const url = new URL(urlStr);

      // Check if it matches Cloudflare R2 structure or local mock URL
      if (url.hostname.includes("r2.cloudflarestorage.com") || url.hostname === "mock-r2.local") {
        const key = url.pathname.split("/").pop() || "";
        const method = init?.method?.toUpperCase() || "GET";

        if (method === "PUT") {
          const body = init?.body;
          await mockBucket.put(key, body);
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (method === "GET") {
          const item = await mockBucket.get(key);
          if (!item) {
            return new Response("Not Found", { status: 404 });
          }
          return new Response(await item.arrayBuffer(), { status: 200 });
        }
      }

      return new Response("Unmocked Network Call", { status: 500 });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ==========================================
  // Part 1: Helper Unit Tests (data-ops)
  // ==========================================
  describe("R2 Helper Functions (Unit)", () => {
    it("should generate a valid presigned PUT URL containing bucket and expiration parameters", async () => {
      const url = await getPresignedPutUrl(mockBucket, "test-file.png", "image/png", 3600, {
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucketName: env.R2_BUCKET_NAME,
      });

      expect(url).toContain("mock-bucket");
      expect(url).toContain("mock-account-id.r2.cloudflarestorage.com");
      expect(url).toContain("X-Amz-Expires=3600");
      expect(url).toContain("X-Amz-Signature=");
    });

    it("should generate a valid presigned GET URL for an existing file", async () => {
      await mockBucket.put("read-file.txt", "content");
      const url = await getPresignedGetUrl(mockBucket, "read-file.txt", 1800, {
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucketName: env.R2_BUCKET_NAME,
      });

      expect(url).toContain("read-file.txt");
      expect(url).toContain("X-Amz-Expires=1800");
    });

    it("should fall back to local mock URLs if credentials are not configured", async () => {
      const url = await getPresignedPutUrl(mockBucket, "local-file.txt", "text/plain", 3600, {
        accountId: "",
        accessKeyId: "",
        secretAccessKey: "",
        bucketName: "",
      });

      expect(url).toBe("https://mock-r2.local/bucket/local-file.txt");
    });
  });

  // ==========================================
  // Part 2: Endpoint Integration Tests (data-service)
  // ==========================================
  describe("Hono R2 API Endpoints", () => {
    it("POST /r2/presigned-put should return 200 with generated URL", async () => {
      const res = await worker.fetch(
        new Request("http://localhost/r2/presigned-put", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "docs/invoice.pdf", contentType: "application/pdf" }),
        }),
        env,
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.url).toContain("invoice.pdf");
    });

    it("POST /r2/presigned-put should reject empty or blank key with 400", async () => {
      const res = await worker.fetch(
        new Request("http://localhost/r2/presigned-put", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "   ", contentType: "text/plain" }),
        }),
        env,
      );

      expect(res.status).toBe(400);
    });

    it("POST /r2/presigned-put should reject non-positive expiration times with 400", async () => {
      const res = await worker.fetch(
        new Request("http://localhost/r2/presigned-put", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "test.txt", contentType: "text/plain", expiresIn: -10 }),
        }),
        env,
      );

      expect(res.status).toBe(400);
    });

    it("POST /r2/presigned-get should return 404 for a non-existent key", async () => {
      const res = await worker.fetch(
        new Request("http://localhost/r2/presigned-get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ghost-file.txt" }),
        }),
        env,
      );

      expect(res.status).toBe(404);
    });

    it("POST /r2/presigned-get should return 200 and URL for an existing key", async () => {
      await mockBucket.put("ghost-file.txt", "spooky");
      const res = await worker.fetch(
        new Request("http://localhost/r2/presigned-get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ghost-file.txt" }),
        }),
        env,
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.url).toContain("ghost-file.txt");
    });

    it("DELETE /r2/delete should execute gracefully with 200 for existing and non-existing keys", async () => {
      // Existing key
      await mockBucket.put("to-be-deleted.txt", "bye");
      const res1 = await worker.fetch(
        new Request("http://localhost/r2/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "to-be-deleted.txt" }),
        }),
        env,
      );
      expect(res1.status).toBe(200);
      expect(await mockBucket.get("to-be-deleted.txt")).toBeNull();

      // Non-existing key
      const res2 = await worker.fetch(
        new Request("http://localhost/r2/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "never-exists.txt" }),
        }),
        env,
      );
      expect(res2.status).toBe(200);
    });

    it("GET /r2/list should return list of objects in the bucket", async () => {
      await mockBucket.put("file1.bin", "data1");
      await mockBucket.put("file2.bin", "data2");

      const res = await worker.fetch(
        new Request("http://localhost/r2/list", { method: "GET" }),
        env,
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.files.length).toBe(2);
      expect(json.files.map((f: any) => f.key)).toContain("file1.bin");
    });
  });

  // ==========================================
  // Part 3: Upload/Download End-to-End Test Loop
  // ==========================================
  describe("R2 Client Presigned File Cycle", () => {
    it("should request upload URL, perform PUT upload, request download URL, and download matching content", async () => {
      const key = "e2e-cycle-test.txt";
      const payload = "Hello Cloudflare R2 Storage!";

      // 1. Get presigned PUT url
      const putRes = await worker.fetch(
        new Request("http://localhost/r2/presigned-put", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, contentType: "text/plain" }),
        }),
        env,
      );
      expect(putRes.status).toBe(200);
      const { url: putUrl } = (await putRes.json()) as any;

      // 2. Perform the PUT file upload directly to the returned URL (fetch is intercepted)
      const uploadRes = await fetch(putUrl, {
        method: "PUT",
        body: payload,
      });
      expect(uploadRes.status).toBe(200);

      // Verify the file was stored in the mock bucket
      const storedItem = await mockBucket.get(key);
      expect(storedItem).not.toBeNull();
      expect(await storedItem.text()).toBe(payload);
      expect(storedItem.size).toBe(payload.length);

      // 3. Get presigned GET url
      const getRes = await worker.fetch(
        new Request("http://localhost/r2/presigned-get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        }),
        env,
      );
      expect(getRes.status).toBe(200);
      const { url: getUrl } = (await getRes.json()) as any;

      // 4. Download content via the GET URL and verify it matches original payload
      const downloadRes = await fetch(getUrl, { method: "GET" });
      expect(downloadRes.status).toBe(200);
      expect(await downloadRes.text()).toBe(payload);
    });

    it("should successfully upload a zero-byte file and retrieve it", async () => {
      const key = "zero-byte-file.txt";

      const putRes = await worker.fetch(
        new Request("http://localhost/r2/presigned-put", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, contentType: "text/plain" }),
        }),
        env,
      );
      const { url: putUrl } = (await putRes.json()) as any;

      // Upload zero bytes
      const uploadRes = await fetch(putUrl, {
        method: "PUT",
        body: new ArrayBuffer(0),
      });
      expect(uploadRes.status).toBe(200);

      const storedItem = await mockBucket.get(key);
      expect(storedItem.size).toBe(0);
      expect(await storedItem.text()).toBe("");
    });
  });
});
```

---

## 4. Verification and Validation Workflow

To execute and verify this design in the repository context:

1. **Format and Lint Checks**:
   Run format and lint tools using the global `vp` tool to ensure styling rules are followed:

   ```bash
   vp check
   ```

2. **Run Tests**:
   Execute the `data-service` Vitest runner synchronously:

   ```bash
   vp run --filter data-service test
   ```

   Or execute directly using Vitest command filter:

   ```bash
   vp test run apps/data-service/src/r2.test.ts
   ```

3. **Verify Build**:
   Ensure `data-ops` builds and exports compilation outputs correctly since `data-service` depends on it:
   ```bash
   pnpm --filter data-ops build
   ```
