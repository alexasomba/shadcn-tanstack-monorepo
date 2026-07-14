import { betterAuthReferral } from "@marinedotsh/better-auth-referral";
import type { BetterAuthPlugin } from "better-auth";
import { admin } from "better-auth/plugins";
import { organization } from "better-auth/plugins/organization";
import { twoFactor } from "better-auth/plugins/two-factor";
import { inbox } from "better-inbox";

export type AuthPluginsOptions = {
  sendInvitationEmail?: (data: {
    email: string;
    organization: { name: string };
    inviter: { user: { name: string } };
    invitation: { id: string };
  }) => Promise<void>;
  sendOTP?: (data: { user: { email: string }; otp: string }) => Promise<void>;
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

/** Comma-separated user IDs that always have full admin powers (see Better Auth admin plugin). */
export function readAdminUserIds(): Array<string> {
  const raw = readEnv("BETTER_AUTH_ADMIN_USER_IDS") ?? readEnv("ADMIN_USER_IDS");
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Server plugins shared by all Workers (web apps append tanstackStartCookies last).
 * Re-run `vpr auth:generate` after changing plugins.
 *
 * | Plugin   | Primary UI        |
 * |----------|-------------------|
 * | org      | both apps         |
 * | referral | user-web (admin has read-only stats) |
 * | admin    | admin-web         |
 * | inbox    | both apps         |
 */
export function createBaseAuthPlugins(options: AuthPluginsOptions = {}): Array<BetterAuthPlugin> {
  return [
    organization({
      allowUserToCreateOrganization: true,
      membershipLimit: 50,
      organizationLimit: 5,
      ...(options.sendInvitationEmail ? { sendInvitationEmail: options.sendInvitationEmail } : {}),
    }),
    twoFactor({
      issuer: "Data Service",
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          if (options.sendOTP) {
            await options.sendOTP({ user, otp });
          } else {
            console.log(`[auth:otp] to=${user.email} code=${otp}`);
          }
        },
      },
    }),
    betterAuthReferral({
      maskReferredUserEmail: true,
    }),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      adminUserIds: readAdminUserIds(),
      impersonationSessionDuration: 60 * 60,
      defaultBanReason: "No reason",
      bannedUserMessage:
        "You have been banned from this application. Please contact support if you believe this is an error.",
    }),
    inbox(),
  ];
}
