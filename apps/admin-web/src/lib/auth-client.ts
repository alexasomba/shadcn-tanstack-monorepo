import { passkeyClient } from "@better-auth/passkey/client";
import {
  adminClient,
  organizationClient,
  inferAdditionalFields,
  usernameClient,
  phoneNumberClient,
  emailOTPClient,
  twoFactorClient,
  lastLoginMethodClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { inboxClient } from "better-inbox/client";
import type { Auth } from "data-ops";

/**
 * Admin console auth client: organization + **admin** + **inbox** + username + phone + emailOTP + twoFactor + passkey + lastLoginMethod.
 * Referral client stays on user-web; admins use the /referrals overview for stats.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL as string | undefined,
  plugins: [
    organizationClient(),
    adminClient(),
    inboxClient(),
    usernameClient(),
    phoneNumberClient(),
    emailOTPClient(),
    twoFactorClient(),
    passkeyClient(),
    lastLoginMethodClient(),
    inferAdditionalFields<Auth>(),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
