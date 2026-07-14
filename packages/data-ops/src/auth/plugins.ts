import { betterAuthReferral } from "@marinedotsh/better-auth-referral";
import type { BetterAuthPlugin } from "better-auth";
import { admin } from "better-auth/plugins";
import { organization } from "better-auth/plugins/organization";
import { inbox } from "better-inbox";

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
export function createBaseAuthPlugins(): Array<BetterAuthPlugin> {
  return [
    organization({
      allowUserToCreateOrganization: true,
      membershipLimit: 50,
      organizationLimit: 5,
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
