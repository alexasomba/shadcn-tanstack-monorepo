import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";

import * as authSchema from "../auth-schema";
import type { Database } from "../database/setup";
import { createMailerFromEnv } from "../email/mailer";
import type { Mailer } from "../email/mailer";
import { createBaseAuthPlugins } from "./plugins";

const DEV_SECRET = "dev-only-better-auth-secret-min-32-chars!";

export type CreateAuthEnv = {
  /** Base URL of the auth API host (e.g. http://127.0.0.1:8300). */
  baseURL?: string;
  /** Encryption secret — min 32 chars. Prefer BETTER_AUTH_SECRET env. */
  secret?: string;
  /** Extra CSRF-trusted origins (baseURL origin is always trusted). */
  trustedOrigins?: Array<string>;
  /**
   * Extra plugins (e.g. tanstackStartCookies). Appended after base plugins;
   * put cookie plugins last.
   */
  plugins?: Array<BetterAuthPlugin>;
  /** Optional app display name. */
  appName?: string;
  /** Override NODE_ENV-style production detection. */
  isProduction?: boolean;
  /** Transactional email. Defaults to Resend when env is set, else console. */
  mailer?: Mailer;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

function readEnv(name: string): string | undefined {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const value = proc?.env?.[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function resolveSecret(secret: string | undefined, isProduction: boolean): string {
  const value =
    secret?.trim() || readEnv("BETTER_AUTH_SECRET")?.trim() || readEnv("AUTH_SECRET")?.trim();

  if (value && value.length >= 32) {
    return value;
  }

  if (isProduction) {
    throw new Error(
      "BETTER_AUTH_SECRET is required in production (min 32 characters). Generate with: openssl rand -base64 32",
    );
  }

  if (value && value.length < 32) {
    console.warn(
      "[auth] BETTER_AUTH_SECRET is shorter than 32 characters; using development fallback.",
    );
  }

  return DEV_SECRET;
}

function defaultTrustedOrigins(): Array<string> {
  const fromEnv = readEnv("BETTER_AUTH_TRUSTED_ORIGINS");
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((origin: string) => origin.trim())
      .filter(Boolean);
  }

  return [
    "http://127.0.0.1:8300",
    "http://localhost:8300",
    "http://127.0.0.1:8301",
    "http://localhost:8301",
    "http://127.0.0.1:8302",
    "http://localhost:8302",
  ];
}

/**
 * Shared Better Auth factory for D1 + Drizzle (data-ops schema).
 *
 * Base plugins include `organization`. Apps using TanStack Start should pass
 * `tanstackStartCookies()` as the last plugin.
 */
export function createAuth(db: Database, env: CreateAuthEnv = {}) {
  const isProduction =
    env.isProduction ?? (readEnv("NODE_ENV") === "production" || readEnv("CF_PAGES") === "1");

  const secret = resolveSecret(env.secret, isProduction);
  const baseURL = env.baseURL ?? readEnv("BETTER_AUTH_URL");
  const trustedOrigins = env.trustedOrigins ?? defaultTrustedOrigins();
  const plugins = [...createBaseAuthPlugins(), ...(env.plugins ?? [])];
  const mailer =
    env.mailer ??
    createMailerFromEnv({
      RESEND_API_KEY: env.RESEND_API_KEY ?? readEnv("RESEND_API_KEY"),
      EMAIL_FROM: env.EMAIL_FROM ?? readEnv("EMAIL_FROM"),
    });

  const options = {
    appName: env.appName ?? "App",
    ...(baseURL ? { baseURL } : {}),
    secret,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 256,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }: { user: { email: string }; url: string }) => {
        return mailer.send({
          to: user.email,
          subject: "Reset your password",
          text: `Click the link to reset your password: ${url}`,
          html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: false,
      sendVerificationEmail: ({ user, url }: { user: { email: string }; url: string }) => {
        return mailer.send({
          to: user.email,
          subject: "Verify your email",
          text: `Click the link to verify your email: ${url}`,
          html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
        strategy: "compact" as const,
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
    trustedOrigins,
    advanced: {
      useSecureCookies: isProduction,
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
      },
      defaultCookieAttributes: {
        sameSite: "lax" as const,
        httpOnly: true,
      },
    },
    plugins,
  } satisfies BetterAuthOptions;

  return betterAuth(options);
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
export type AuthUser = Session["user"];
export type AuthSession = Session["session"];
