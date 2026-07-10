import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { betterAuth } from "better-auth";
import { getDB, todos, desc } from "data-ops";

import { authConfig } from "./auth.js";

type Bindings = {
  DB: D1Database;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// Helper to get Better Auth instance dynamically with request D1 binding
const getAuth = (d1: D1Database) => {
  const db = getDB(d1);
  return betterAuth({
    ...authConfig,
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
  });
};

// Catch-all route for Better Auth endpoints
app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const auth = getAuth(c.env.DB);
  return auth.handler(c.req.raw);
});

// Zod Schemas for OpenAPI
const TodoSchema = z
  .object({
    id: z.number().openapi({
      example: 1,
    }),
    title: z.string().openapi({
      example: "Buy milk",
    }),
    createdAt: z.string().openapi({
      example: "2026-07-10T15:50:00.000Z",
    }),
  })
  .openapi("Todo");

const TodoInputSchema = z
  .object({
    title: z.string().min(1).openapi({
      example: "Buy milk",
    }),
  })
  .openapi("TodoInput");

// OpenAPI Route definition: GET /todos
const getTodosRoute = createRoute({
  method: "get",
  path: "/todos",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(TodoSchema),
        },
      },
      description: "Retrieve todos list",
    },
  },
});

// OpenAPI Route definition: POST /todos
const createTodoRoute = createRoute({
  method: "post",
  path: "/todos",
  request: {
    body: {
      content: {
        "application/json": {
          schema: TodoInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
      description: "Create a new todo",
    },
  },
});

// Register Handlers
app.openapi(getTodosRoute, async (c) => {
  const db = getDB(c.env.DB);
  const result = await db.query.todos.findMany({
    orderBy: [desc(todos.createdAt)],
  });

  // Map Date to string for Zod Schema compatibility
  const formattedResult = result.map((t) => ({
    ...t,
    createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
  }));

  return c.json(formattedResult);
});

app.openapi(createTodoRoute, async (c) => {
  const { title } = c.req.valid("json");
  const db = getDB(c.env.DB);
  await db.insert(todos).values({ title });
  return c.json({ success: true });
});

// OpenAPI JSON document
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Data Service API",
  },
});

export default app;
export type AppType = typeof app;
