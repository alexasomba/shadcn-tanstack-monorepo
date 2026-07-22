import { paystackClient } from "@alexasomba/better-auth-paystack/client";
import { apiKeyClient } from "@better-auth/api-key/client";
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
 * Admin console auth client.
 * Root client stays `any` (paystackClient collapses inference); use a narrow
 * Paystack cast where billing APIs are needed.
 */
// paystackClient collapses Better Auth client inference; keep app-usable surface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export const authClient: any = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL as string | undefined,
  plugins: [
    organizationClient({
      teams: { enabled: true },
    }),
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
    inferAdditionalFields<Auth>(),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
