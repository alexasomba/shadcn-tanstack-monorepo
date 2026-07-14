import { tanstackStartCookies } from "better-auth/tanstack-start";
import { createAuth, createDatabase } from "data-ops";

function readEnv(name: string): string | undefined {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const value = proc?.env?.[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Per-request Better Auth instance bound to this Worker's D1.
 * `tanstackStartCookies` must be last so Set-Cookie works with Start server fns.
 */
export function getAuth(d1: D1Database) {
  const db = createDatabase(d1);
  return createAuth(db, {
    appName: "User Web",
    baseURL: readEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:8300",
    secret: readEnv("BETTER_AUTH_SECRET"),
    plugins: [tanstackStartCookies()],
  });
}

export type AppAuth = ReturnType<typeof getAuth>;
