# Milestone 3 (R2) Investigation Analysis - Local R2 Configuration & Hono Endpoints

## Executive Summary

This report analyzes the configuration of local R2 bucket bindings in the monorepo's `wrangler.jsonc` files and designs the Hono OpenAPI endpoints under `apps/data-service` for direct consumption of Cloudflare R2 bucket bindings and the S3 presigned URL helper utilities.

---

## 1. Wrangler R2 Bucket Binding Proposals

To support local and production R2 file uploads, both `apps/data-service` and `apps/user-web` must be configured with R2 bucket bindings. We propose binding a bucket named `R2_BUCKET` pointing to a bucket name `app-bucket`.

### A. data-service (`apps/data-service/wrangler.jsonc`)

Add the `"r2_buckets"` configuration block, and define the runtime S3 API environment variables in `"vars"`:

```json
  "vars": {
    "ONESIGNAL_APP_ID": "",
    "ONESIGNAL_API_KEY": "",
    "DISCORD_WEBHOOK_URL": "",
    "CLOUDFLARE_API_TOKEN": "",
    "CLOUDFLARE_ZONE_ID": "",
    "CLOUDFLARE_CNAME_TARGET": "",
    "R2_ACCOUNT_ID": "",
    "R2_ACCESS_KEY_ID": "",
    "R2_SECRET_ACCESS_KEY": "",
    "R2_BUCKET_NAME": "app-bucket"
  },
  "r2_buckets": [
    {
      "binding": "R2_BUCKET",
      "bucket_name": "app-bucket"
    }
  ]
```

### B. user-web (`apps/user-web/wrangler.jsonc`)

Add the `"r2_buckets"` configuration block to expose the bucket to TanStack Start loaders/functions if client-side or server-function direct uploads are required:

```json
  "r2_buckets": [
    {
      "binding": "R2_BUCKET",
      "bucket_name": "app-bucket"
    }
  ]
```

---

## 2. Expected R2 Endpoints & Verification in E2E Tests

During our code search, we analyzed the E2E test files (`apps/e2e-tests/src/tier1.test.ts`, `tier2.test.ts`, and `tier4.test.ts`). Currently, these endpoints are mocked inside a custom test interceptor (`fetchWrapper`):

1. **`POST /r2/presigned-put`**: Requests a presigned PUT URL. Checks that `key` is valid (not empty/spaces) and `expiresIn` is valid (>0).
2. **`POST /r2/presigned-get`**: Requests a presigned GET URL. Checks if the file exists (must return 404 if not found).
3. **`DELETE /r2/delete`**: Deletes a file key from the bucket gracefully.
4. **`GET /r2/list`**: Returns a list of files in the bucket.

We verified these endpoints do not yet exist in `apps/data-service/src/endpoints` and need to be implemented.

---

## 3. Proposal: Hono Route Implementation for R2

We propose creating a new endpoint group under `apps/data-service/src/endpoints/r2` utilizing `@hono/zod-openapi` to match existing patterns (similar to `domains` endpoints).

### A. Type Definition Updates (`apps/data-service/src/types.ts`)

Add R2-related bindings to `Bindings`:

```typescript
export type Bindings = {
  DATABASE: D1Database;
  R2_BUCKET: R2Bucket;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  // ... other bindings
};
```

### B. Schema Definitions (`apps/data-service/src/endpoints/r2/schemas.ts`)

```typescript
import { z } from "@hono/zod-openapi";

export const PresignedPutRequestSchema = z
  .object({
    key: z
      .string()
      .min(1, "Key is required")
      .refine((val) => val.trim() !== "", { message: "Invalid key" }),
    expiresIn: z
      .number()
      .int()
      .refine((val) => val > 0, { message: "Invalid expiration time" })
      .optional(),
  })
  .openapi("PresignedPutRequest");

export const PresignedPutResponseSchema = z
  .object({
    success: z.literal(true),
    url: z.string().openapi({ example: "https://mock-r2.local/bucket/avatar.png" }),
  })
  .openapi("PresignedPutResponse");

export const PresignedGetRequestSchema = z
  .object({
    key: z
      .string()
      .min(1, "Key is required")
      .refine((val) => val.trim() !== "", { message: "Invalid key" }),
    expiresIn: z
      .number()
      .int()
      .refine((val) => val > 0, { message: "Invalid expiration time" })
      .optional(),
  })
  .openapi("PresignedGetRequest");

export const PresignedGetResponseSchema = z
  .object({
    success: z.literal(true),
    url: z.string().openapi({ example: "https://mock-r2.local/bucket/avatar.png?get=true" }),
  })
  .openapi("PresignedGetResponse");

export const DeleteRequestSchema = z
  .object({
    key: z
      .string()
      .min(1, "Key is required")
      .refine((val) => val.trim() !== "", { message: "Invalid key" }),
  })
  .openapi("DeleteRequest");

export const DeleteResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .openapi("DeleteResponse");

export const R2ObjectSchema = z.object({
  key: z.string().openapi({ example: "avatar.png" }),
  size: z.number().openapi({ example: 1024 }),
  uploaded: z.string().openapi({ example: "2026-07-10T15:50:00.000Z" }),
});

export const ListResponseSchema = z
  .object({
    success: z.literal(true),
    files: z.array(R2ObjectSchema),
  })
  .openapi("ListResponse");

export const ErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("R2Error");
```

