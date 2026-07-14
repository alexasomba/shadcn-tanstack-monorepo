import { createAuthClient } from "better-auth/react";
import { createBaseAuthClientPlugins } from "data-ops";

/**
 * Browser auth client. baseURL defaults to same origin (`/api/auth`).
 * Includes organization client plugin (matches server base plugins).
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL as string | undefined,
  plugins: createBaseAuthClientPlugins(),
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
