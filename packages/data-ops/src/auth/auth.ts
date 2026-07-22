/**
 * Better Auth instance for CLI tooling only (`vpr auth:generate` / `vpr auth:info`).
 * Runtime Workers use `createAuth(db, env)` from `./create-auth`.
 */
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";

import * as authSchema from "../drizzle/schema/auth";
import { createBaseAuthPlugins } from "./plugins";

function readEnv(name: string): string | undefined {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const value = proc?.env?.[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

const mockDb = {
  query: {},
  select: () => ({ from: () => ({ where: () => [] }) }),
  insert: () => ({ values: () => ({ returning: () => [] }) }),
  update: () => ({ set: () => ({ where: () => [] }) }),
  delete: () => ({ where: () => [] }),
} as unknown as Parameters<typeof drizzleAdapter>[0];

export const auth = betterAuth({
  appName: "App",
  baseURL: readEnv("BETTER_AUTH_URL") || "http://127.0.0.1:8300",
  secret: readEnv("BETTER_AUTH_SECRET") || "dev-only-better-auth-secret-min-32-chars!",
  database: drizzleAdapter(mockDb, {
    provider: "sqlite",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(readEnv("GOOGLE_CLIENT_ID") && readEnv("GOOGLE_CLIENT_SECRET")
      ? {
          google: {
            clientId: readEnv("GOOGLE_CLIENT_ID") ?? "",
            clientSecret: readEnv("GOOGLE_CLIENT_SECRET") ?? "",
          },
        }
      : {}),
    ...(readEnv("MICROSOFT_CLIENT_ID") && readEnv("MICROSOFT_CLIENT_SECRET")
      ? {
          microsoft: {
            clientId: readEnv("MICROSOFT_CLIENT_ID") ?? "",
            clientSecret: readEnv("MICROSOFT_CLIENT_SECRET") ?? "",
          },
        }
      : {}),
  },
  plugins: createBaseAuthPlugins(),
});
