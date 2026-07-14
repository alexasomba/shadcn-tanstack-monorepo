/**
 * @workspace/result — monorepo Result layer on top of better-result.
 */
export {
  Err,
  Ok,
  Panic,
  Result,
  ResultDeserializationError,
  TaggedError,
  UnhandledException,
  isPanic,
  isTaggedError,
  matchError,
  matchErrorPartial,
  panic,
  type InferErr,
  type InferOk,
  type SerializedErr,
  type SerializedOk,
  type SerializedResult,
  type TaggedErrorClass,
  type TaggedErrorInstance,
} from "better-result";

export {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  DatabaseError,
  ConflictError,
  unauthorized,
  notFound,
  validation,
  databaseError,
  conflict,
  type AppError,
} from "./errors";

export { unwrapResult, appErrorStatus, appErrorCode, appErrorBody, tryAsync } from "./unwrap";
