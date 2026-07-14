import { Result } from "better-result";

import type { AppError } from "./errors";
import {
  ConflictError,
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

/**
 * Unwrap Ok or throw the Err value.
 * Use inside `createServerFn` handlers after domain work returns Result.
 */
export function unwrapResult<T, E extends Error>(result: Result<T, E>): T {
  if (Result.isOk(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Map common AppError tags to HTTP-ish status for logging or API adapters.
 */
export function appErrorStatus(error: AppError | Error): number {
  if (UnauthorizedError.is(error)) return 401;
  if (NotFoundError.is(error)) return 404;
  if (ValidationError.is(error)) return 400;
  if (ConflictError.is(error)) return 409;
  if (DatabaseError.is(error)) return 500;
  return 500;
}

/**
 * Stable machine code for API error bodies (NOT_FOUND, VALIDATION, …).
 */
export function appErrorCode(error: AppError | Error): string {
  if (UnauthorizedError.is(error)) return "UNAUTHORIZED";
  if (NotFoundError.is(error)) return "NOT_FOUND";
  if (ValidationError.is(error)) return "VALIDATION";
  if (ConflictError.is(error)) return "CONFLICT";
  if (DatabaseError.is(error)) return "DATABASE";
  if ("_tag" in error && typeof (error as { _tag: unknown })._tag === "string") {
    return String((error as { _tag: string })._tag)
      .replace(/Error$/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toUpperCase();
  }
  return "ERROR";
}

/** Standard JSON error body for Hono / OpenAPI `ErrorSchema`. */
export function appErrorBody(error: AppError | Error) {
  return {
    success: false as const,
    error: {
      code: appErrorCode(error),
      message: error.message || "Unknown error",
    },
  };
}

/** Run async work as Result with a mapped error type. */
export async function tryAsync<T, E>(
  fn: () => Promise<T>,
  mapError: (cause: unknown) => E,
): Promise<Result<T, E>> {
  return Result.tryPromise({
    try: fn,
    catch: mapError,
  });
}
