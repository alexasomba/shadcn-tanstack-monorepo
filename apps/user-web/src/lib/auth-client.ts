import { betterAuthReferralClient } from "@marinedotsh/better-auth-referral";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { inboxClient } from "better-inbox/client";

/**
 * End-user auth client: organization + **referral** + **inbox**.
 * Referral UX is user-web primary; inbox is shared with admin-web.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL as string | undefined,
  plugins: [organizationClient(), betterAuthReferralClient(), inboxClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
