import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";

import { getAuth } from "./auth.js";
import { domainsApp } from "./endpoints/domains/router";
import { healthHandler, healthRoute } from "./endpoints/health";
import { notificationsApp } from "./endpoints/notifications/router";
import { todosApp } from "./endpoints/todos/router";
import { handleScheduled } from "./jobs/cron";
import { handleJobsBatch } from "./jobs/queue";
import type { AppEnv, Bindings, JobsQueueMessage } from "./types";

const app = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (result.success) {
      return;
    }
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          details: { issues: result.error.issues },
        },
      },
      400,
    );
  },
});

app.onError((err, c) => {
  console.error("[data-service] unhandled error:", err);
  return c.json(
    {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal Server Error" },
    },
    500,
  );
});

const trustedOrigins = [
  "http://127.0.0.1:8300",
  "http://localhost:8300",
  "http://127.0.0.1:8301",
  "http://localhost:8301",
  "http://127.0.0.1:8302",
  "http://localhost:8302",
];

app.use(
  "/api/auth/*",
  cors({
    origin: trustedOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use("*", async (c, next) => {
  try {
    const auth = getAuth(
      c.env.DATABASE,
      {
        baseURL: c.env.BETTER_AUTH_URL,
        secret: c.env.BETTER_AUTH_SECRET,
        RESEND_API_KEY: c.env.RESEND_API_KEY,
        EMAIL_FROM: c.env.EMAIL_FROM,
      },
      c.env,
    );
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set("user", session?.user ?? null);
    c.set("session", session?.session ?? null);
  } catch (error) {
    console.warn("[data-service] session lookup failed:", error);
    c.set("user", null);
    c.set("session", null);
  }
  await next();
});

app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const auth = getAuth(
    c.env.DATABASE,
    {
      baseURL: c.env.BETTER_AUTH_URL,
      secret: c.env.BETTER_AUTH_SECRET,
      RESEND_API_KEY: c.env.RESEND_API_KEY,
      EMAIL_FROM: c.env.EMAIL_FROM,
    },
    c.env,
  );
  return auth.handler(c.req.raw);
});

app.get("/session", (c) => {
  const user = c.get("user");
  const session = c.get("session");
  if (!user) {
    return c.body(null, 401);
  }
  return c.json({ user, session });
});

/** Dev/helper: enqueue a queue ping (no-op if binding missing). */
app.post("/internal/jobs/ping", async (c) => {
  if (!c.env.JOBS_QUEUE) {
    return c.json({ ok: false, error: "JOBS_QUEUE binding not configured" }, 503);
  }
  await c.env.JOBS_QUEUE.send({ type: "ping", at: new Date().toISOString() });
  return c.json({ ok: true });
});

app.openapi(healthRoute, healthHandler);
app.route("/todos", todosApp);
app.route("/notifications", notificationsApp);
app.route("/domains", domainsApp);

app.doc("/openapi.json", {
  openapi: "3.2.0",
  info: {
    title: "Data Service API",
    version: "1.0.0",
    description:
      "Monorepo data-service Worker. Resource endpoints live under src/endpoints/* (@hono/zod-openapi).",
  },
});

app.doc("/doc", {
  openapi: "3.2.0",
  info: {
    title: "Data Service API",
    version: "1.0.0",
  },
});

const worker = {
  fetch: app.fetch.bind(app),
  async queue(batch: MessageBatch<JobsQueueMessage>, env: Bindings) {
    await handleJobsBatch(batch, env);
  },
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    await handleScheduled(event, env, ctx);
  },
};

export default worker;
export type AppType = typeof app;
