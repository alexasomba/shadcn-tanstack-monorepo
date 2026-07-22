import { paystackClient } from "@alexasomba/better-auth-paystack/client";
import { apiKeyClient } from "@better-auth/api-key/client";
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
 * End-user auth client: organization + api-key + paystack + referral + inbox + …
 *
 * `paystackClient` deep-types collapse Better Auth React client inference under TS.
 * Keep the root client as `any` for app-wide plugins; use `lib/paystack-client.ts`
 * for a narrow typed Paystack billing surface.
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
    inferAdditionalFields<Auth>(),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
