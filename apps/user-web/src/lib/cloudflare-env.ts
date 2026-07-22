import { env } from "cloudflare:workers";

/**
 * Cloudflare bindings for this Worker.
 * Prefer `import { env } from "cloudflare:workers"`.
 *
 * After changing wrangler.jsonc, regenerate:
 *   pnpm --filter user-web-app types
 * (`Env` / `Cloudflare.Env` in worker-configuration.d.ts)
 *
 * Optional secrets/vars not always present in generated Env are intersectioned below.
 *
 * @see docs/cloudflare-for-saas.md
 */
export type AppCloudflareEnv = Env & {
  /** Vanity base: {slug}.PLATFORM_BASE_DOMAIN (set in vars when ready). */
  PLATFORM_BASE_DOMAIN?: string;
  ONESIGNAL_APP_ID?: string;
  ONESIGNAL_API_KEY?: string;
  NOTIFY_DRY_RUN?: string;
  VITE_APP_URL?: string;
};

function asAppEnv(): AppCloudflareEnv {
  return env;
}

export function getCloudflareEnv(): AppCloudflareEnv {
  return asAppEnv();
}

export function getDatabase(): D1Database {
  return asAppEnv().DATABASE;
}

export function getDataService(): Fetcher {
  return asAppEnv().DATA_SERVICE;
}

/** R2 bucket for product media (avatars, org logos). */
export function getR2Bucket(): R2Bucket | undefined {
  return asAppEnv().R2_BUCKET;
}

/** Workers AI binding when configured; undefined if absent (demos may fall back to Ollama). */
export function getAiBinding(): Ai | undefined {
  return asAppEnv().AI;
}
