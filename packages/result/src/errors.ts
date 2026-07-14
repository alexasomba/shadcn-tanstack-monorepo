import { TaggedError } from "better-result";

/** Shared domain errors for the monorepo (better-result TaggedError). */

export class UnauthorizedError extends TaggedError("UnauthorizedError")<{
  message: string;
  cause?: unknown;
}>() {}

export class NotFoundError extends TaggedError("NotFoundError")<{
  message: string;
  resource?: string;
  id?: string | number;
  cause?: unknown;
}>() {}

export class ValidationError extends TaggedError("ValidationError")<{
  message: string;
  field?: string;
  cause?: unknown;
}>() {}

export class DatabaseError extends TaggedError("DatabaseError")<{
  message: string;
  operation?: string;
  cause?: unknown;
}>() {}

export class ConflictError extends TaggedError("ConflictError")<{
  message: string;
  cause?: unknown;
}>() {}

/** Factories with sensible defaults. */
export const unauthorized = (message = "Unauthorized", cause?: unknown) =>
  new UnauthorizedError({ message, cause });

export const notFound = (resource: string, id?: string | number, cause?: unknown) =>
  new NotFoundError({
    message: id !== undefined ? `${resource} '${id}' not found` : `${resource} not found`,
    resource,
    id,
    cause,
  });

export const validation = (message: string, field?: string, cause?: unknown) =>
  new ValidationError({ message, field, cause });

export const databaseError = (operation: string, cause?: unknown, message?: string) =>
  new DatabaseError({
    message: message ?? `Database operation failed: ${operation}`,
    operation,
    cause,
  });

export const conflict = (message = "Conflict", cause?: unknown) =>
  new ConflictError({ message, cause });

/** Union of monorepo domain errors used at app boundaries. */
export type AppError =
  | UnauthorizedError
  | NotFoundError
  | ValidationError
  | DatabaseError
  | ConflictError;
