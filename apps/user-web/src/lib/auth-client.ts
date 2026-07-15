import { passkeyClient } from "@better-auth/passkey/client";
import { betterAuthReferralClient } from "@marinedotsh/better-auth-referral";
import {
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
 * End-user auth client: organization + **referral** + **inbox** + username + phone + emailOTP + twoFactor + passkey + lastLoginMethod.
 * Referral UX is user-web primary; inbox is shared with admin-web.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL as string | undefined,
  plugins: [
    organizationClient(),
    betterAuthReferralClient(),
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
