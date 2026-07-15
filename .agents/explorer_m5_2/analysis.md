# Milestone 5 (R4) - Database Seeding and Verification Design Analysis

## Executive Summary

This report analyzes and designs the Hono OpenAPI endpoints `/database/seed` (POST) and `/database/seed/verify` (GET) under the `apps/data-service` Cloudflare Worker. The designed endpoints leverage the programmatic `drizzle-seed` library to populate D1 database tables with mock data, handle missing tables due to unapplied migrations with a structured `500` error response, and retrieve live counts of `users`, `organizations`, and `todos` to verify seeding state.

---

## 1. OpenAPI Schemas Design

We define OpenAPI schemas matching the monorepo's signature standards using `@hono/zod-openapi` and Zod primitives. The schemas are placed under `apps/data-service/src/endpoints/database/schemas.ts`.

### 1.1 POST `/database/seed` Response Schema (`SeedResponseSchema`)

```typescript
export const SeedResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .openapi("SeedResponse");
```

### 1.2 GET `/database/seed/verify` Response Schema (`VerifyResponseSchema`)

```typescript
export const VerifyResponseSchema = z
  .object({
    success: z.literal(true),
    counts: z.object({
      users: z.number().int().nonnegative(),
      organizations: z.number().int().nonnegative(),
      todos: z.number().int().nonnegative(),
    }),
  })
  .openapi("VerifyResponse");
```

### 1.3 Error Schema (`ErrorSchema`)

Redefined locally per module convention in the endpoints tree:

```typescript
export const ErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("Error");
```

---

## 2. API Endpoints Implementation Design

### 2.1 POST `/database/seed`

