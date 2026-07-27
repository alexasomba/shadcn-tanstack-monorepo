import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

import { canAccessAdminConsole } from "./admin";
import { readSessionFromRequest } from "./auth.server";

/**
 * Server-function middleware: require a Better Auth session on the RPC itself.
 * Route `beforeLoad` is UX only — this is the data boundary (start-core/server-functions).
 */
export const requireAuthMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await readSessionFromRequest();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: "/dashboard" },
      });
    }
    return next({
      context: {
        session: session.session,
        user: session.user,
      },
    });
  },
);

/**
 * Require session + admin role (or bootstrap adminUserIds).
 * Use on server functions that perform privileged admin work beyond Better Auth's own checks.
 */
export const requireAdminMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await readSessionFromRequest();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: "/dashboard" },
      });
    }
    if (!canAccessAdminConsole(session.user, session.session)) {
      throw redirect({
        to: "/login",
        search: { redirect: "/dashboard", error: "admin_required" },
      });
    }
    return next({
      context: {
        session: session.session,
        user: session.user,
      },
    });
  },
);
