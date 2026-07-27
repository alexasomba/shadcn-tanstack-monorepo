import { env } from "cloudflare:workers";

/**
 * Cloudflare bindings for this Worker.
 * Prefer `import { env } from "cloudflare:workers"`.
 *
 * After changing wrangler.jsonc, regenerate:
 *   pnpm --filter admin-web-app exec wrangler types worker-configuration.d.ts --include-runtime false
 *
 * Optional fields not always in generated Env are intersectioned below.
 */
export type AppCloudflareEnv = Env & {
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

/** Workers AI binding when configured; undefined if absent (demos may fall back to Ollama). */
export function getAiBinding(): Ai | undefined {
  return asAppEnv().AI;
}
