import type { ExportedHandler } from "@cloudflare/workers-types";
import { OpenAPIHono } from "@hono/zod-openapi";
import * as Sentry from "@sentry/cloudflare";
import { cors } from "hono/cors";

import { getAuth } from "./auth.js";
import { databaseApp } from "./endpoints/database/router";
import { domainsApp } from "./endpoints/domains/router";
import { healthHandler, healthRoute } from "./endpoints/health";
import { notificationsApp } from "./endpoints/notifications/router";
import { r2App } from "./endpoints/r2/router";
import { todosApp } from "./endpoints/todos/router";
import { workflowsApp } from "./endpoints/workflows/router";
import { handleScheduled } from "./jobs/cron";
import { handleJobsBatch } from "./jobs/queue";
import { requireApiKey } from "./middleware/api-key.js";
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
  Sentry.captureException(err);
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

app.use("/todos/*", requireApiKey);
app.use("/notifications/*", requireApiKey);
app.use("/domains/*", requireApiKey);

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
app.route("/database", databaseApp);
app.route("/r2", r2App);
app.route("/workflows", workflowsApp);

app.get("/api/debug/sentry-test", () => {
  const error = new Error("Sentry test exception");
  Sentry.captureException(error);
  throw error;
});

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
  fetch: (request: Request, env: Bindings, ctx?: ExecutionContext) => app.fetch(request, env, ctx),
  async queue(batch: MessageBatch<JobsQueueMessage>, env: Bindings) {
    await handleJobsBatch(batch, env);
  },
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    await handleScheduled(event, env, ctx);
  },
};

const isTest =
  typeof process !== "undefined" && (process.env.VITEST || process.env.NODE_ENV === "test");

export default (isTest
  ? worker
  : Sentry.withSentry(
      (env: Bindings) => ({
        dsn: env.SENTRY_DSN || env.VITE_SENTRY_DSN || "https://mock-dsn@sentry.io/123",
        tracesSampleRate: 1.0,
      }),
      worker as unknown as ExportedHandler<Bindings>,
    )) as typeof worker;

export type AppType = typeof app;
