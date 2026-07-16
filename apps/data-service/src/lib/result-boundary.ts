/**
 * Result → Sentry boundary for Hono handlers (M18).
 *
 * Expected domain failures (4xx) become breadcrumbs; reportable 5xx / DatabaseError
 * call Sentry.captureException so they are not lost when handlers return JSON
 * instead of throwing (Sentry Workers only auto-capture uncaught exceptions).
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/cloudflare/usage/
 */
import * as Sentry from "@sentry/cloudflare";
import {
  appErrorBody,
  appErrorCode,
  appErrorStatus,
  isReportableServerError,
} from "@workspace/result";
import type { AppError } from "@workspace/result";

export type ResultBoundaryContext = {
  /** Stable handler id for Sentry tags (e.g. "todos.list"). */
  operation?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

/**
 * Capture a Result.err (or thrown Error) according to reportability rules.
 */
export function captureResultError(
  error: AppError | Error,
  context: ResultBoundaryContext = {},
): void {
  const code = appErrorCode(error);
  const status = appErrorStatus(error);
  const tags = {
    result_boundary: "true",
    error_code: code,
    http_status: String(status),
    ...(context.operation ? { operation: context.operation } : {}),
    ...context.tags,
  };

  if (isReportableServerError(error)) {
    // CaptureContext: tags + extra. Handled Result.err paths would not reach
    // Sentry's uncaught hook; capture explicitly so 5xx domain errors surface.
    // @see https://docs.sentry.io/platforms/javascript/guides/cloudflare/usage/
    Sentry.captureException(error, {
      tags,
      extra: context.extra,
      level: "error",
    });
    return;
  }

  // Expected client errors: breadcrumb only (no Issue spam).
  Sentry.addBreadcrumb({
    category: "result",
    message: error.message || code,
    level: "warning",
    data: {
      ...tags,
      ...context.extra,
    },
  });
}

type ErrorJsonStatus = 400 | 401 | 404 | 409 | 500;

/**
 * Capture + shape body/status for a Result error. Callers return
 * `c.json(body, status)` with a **route-specific** status literal so Hono
 * OpenAPI `RouteHandler` types stay satisfied (Agents.md: avoid status unions).
 */
export function resultErrorResponse(
  error: AppError | Error,
  context: ResultBoundaryContext = {},
): { body: ReturnType<typeof appErrorBody>; status: ErrorJsonStatus } {
  captureResultError(error, context);
  return {
    body: appErrorBody(error),
    status: appErrorStatus(error) as ErrorJsonStatus,
  };
}
