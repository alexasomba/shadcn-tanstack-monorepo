import type { BetterAuthPlugin } from "better-auth";
import { organization } from "better-auth/plugins/organization";

/**
 * Server plugins shared by all Workers (web apps append tanstackStartCookies last).
 * Re-run `vpr auth:generate` after changing plugins.
 */
export function createBaseAuthPlugins(): Array<BetterAuthPlugin> {
  return [
    organization({
      allowUserToCreateOrganization: true,
      membershipLimit: 50,
      organizationLimit: 5,
    }),
  ];
}
