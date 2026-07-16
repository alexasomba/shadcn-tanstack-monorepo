import { env } from "cloudflare:workers";

/**
 * Cloudflare bindings for this Worker.
 * Prefer `import { env } from "cloudflare:workers"` (current platform API)
 * over legacy vinxi/event-context plumbing.
 *
 * @see https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
 */
export type AppCloudflareEnv = {
  DATABASE: D1Database;
  DATA_SERVICE: Fetcher;
  R2_BUCKET?: R2Bucket;
  AI?: Ai;
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
