import { paystackClient } from "@alexasomba/better-auth-paystack/client";
import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { betterAuthReferralClient } from "@marinedotsh/better-auth-referral";
import type { BetterAuthClientPlugin } from "better-auth/client";
import {
  adminClient,
  organizationClient,
  usernameClient,
  phoneNumberClient,
  emailOTPClient,
  twoFactorClient,
  lastLoginMethodClient,
} from "better-auth/client/plugins";
import { inboxClient } from "better-inbox/client";

/** Shared org client options — keep in sync with server `organization({ teams })`. */
export const organizationClientOptions = {
  teams: {
    enabled: true as const,
  },
};

/**
 * Shared base client plugins (organization + api-key + inbox + username + phone + emailOTP + twoFactor + passkey + lastLoginMethod).
 * Inline in app `auth-client.ts` for full endpoint inference.
 */
export function createBaseAuthClientPlugins(): Array<BetterAuthClientPlugin> {
  return [
    organizationClient(organizationClientOptions),
    apiKeyClient(),
    paystackClient({ subscription: true }),
    inboxClient(),
    usernameClient(),
    phoneNumberClient(),
    emailOTPClient(),
    twoFactorClient({
      twoFactorPage: "/two-factor",
    }),
    passkeyClient(),
    lastLoginMethodClient(),
  ];
}

/** End-user app: base + referral (invite codes live on user-web). */
export function createUserAuthClientPlugins(): Array<BetterAuthClientPlugin> {
  return [
    organizationClient(organizationClientOptions),
    apiKeyClient(),
    paystackClient({ subscription: true }),
    betterAuthReferralClient(),
    inboxClient(),
    usernameClient(),
    phoneNumberClient(),
    emailOTPClient(),
    twoFactorClient({
      twoFactorPage: "/two-factor",
    }),
    passkeyClient(),
    lastLoginMethodClient(),
  ];
}

/** Admin console: base + admin (no referral client; use /referrals overview instead). */
export function createAdminAuthClientPlugins(): Array<BetterAuthClientPlugin> {
  return [
    organizationClient(organizationClientOptions),
    apiKeyClient(),
    paystackClient({ subscription: true }),
    adminClient(),
    inboxClient(),
    usernameClient(),
    phoneNumberClient(),
    emailOTPClient(),
    twoFactorClient({
      twoFactorPage: "/two-factor",
    }),
    passkeyClient(),
    lastLoginMethodClient(),
  ];
}
