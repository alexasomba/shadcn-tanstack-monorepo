import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

if (typeof window !== "undefined") {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      sendDefaultPii: true,
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}

export function getRouter() {
  const context = getContext();

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
