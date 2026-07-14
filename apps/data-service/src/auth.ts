import { createAuth, createDatabase } from "data-ops";
import type { Auth, AuthSession, AuthUser } from "data-ops";

function readEnv(name: string): string | undefined {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const value = proc?.env?.[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

export type GetAuthOptions = {
  baseURL?: string;
  secret?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

/**
 * Runtime Better Auth instance for the data-service Worker.
 * Prefer binding secrets via wrangler (`BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`).
 */
export function getAuth(d1: D1Database, options: GetAuthOptions = {}) {
  const db = createDatabase(d1);
  return createAuth(db, {
    appName: "Data Service",
    baseURL: options.baseURL ?? readEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:8302",
    secret: options.secret ?? readEnv("BETTER_AUTH_SECRET"),
    RESEND_API_KEY: options.RESEND_API_KEY ?? readEnv("RESEND_API_KEY"),
    EMAIL_FROM: options.EMAIL_FROM ?? readEnv("EMAIL_FROM"),
  });
}

export type DataServiceAuth = ReturnType<typeof getAuth>;
export type { Auth, AuthSession, AuthUser };

// CLI: use packages/data-ops (`vpr auth:generate` / `vpr auth:info`).
// Runtime: getAuth(env.DATABASE) above.
