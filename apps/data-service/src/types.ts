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
  ONESIGNAL_APP_ID?: string;
  ONESIGNAL_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  CLOUDFLARE_CNAME_TARGET?: string;
  /** Producer + consumer for background jobs (stub). */
  JOBS_QUEUE?: Queue;
  R2_BUCKET?: R2Bucket;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  USER_ONBOARDING_WORKFLOW?: Workflow;
  ORG_ONBOARDING_WORKFLOW?: Workflow;
  SENTRY_DSN?: string;
  VITE_SENTRY_DSN?: string;
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
