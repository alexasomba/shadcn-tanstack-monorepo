import type { AuthSession, AuthUser } from "data-ops";
import type { Context } from "hono";

import type { JobMessage } from "./jobs/catalog";

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
  /** OneSignal App ID (public). Pair with secret API key for live email/push. */
  ONESIGNAL_APP_ID?: string;
  /** OneSignal REST API key — set via `wrangler secret` / `.dev.vars`, not wrangler vars. */
  ONESIGNAL_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
  /** Force better-notify mock transports (`1` / `true`). */
  NOTIFY_DRY_RUN?: string;
  /** Cloudflare for SaaS API token — secret. */
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  CLOUDFLARE_CNAME_TARGET?: string;
  /** `memory` forces Domain SDK test provider (local/e2e only). */
  DOMAIN_SDK_MODE?: string;
  /**
   * Platform host for vanity org subdomains, e.g. `app.example.com`
   * so `{slug}.app.example.com` maps to organization.slug.
   * Custom domains still map via the `domains` table → same slug.
   */
  PLATFORM_BASE_DOMAIN?: string;
  /** Producer + consumer for background jobs. */
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

/** Typed JOBS_QUEUE body (see jobs/catalog.ts). Unknown shapes are rejected at consume. */
export type JobsQueueMessage = JobMessage;
