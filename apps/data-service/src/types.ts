import type { AuthSession, AuthUser } from "data-ops";
import type { Context } from "hono";

/**
 * Worker bindings for data-service.
 * Keep in sync with wrangler.jsonc + worker-configuration.d.ts.
 */
export type Bindings = {
  DATABASE: D1Database;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  /** Producer + consumer for background jobs (stub). */
  JOBS_QUEUE?: Queue;
};

export type Variables = {
  user: AuthUser | null;
  session: AuthSession | null;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

export type AppContext = Context<AppEnv>;

/** Default queue body shape for JOBS_QUEUE consumers. */
export type JobsQueueMessage =
  | { type: "outbox.drain" }
  | { type: "ping"; at: string }
  | { type: string; [key: string]: unknown };
