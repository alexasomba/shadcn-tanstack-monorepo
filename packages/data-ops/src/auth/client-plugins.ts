import { organizationClient } from "better-auth/client/plugins";

/**
 * Client plugins for `createAuthClient` in TanStack Start apps.
 * Keep in sync with `createBaseAuthPlugins()` on the server.
 */
export function createBaseAuthClientPlugins(): Array<ReturnType<typeof organizationClient>> {
  return [organizationClient()];
}
