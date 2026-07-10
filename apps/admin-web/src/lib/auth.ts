import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getDB } from "data-ops";

export const getAuth = (d1: D1Database) => {
  const db = getDB(d1);
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: process.env.BETTER_AUTH_SECRET || "development-secret-12345678901234567890",
    plugins: [tanstackStartCookies()],
  });
};
