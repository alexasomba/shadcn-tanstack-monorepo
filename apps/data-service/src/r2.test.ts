import { describe, expect, it } from "vite-plus/test";

import worker from "./index";
import type { Bindings } from "./types";

class MockR2Bucket {
  store = new Map<
    string,
    { value: Uint8Array; metadata: { key: string; size: number; uploaded: Date } }
  >();

  async put(key: string, value: unknown): Promise<Record<string, unknown>> {
    let bytes: Uint8Array;
    if (typeof value === "string") {
      bytes = new TextEncoder().encode(value);
    } else if (
      value &&
      typeof value === "object" &&
      "constructor" in value &&
      (value as Record<string, unknown>).constructor.name === "ArrayBuffer"
    ) {
      bytes = new Uint8Array(value as ArrayBuffer);
    } else if (ArrayBuffer.isView(value)) {
      bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    } else {
      bytes = new TextEncoder().encode(String(value));
    }
    const metadata = {
      key,
      size: bytes.byteLength,
      uploaded: new Date(),
    };
    this.store.set(key, { value: bytes, metadata });
    return metadata;
  }

  async head(key: string): Promise<Record<string, unknown> | null> {
    const item = this.store.get(key);
    if (!item) return null;
    return item.metadata;
  }

  async get(key: string): Promise<Record<string, unknown> | null> {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      async text() {
        return new TextDecoder().decode(item.value);
      },
      async arrayBuffer() {
        return item.value.buffer;
      },
    };
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<{ objects: Array<Record<string, unknown>> }> {
    return {
      objects: Array.from(this.store.values()).map((item) => item.metadata),
    };
  }
}

describe("R2 Presigned Uploads API", () => {
  it("should fail if R2_BUCKET is not bound", async () => {
    const env = {} as unknown as Bindings;
    const res = await worker.fetch(
      new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "test-file.txt" }),
      }),
      env,
    );
    expect(res.status).toBe(500);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.success).toBe(false);
    const err = json.error as Record<string, unknown>;
    expect(err.code).toBe("BINDING_ERROR");
  });

  it("should validate input key and expiration time on presigned-put", async () => {
    const r2Bucket = new MockR2Bucket();
    const env = { R2_BUCKET: r2Bucket } as unknown as Bindings;

    // 1. Empty key
    const resEmptyKey = await worker.fetch(
      new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "" }),
      }),
      env,
    );
    expect(resEmptyKey.status).toBe(400);

    // 2. Whitespace key
    const resSpacesKey = await worker.fetch(
      new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "   " }),
      }),
      env,
    );
    expect(resSpacesKey.status).toBe(400);

    // 3. Negative expiration
    const resNegExp = await worker.fetch(
      new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "test.txt", expiresIn: -10 }),
      }),
      env,
    );
    expect(resNegExp.status).toBe(400);

    // 4. Zero expiration
    const resZeroExp = await worker.fetch(
      new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "test.txt", expiresIn: 0 }),
      }),
      env,
    );
    expect(resZeroExp.status).toBe(400);
  });

  it("should generate mock presigned PUT URL and manage files correctly", async () => {
    const r2Bucket = new MockR2Bucket();
    const env = { R2_BUCKET: r2Bucket } as unknown as Bindings;

    // 1. Request presigned PUT URL
    const putRes = await worker.fetch(
      new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "avatar.png" }),
      }),
      env,
    );
    expect(putRes.status).toBe(200);
    const putJson = (await putRes.json()) as Record<string, unknown>;
    expect(putJson.success).toBe(true);
    expect(putJson.url).toBe("https://mock-r2.local/bucket/avatar.png");

    // 2. Head check on non-existent key (presigned-get should fail with 404)
    const getResBefore = await worker.fetch(
      new Request("http://localhost/r2/presigned-get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "avatar.png" }),
      }),
      env,
    );
    expect(getResBefore.status).toBe(404);

    // 3. Put mock file directly into bucket
    await r2Bucket.put("avatar.png", "fake-image-bytes");

    // 4. List files and check if avatar.png exists
    const listRes = await worker.fetch(
      new Request("http://localhost/r2/list", {
        method: "GET",
      }),
      env,
    );
    expect(listRes.status).toBe(200);
    const listJson = (await listRes.json()) as Record<string, unknown>;
    expect(listJson.success).toBe(true);
    const files = listJson.files as Array<Record<string, unknown>>;
    expect(files.length).toBe(1);
    expect(files[0].key).toBe("avatar.png");

    // 5. Presigned GET URL should now succeed
    const getResAfter = await worker.fetch(
      new Request("http://localhost/r2/presigned-get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "avatar.png" }),
      }),
      env,
    );
    expect(getResAfter.status).toBe(200);
    const getJson = (await getResAfter.json()) as Record<string, unknown>;
    expect(getJson.success).toBe(true);
    expect(getJson.url).toBe("https://mock-r2.local/bucket/avatar.png?get=true");

    // 6. Delete file
    const delRes = await worker.fetch(
      new Request("http://localhost/r2/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "avatar.png" }),
      }),
      env,
    );
    expect(delRes.status).toBe(200);
    const delJson = (await delRes.json()) as Record<string, unknown>;
    expect(delJson.success).toBe(true);

    // 7. Verify bucket is empty after delete
    const listResEmpty = await worker.fetch(
      new Request("http://localhost/r2/list", {
        method: "GET",
      }),
      env,
    );
    expect(listResEmpty.status).toBe(200);
    const listJsonEmpty = (await listResEmpty.json()) as Record<string, unknown>;
    expect(listJsonEmpty.success).toBe(true);
    const filesEmpty = listJsonEmpty.files as Array<Record<string, unknown>>;
    expect(filesEmpty.length).toBe(0);
  });
});
