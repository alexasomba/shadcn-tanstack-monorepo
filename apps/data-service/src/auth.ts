import { createAuth, createDatabase, getNotifyClient } from "data-ops";
import type { Auth, AuthSession, AuthUser } from "data-ops";

import type { Bindings } from "./types";

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
export function getAuth(d1: D1Database, options: GetAuthOptions = {}, bindings?: Bindings) {
  const db = createDatabase(d1);
  const notify = bindings ? getNotifyClient(bindings) : undefined;

  return createAuth(db, {
    appName: "Data Service",
    baseURL: options.baseURL ?? readEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:8302",
    secret: options.secret ?? readEnv("BETTER_AUTH_SECRET"),
    RESEND_API_KEY: options.RESEND_API_KEY ?? readEnv("RESEND_API_KEY"),
    EMAIL_FROM: options.EMAIL_FROM ?? readEnv("EMAIL_FROM"),

    onUserSignup: async (user) => {
      if (bindings?.USER_ONBOARDING_WORKFLOW) {
        try {
          await bindings.USER_ONBOARDING_WORKFLOW.create({
            id: `wf-user-${user.id}-${Date.now()}`,
            params: { userId: user.id },
          });
        } catch (err) {
          console.error("Failed to automatically trigger UserOnboardingWorkflow:", err);
        }
      }
    },

    onOrgCreate: async (org) => {
      if (bindings?.ORG_ONBOARDING_WORKFLOW) {
        try {
          await bindings.ORG_ONBOARDING_WORKFLOW.create({
            id: `wf-org-${org.id}-${Date.now()}`,
            params: { orgId: org.id },
          });
        } catch (err) {
          console.error("Failed to automatically trigger OrgOnboardingWorkflow:", err);
        }
      }
    },

    sendVerificationEmail: async ({ user, url }) => {
      if (notify) {
        await notify.verifyEmail.send({
          to: user.email,
          input: { name: "User", url },
        });
      } else {
        console.log(`[auth:verifyEmail] to=${user.email} url=${url}`);
      }
    },

    sendResetPassword: async ({ user, url }) => {
      if (notify) {
        await notify.resetPassword.send({
          to: user.email,
          input: { name: "User", url },
        });
      } else {
        console.log(`[auth:resetPassword] to=${user.email} url=${url}`);
      }
    },

    sendInvitationEmail: async ({ email, organization, inviter, invitation }) => {
      if (notify) {
        const acceptUrl = `${options.baseURL ?? readEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:8302"}/accept-invite?id=${invitation.id}`;
        await notify.orgInvitation.send({
          to: email,
          input: {
            inviterName: inviter.user.name || "Admin",
            organizationName: organization.name,
            url: acceptUrl,
          },
        });
      } else {
        console.log(`[auth:orgInvitation] to=${email} org=${organization.name}`);
      }
    },

    sendOTP: async ({ user, otp }) => {
      if (notify) {
        await notify.twoFactorOtp.send({
          to: user.email,
          input: { otp },
        });
      } else {
        console.log(`[auth:twoFactorOtp] to=${user.email} code=${otp}`);
      }
    },
  });
}

export type DataServiceAuth = ReturnType<typeof getAuth>;
export type { Auth, AuthSession, AuthUser };

// CLI: use packages/data-ops (`vpr auth:generate` / `vpr auth:info`).
// Runtime: getAuth(env.DATABASE) above.
