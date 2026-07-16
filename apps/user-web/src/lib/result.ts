/**
 * Start-edge Result unwrap with Sentry capture (M18).
 * Domain queries return Result; server fns report 5xx before throw.
 *
 * user-web instruments via @sentry/tanstackstart-react (not cloudflare SDK).
 * @see https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/
 */
import * as Sentry from "@sentry/tanstackstart-react";
import { unwrapResultWithCapture } from "@workspace/result";
import type { Result, ResultErrorCaptureContext } from "@workspace/result";

/**
 * Unwrap Result for createServerFn handlers. Reportable server errors go to Sentry
 * before the error is rethrown (TanStack Start error path).
 */
export function unwrapResultSentry<T, E extends Error>(
  result: Result<T, E>,
  context: ResultErrorCaptureContext = {},
): T {
  return unwrapResultWithCapture(
    result,
    (error, ctx) => {
      Sentry.captureException(error, {
        tags: ctx.tags,
        extra: ctx.extra,
        level: "error",
      });
    },
    context,
  );
}
