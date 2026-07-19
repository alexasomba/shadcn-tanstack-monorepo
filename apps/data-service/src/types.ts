import type { AuthSession, AuthUser } from "data-ops";
import type { Context } from "hono";

import type { JobMessage } from "./jobs/catalog";

/**
 * Worker bindings for data-service.
 *
 * Infrastructure bindings come from `wrangler types` → `CloudflareBindings`
 * (`worker-configuration.d.ts`). Re-run after wrangler.jsonc changes:
 *   pnpm --filter data-service exec wrangler types worker-configuration.d.ts --env-interface CloudflareBindings --include-runtime false
 *
 * Secrets / optional vars (secret put, .dev.vars, dashboard) are listed as optional
 * string fields — not duplicated as fake empty wrangler vars.
 *
 * @see docs/cloudflare-for-saas.md
 */
/**
 * Generated bindings + optional secrets/vars.
 * JOBS_QUEUE / workflows optional so tests and partial local envs type-check.
 */
export type Bindings = Omit<
  CloudflareBindings,
  "JOBS_QUEUE" | "USER_ONBOARDING_WORKFLOW" | "ORG_ONBOARDING_WORKFLOW" | "R2_BUCKET"
> & {
  JOBS_QUEUE?: Queue;
  USER_ONBOARDING_WORKFLOW?: Workflow;
  ORG_ONBOARDING_WORKFLOW?: Workflow;
  R2_BUCKET?: R2Bucket;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  /** OneSignal App ID (public). */
  ONESIGNAL_APP_ID?: string;
  /** OneSignal REST API key — wrangler secret / .dev.vars only. */
  ONESIGNAL_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
  NOTIFY_DRY_RUN?: string;
  /** Cloudflare for SaaS API token — secret. */
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  CLOUDFLARE_CNAME_TARGET?: string;
  DOMAIN_SDK_MODE?: string;
  PLATFORM_BASE_DOMAIN?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
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
