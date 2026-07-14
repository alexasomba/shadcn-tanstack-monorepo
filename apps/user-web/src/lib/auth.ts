import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";
import { createAuth, createDatabase, getNotifyClient } from "data-ops";
// @ts-ignore: TS2307 - Vinxi/http types are not fully resolved in this workspace
import { getEvent } from "vinxi/http";

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
  const notify = getNotifyClient(env as unknown as Record<string, string | undefined>);

  return createAuth(db, {
    appName: "User Web",
    baseURL: readEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:8300",
    secret: readEnv("BETTER_AUTH_SECRET"),
    plugins: [tanstackStartCookies()],
    advanced: {
      backgroundTasks: {
        handler: (promise: Promise<unknown>) => {
          try {
            const event = getEvent();
            const ctx = event?.context?.cloudflare?.context;
            if (ctx && typeof ctx.waitUntil === "function") {
              ctx.waitUntil(promise);
              return;
            }
          } catch {
            // Ignore
          }
          promise.catch(console.error);
        },
      },
    },
    sendVerificationEmail: async ({ user, url }) => {
      await notify.verifyEmail.send({
        to: user.email,
        input: { name: "User", url },
      });
    },
    sendResetPassword: async ({ user, url }) => {
      await notify.resetPassword.send({
        to: user.email,
        input: { name: "User", url },
      });
    },
    sendInvitationEmail: async ({ email, organization, inviter, invitation }) => {
      const acceptUrl = `${readEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:8300"}/accept-invite?id=${invitation.id}`;
      await notify.orgInvitation.send({
        to: email,
        input: {
          inviterName: inviter.user.name || "Admin",
          organizationName: organization.name,
          url: acceptUrl,
        },
      });
    },
    sendOTP: async ({ user, otp }) => {
      await notify.twoFactorOtp.send({
        to: user.email,
        input: { otp },
      });
    },
  });
}

export type AppAuth = ReturnType<typeof getAuth>;
