import * as Sentry from "@sentry/tanstackstart-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/debug/sentry-test")({
  server: {
    handlers: {
      GET: async () => {
        const error = new Error("Sentry test exception");
        Sentry.captureException(error);
        throw error;
      },
    },
  },
});
