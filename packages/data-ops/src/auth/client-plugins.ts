import { betterAuthReferralClient } from "@marinedotsh/better-auth-referral";
import type { BetterAuthClientPlugin } from "better-auth/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { inboxClient } from "better-inbox/client";

/**
 * Shared base client plugins (organization + inbox).
 * Inline in app `auth-client.ts` for full endpoint inference.
 */
export function createBaseAuthClientPlugins(): Array<BetterAuthClientPlugin> {
  return [organizationClient(), inboxClient()];
}

/** End-user app: base + referral (invite codes live on user-web). */
export function createUserAuthClientPlugins(): Array<BetterAuthClientPlugin> {
  return [organizationClient(), betterAuthReferralClient(), inboxClient()];
}

/** Admin console: base + admin (no referral client; use /referrals overview instead). */
export function createAdminAuthClientPlugins(): Array<BetterAuthClientPlugin> {
  return [organizationClient(), adminClient(), inboxClient()];
}
