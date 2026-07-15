import { getAuth } from "../auth.js";
import type { AuthSession, AuthUser } from "../auth.js";
import type { AppContext } from "../types.js";

interface ApiKeyRequest extends Request {
  __apiKeyVerified?: boolean;
  __apiKeyUser?: AuthUser;
  __apiKeySession?: AuthSession;
}

interface BetterAuthApiWithApiKey {
  verifyApiKey: (options: { body: { key: string }; headers: Headers }) => Promise<{
    key?: {
      id: string;
      referenceId: string;
      prefix: string;
      key: string;
    };
  } | null>;
}

function extractApiKey(c: AppContext): string {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }
  return c.req.header("x-api-key")?.trim() || "";
}

function classifyError(error: unknown): {
  code: "FORBIDDEN" | "UNAUTHORIZED";
  message: string;
  status: 403 | 401;
} {
  const err = error as Record<string, unknown>;
  const message = typeof err.message === "string" ? err.message.toLowerCase() : "";
  const code =
    typeof err.code === "string"
      ? err.code.toUpperCase()
      : typeof err.status === "number" || typeof err.status === "string"
        ? String(err.status).toUpperCase()
        : "";

  const isForbidden =
    code.includes("LIMIT") ||
    code.includes("REVOKED") ||
    code === "403" ||
    message.includes("limit") ||
    message.includes("rate") ||
    message.includes("revoked") ||
    message.includes("forbidden");

  if (isForbidden) {
    return {
      code: "FORBIDDEN",
      message:
        typeof err.message === "string" ? err.message : "API key limits exceeded or key is revoked",
      status: 403,
    };
  }

  const isExpired = message.includes("expired") || code.includes("EXPIRED");
  return {
    code: "UNAUTHORIZED",
    message: isExpired ? "API key has expired" : "Invalid API key",
    status: 401,
  };
}

/**
 * Middleware to require and verify a developer API key.
 * Resolves the key using Better Auth, and populates the user and session context.
 */
export async function requireApiKey(c: AppContext, next: () => Promise<void>) {
  // Request-level de-duplication check to prevent multiple executions per request lifecycle.
  const rawReq = c.req.raw as unknown as ApiKeyRequest;
  if (rawReq.__apiKeyVerified) {
    if (rawReq.__apiKeyUser) {
      c.set("user", rawReq.__apiKeyUser);
      c.set("session", rawReq.__apiKeySession ?? null);
    }
    await next();
    return;
  }

  const key = extractApiKey(c);
  if (!key) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "API key is missing" },
      },
      401,
    );
  }

  try {
    const auth = getAuth(
      c.env.DATABASE,
      {
        baseURL: c.env.BETTER_AUTH_URL,
        secret: c.env.BETTER_AUTH_SECRET,
        RESEND_API_KEY: c.env.RESEND_API_KEY,
        EMAIL_FROM: c.env.EMAIL_FROM,
      },
      c.env,
    );

    // Call verifyApiKey using a sterile headers container (omitting cookies).
    const authApi = auth.api as unknown as BetterAuthApiWithApiKey;
    const result = await authApi.verifyApiKey({
      body: { key },
      headers: new Headers(),
    });

    if (!result || !result.key) {
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid API key" },
        },
        401,
      );
    }

    const sessionObj = { activeOrganizationId: result.key.referenceId } as unknown as AuthSession;

    // Cache the verification results on the raw request object
    rawReq.__apiKeyVerified = true;
    rawReq.__apiKeyUser = { id: result.key.referenceId } as unknown as AuthUser;
    rawReq.__apiKeySession = sessionObj;

    c.set("user", { id: result.key.referenceId } as unknown as AuthUser);
    // Sets the session with activeOrganizationId referencing the org ID associated with the API key
    c.set("session", sessionObj);
  } catch (error) {
    console.error("[data-service] API key verification failed:", error);
    const classification = classifyError(error);
    return c.json(
      {
        success: false,
        error: {
          code: classification.code,
          message: classification.message,
        },
      },
      classification.status,
    );
  }

  await next();
}
