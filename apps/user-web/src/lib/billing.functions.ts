/**
 * Client-importable billing server functions (Paystack callback verify, etc.).
 * Keep createServerFn exports here — not in *.server.ts (import-protection).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import { getAuth } from "./auth";
import { getDatabase } from "./cloudflare-env";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type VerifyCallbackResult = {
  status: string;
  reference: string;
  data: {
    status: string;
    metadata?: JsonValue;
  };
};

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return undefined;
  }
}

function getErrorMessage(error: unknown): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Paystack verification failed.";
}

/**
 * Verify a Paystack checkout return (reference / trxref).
 * Retries briefly when Paystack has not yet indexed the reference.
 */
export const verifyPaystackCallbackServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ reference: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const auth = getAuth(getDatabase());
    let lastError: unknown;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        // better-auth-paystack plugin endpoint (not on core Better Auth API types).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (await (auth.api as any).verifyTransaction({
          body: { reference: data.reference },
          headers,
        })) as {
          status: string;
          reference: string;
          data: { status: string; metadata?: unknown };
        };

        return {
          status: result.status,
          reference: result.reference,
          data: {
            status: result.data.status,
            metadata: toJsonValue(result.data.metadata),
          },
        } satisfies VerifyCallbackResult;
      } catch (error: unknown) {
        lastError = error;
        const message = getErrorMessage(error);
        const shouldRetry = message.includes("Transaction reference not found") && attempt < 3;
        if (!shouldRetry) {
          throw new Error(message, { cause: error });
        }
        await new Promise((resolve) => {
          setTimeout(resolve, 750);
        });
      }
    }

    throw new Error(getErrorMessage(lastError));
  });