- **Path**: `/database/seed`
- **Method**: `POST`
- **Authentication**: Not authenticated (since it's a dev-only database initialization endpoint, though typical production services restrict this route).
- **Behavior**:
  - Dynamically extracts all table instances exported from the `data-ops` package.
  - Invokes `seed(db, tablesSchema, { count: 10 })` to generate a repeatable set of mock rows.
  - Catches database errors (like `no such table` or SQLite errors) when database tables are missing due to unapplied migrations and returns:
    - Status code: `500`
    - Payload: `{ success: false, error: { code: "MIGRATIONS_NOT_APPLIED", message: "Migrations not applied" } }`

#### Proposed `apps/data-service/src/endpoints/database/seed.ts`

```typescript
import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { seed } from "drizzle-seed";
import * as allTables from "data-ops";
import { Table } from "drizzle-orm";
import { createDatabase } from "data-ops";

import type { AppEnv } from "../../types";
import { ErrorSchema, SeedResponseSchema } from "./schemas";

export const seedRoute = createRoute({
  method: "post",
  path: "/seed",
  tags: ["Database"],
  summary: "Seed database with mock data",
  responses: {
    200: {
      description: "Database seeded successfully",
      content: {
        "application/json": {
          schema: SeedResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error or Migrations not applied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const seedHandler: RouteHandler<typeof seedRoute, AppEnv> = async (c) => {
  const db = createDatabase(c.env.DATABASE);
  const tablesSchema = Object.fromEntries(
    Object.entries(allTables).filter(([_, val]) => val instanceof Table),
  );

  try {
    await seed(db, tablesSchema, { count: 10 });
    return c.json({ success: true as const }, 200);
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg.includes("no such table") || msg.includes("SQLITE_ERROR") || msg.includes("D1_ERROR")) {
      return c.json(
        {
          success: false,
          error: {
            code: "MIGRATIONS_NOT_APPLIED",
            message: "Migrations not applied",
          },
        },
        500,
      );
    }
    throw error;
  }
};
```

---

### 2.2 GET `/database/seed/verify`

- **Path**: `/database/seed/verify`
- **Method**: `GET`
- **Behavior**:
  - Performs direct count queries on the `user`, `organization`, and `todos` tables.
  - Uses the robust, version-safe `sql<number>`count(\*)`.mapWith(Number)` helper to avoid Drizzle type mismatches in older client environments.
  - Gracefully maps unapplied migrations to the exact same 500 error structure if tables are missing.

#### Proposed `apps/data-service/src/endpoints/database/verify.ts`

```typescript
import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { createDatabase, user, organization, todos } from "data-ops";

import type { AppEnv } from "../../types";
import { ErrorSchema, VerifyResponseSchema } from "./schemas";

export const verifyRoute = createRoute({
  method: "get",
  path: "/seed/verify",
  tags: ["Database"],
  summary: "Verify database seed counts",
  responses: {
    200: {
      description: "Seed verification counts",
      content: {
        "application/json": {
          schema: VerifyResponseSchema,
        },
      },
    },
    500: {
      description: "Database error or migrations not applied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const verifyHandler: RouteHandler<typeof verifyRoute, AppEnv> = async (c) => {
  const db = createDatabase(c.env.DATABASE);

  try {
    const [usersCountResult] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(user);
    const [orgsCountResult] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(organization);
    const [todosCountResult] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(todos);

    const counts = {
      users: usersCountResult?.value ?? 0,
      organizations: orgsCountResult?.value ?? 0,
      todos: todosCountResult?.value ?? 0,
    };

    return c.json(
      {
        success: true as const,
        counts,
      },
      200,
    );
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg.includes("no such table") || msg.includes("SQLITE_ERROR") || msg.includes("D1_ERROR")) {
      return c.json(
        {
          success: false,
          error: {
            code: "MIGRATIONS_NOT_APPLIED",
            message: "Migrations not applied",
          },
        },
        500,
      );
    }
    throw error;
  }
};
```

---

## 3. Router Wiring and Data Service Registration

### 3.1 Proposed `apps/data-service/src/endpoints/database/router.ts`

This router compiles the two routes under `/seed` and `/seed/verify`. Note that when mounted under `/database` in `index.ts`, these paths automatically match `/database/seed` and `/database/seed/verify`.

```typescript
import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { seedHandler, seedRoute } from "./seed";
import { verifyHandler, verifyRoute } from "./verify";

export const databaseApp = new OpenAPIHono<AppEnv>();

databaseApp.openapi(seedRoute, seedHandler);
databaseApp.openapi(verifyRoute, verifyHandler);
```

### 3.2 Index Registration (`apps/data-service/src/index.ts`)

To mount the router, the following edits are proposed:

```diff
<<<<
import { healthHandler, healthRoute } from "./endpoints/health";
import { notificationsApp } from "./endpoints/notifications/router";
import { r2App } from "./endpoints/r2/router";
import { todosApp } from "./endpoints/todos/router";
import { workflowsApp } from "./endpoints/workflows/router";
====
import { databaseApp } from "./endpoints/database/router";
import { healthHandler, healthRoute } from "./endpoints/health";
import { notificationsApp } from "./endpoints/notifications/router";
import { r2App } from "./endpoints/r2/router";
import { todosApp } from "./endpoints/todos/router";
import { workflowsApp } from "./endpoints/workflows/router";
>>>>
```

```diff
<<<<
app.openapi(healthRoute, healthHandler);
app.route("/todos", todosApp);
app.route("/notifications", notificationsApp);
app.route("/domains", domainsApp);
app.route("/r2", r2App);
app.route("/workflows", workflowsApp);
====
app.openapi(healthRoute, healthHandler);
app.route("/todos", todosApp);
app.route("/notifications", notificationsApp);
app.route("/domains", domainsApp);
app.route("/r2", r2App);
app.route("/workflows", workflowsApp);
app.route("/database", databaseApp);
>>>>
```

---

## 4. Verification and Validation Methods

To verify the integration, the following steps must be run using Vite+ toolchain and test runner:

1. **Verify Formatting, Linting and TypeScript build status**:
   ```bash
   vp check
   ```
2. **Launch development server** (Miniflare D1 emulation):
   ```bash
   vp run dev
   ```
3. **Execute validation tests against `/database/seed` and `/database/seed/verify`**:
   - Verify that calling `/database/seed/verify` when no migrations are applied returns status code `500` and `Migrations not applied`.
   - Verify that after applying migrations:
     - `POST /database/seed` succeeds with status `200` and `{ success: true }`.
     - `GET /database/seed/verify` returns status `200` and `{ success: true, counts: { users: 10, organizations: 10, todos: 10 } }` (or counts matching the seeding rules).
