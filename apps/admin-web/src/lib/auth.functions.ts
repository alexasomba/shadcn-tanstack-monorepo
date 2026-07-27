import { createServerFn } from "@tanstack/react-start";

import { requireAuthMiddleware } from "./auth.middleware";
import { readSessionFromRequest } from "./auth.server";

/** Public: current session or null (safe for login/`beforeLoad` UX). */
export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  return await readSessionFromRequest();
});

/**
 * Private: require a session on the RPC endpoint.
 * Prefer attaching `requireAuthMiddleware` to domain server functions.
 */
export const ensureSession = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    return { user: context.user, session: context.session };
  });
