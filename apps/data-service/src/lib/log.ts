/**
 * Structured JSON logging for Workers Observability.
 * Prefer this over string-template console.log.
 */

export type LogFields = Record<string, unknown>;

function serializeError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = error.message;
    if (typeof msg === "string") return msg;
  }
  return String(error);
}

export function logInfo(message: string, fields: LogFields = {}): void {
  console.info(JSON.stringify({ level: "info", message, ...fields }));
}

export function logWarn(message: string, fields: LogFields = {}): void {
  console.warn(JSON.stringify({ level: "warn", message, ...fields }));
}

export function logError(message: string, fields: LogFields = {}): void {
  const { error, ...rest } = fields;
  console.error(
    JSON.stringify({
      level: "error",
      message,
      ...rest,
      ...(error !== undefined ? { error: serializeError(error) } : {}),
    }),
  );
}