### C. Route Handler: Presigned PUT (`apps/data-service/src/endpoints/r2/presigned-put.ts`)

```typescript
import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { getPresignedPutUrl } from "data-ops";
import type { AppEnv } from "../../types";
import { PresignedPutRequestSchema, PresignedPutResponseSchema, ErrorSchema } from "./schemas";

export const presignedPutRoute = createRoute({
  method: "post",
  path: "/presigned-put",
  tags: ["R2 Uploads"],
  summary: "Generate presigned PUT URL for R2 upload",
  request: {
    body: {
      content: {
        "application/json": {
          schema: PresignedPutRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Presigned PUT URL generated successfully",
      content: {
        "application/json": {
          schema: PresignedPutResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error or invalid inputs",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal configuration or operation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const presignedPutHandler: RouteHandler<typeof presignedPutRoute, AppEnv> = async (c) => {
  const { key, expiresIn } = c.req.valid("json");

  const accountId = c.env.R2_ACCOUNT_ID;
  const accessKeyId = c.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY;
  const bucketName = c.env.R2_BUCKET_NAME || "app-bucket";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error("[R2] Missing R2 credentials in environment variables");
    return c.json(
      {
        success: false as const,
        error: {
          code: "CONFIG_ERROR",
          message: "R2 client is not configured correctly on the server.",
        },
      },
      500,
    );
  }

  try {
    const url = await getPresignedPutUrl(
      { accountId, accessKeyId, secretAccessKey, bucketName },
      key,
      expiresIn ?? 3600,
    );

    return c.json({ success: true, url }, 200);
  } catch (error: any) {
    console.error("[R2] Failed to generate presigned PUT URL:", error);
    return c.json(
      {
        success: false as const,
        error: {
          code: "OPERATION_FAILED",
          message: error.message || "Failed to generate presigned PUT URL.",
        },
      },
      500,
    );
  }
};
```

### D. Route Handler: Presigned GET (`apps/data-service/src/endpoints/r2/presigned-get.ts`)

```typescript
import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { getPresignedGetUrl } from "data-ops";
import type { AppEnv } from "../../types";
import { PresignedGetRequestSchema, PresignedGetResponseSchema, ErrorSchema } from "./schemas";

export const presignedGetRoute = createRoute({
  method: "post",
  path: "/presigned-get",
  tags: ["R2 Uploads"],
  summary: "Generate presigned GET URL for R2 file access",
  request: {
    body: {
      content: {
        "application/json": {
          schema: PresignedGetRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Presigned GET URL generated successfully",
      content: {
        "application/json": {
          schema: PresignedGetResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error or invalid inputs",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "File not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal configuration or operation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const presignedGetHandler: RouteHandler<typeof presignedGetRoute, AppEnv> = async (c) => {
  const { key, expiresIn } = c.req.valid("json");

  if (!c.env.R2_BUCKET) {
    console.error("[R2] Missing R2_BUCKET binding");
    return c.json(
      {
        success: false as const,
        error: {
          code: "BINDING_ERROR",
          message: "R2_BUCKET binding not configured.",
        },
      },
      500,
    );
  }

  // Check if file exists in the R2 bucket first (as expected by tests)
  const file = await c.env.R2_BUCKET.head(key);
  if (!file) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "NOT_FOUND",
          message: "File not found",
        },
      },
      404,
    );
  }

  const accountId = c.env.R2_ACCOUNT_ID;
  const accessKeyId = c.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY;
  const bucketName = c.env.R2_BUCKET_NAME || "app-bucket";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error("[R2] Missing R2 credentials in environment variables");
    return c.json(
      {
        success: false as const,
        error: {
          code: "CONFIG_ERROR",
          message: "R2 client is not configured correctly on the server.",
        },
      },
      500,
    );
  }

  try {
    const url = await getPresignedGetUrl(
      { accountId, accessKeyId, secretAccessKey, bucketName },
      key,
      expiresIn ?? 3600,
    );

    return c.json({ success: true, url }, 200);
  } catch (error: any) {
    console.error("[R2] Failed to generate presigned GET URL:", error);
    return c.json(
      {
        success: false as const,
        error: {
          code: "OPERATION_FAILED",
          message: error.message || "Failed to generate presigned GET URL.",
        },
      },
      500,
    );
  }
};
```

