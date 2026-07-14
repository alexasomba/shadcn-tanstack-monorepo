import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { inboxClient } from "better-inbox/client";

/**
 * Admin console auth client: organization + **admin** + **inbox**.
 * Referral client stays on user-web; admins use the /referrals overview for stats.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL as string | undefined,
  plugins: [organizationClient(), adminClient(), inboxClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
