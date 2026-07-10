import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import * as schema from "../../../packages/data-ops/src/schema.js";

declare global {
  var process: {
    env: Record<string, string | undefined>;
  };
}

// A minimal mock Drizzle database instance to satisfy Better Auth schema generator
const mockDb = {
  $primary: "sqlite",
  _: {
    schema,
    tableNamesMap: {},
  },
} as unknown as Parameters<typeof drizzleAdapter>[0];

export const authConfig = {
  database: drizzleAdapter(mockDb, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || "development-secret-12345678901234567890",
};

// Expose standard auth object for Better Auth CLI to read schema options
export const auth = betterAuth(authConfig);