### E. Route Handler: Delete (`apps/data-service/src/endpoints/r2/delete.ts`)

```typescript
import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../types";
import { DeleteRequestSchema, DeleteResponseSchema, ErrorSchema } from "./schemas";

export const deleteRoute = createRoute({
  method: "delete",
  path: "/delete",
  tags: ["R2 Uploads"],
  summary: "Delete file from R2 bucket",
  request: {
    body: {
      content: {
        "application/json": {
          schema: DeleteRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "File deleted successfully or gracefully handled",
      content: {
        "application/json": {
          schema: DeleteResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error or invalid inputs",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal configuration or operation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const deleteHandler: RouteHandler<typeof deleteRoute, AppEnv> = async (c) => {
  const { key } = c.req.valid("json");

  if (!c.env.R2_BUCKET) {
    console.error("[R2] Missing R2_BUCKET binding");
    return c.json(
      {
        success: false as const,
        error: {
          code: "BINDING_ERROR",
          message: "R2_BUCKET binding not configured.",
        },
      },
      500,
    );
  }

  try {
    await c.env.R2_BUCKET.delete(key);
    return c.json({ success: true }, 200);
  } catch (error: any) {
    console.error("[R2] Failed to delete file:", error);
    return c.json(
      {
        success: false as const,
        error: {
          code: "OPERATION_FAILED",
          message: error.message || "Failed to delete file from R2.",
        },
      },
      500,
    );
  }
};
```

### F. Route Handler: List (`apps/data-service/src/endpoints/r2/list.ts`)

```typescript
import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../types";
import { ListResponseSchema, ErrorSchema } from "./schemas";

export const listRoute = createRoute({
  method: "get",
  path: "/list",
  tags: ["R2 Uploads"],
  summary: "List files in R2 bucket",
  responses: {
    200: {
      description: "List of files retrieved successfully",
      content: {
        "application/json": {
          schema: ListResponseSchema,
        },
      },
    },
    500: {
      description: "Internal configuration or operation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const listHandler: RouteHandler<typeof listRoute, AppEnv> = async (c) => {
  if (!c.env.R2_BUCKET) {
    console.error("[R2] Missing R2_BUCKET binding");
    return c.json(
      {
        success: false as const,
        error: {
          code: "BINDING_ERROR",
          message: "R2_BUCKET binding not configured.",
        },
      },
      500,
    );
  }

  try {
    const listRes = await c.env.R2_BUCKET.list();
    const files = listRes.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
    }));

    return c.json({ success: true, files }, 200);
  } catch (error: any) {
    console.error("[R2] Failed to list files:", error);
    return c.json(
      {
        success: false as const,
        error: {
          code: "OPERATION_FAILED",
          message: error.message || "Failed to list files from R2.",
        },
      },
      500,
    );
  }
};
```

### G. Group Router (`apps/data-service/src/endpoints/r2/router.ts`)

```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../types";
import { presignedPutRoute, presignedPutHandler } from "./presigned-put";
import { presignedGetRoute, presignedGetHandler } from "./presigned-get";
import { deleteRoute, deleteHandler } from "./delete";
import { listRoute, listHandler } from "./list";

export const r2App = new OpenAPIHono<AppEnv>();

r2App.openapi(presignedPutRoute, presignedPutHandler);
r2App.openapi(presignedGetRoute, presignedGetHandler);
r2App.openapi(deleteRoute, deleteHandler);
r2App.openapi(listRoute, listHandler);
```

### H. App Integration (`apps/data-service/src/index.ts`)

Add route mounting to index.ts:

```typescript
import { r2App } from "./endpoints/r2/router";
...
app.route("/r2", r2App);
```
