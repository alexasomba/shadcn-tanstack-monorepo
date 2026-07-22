import { getAuth } from "../auth.js";
import type { AuthSession, AuthUser } from "../auth.js";
import { logError } from "../lib/log.js";
import type { AppContext } from "../types.js";

/** Request-scoped cache on the fetch Request (not module globals). */
type ApiKeyRequestBag = {
  __apiKeyVerified?: boolean;
  __apiKeyUser?: AuthUser;
  __apiKeySession?: AuthSession;
};

type VerifiedApiKey = {
  id: string;
  referenceId: string;
  prefix?: string | null;
  configId?: string | null;
  key?: string;
  metadata?: unknown;
};

type VerifyApiKeyResult = {
  key?: VerifiedApiKey;
  valid?: boolean;
} | null;

type VerifyApiKeyFn = (options: {
  body: { key: string };
  headers: Headers;
}) => Promise<VerifyApiKeyResult>;

function getVerifyApiKey(auth: ReturnType<typeof getAuth>): VerifyApiKeyFn | null {
  const api = auth.api as { verifyApiKey?: VerifyApiKeyFn };
  return typeof api.verifyApiKey === "function" ? api.verifyApiKey.bind(api) : null;
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
  const err =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : ({} as Record<string, unknown>);
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

function requestBag(c: AppContext): ApiKeyRequestBag {
  // Hono/Workers Request is a single object for the request lifetime.
  return c.req.raw as Request & ApiKeyRequestBag;
}

function toApiKeyPrincipal(key: VerifiedApiKey): { user: AuthUser; session: AuthSession } {
  const isOrgKey = key.configId === "organization" || (key.prefix?.startsWith("sk_org_") ?? false);

  // Minimal principal for Hono context (only fields consumers read).
  const user = { id: isOrgKey ? `apikey:${key.id}` : key.referenceId } as AuthUser;
  const session = {
    activeOrganizationId: isOrgKey ? key.referenceId : null,
  } as unknown as AuthSession;

  return { user, session };
}

/**
 * Middleware to require and verify a developer API key.
 * Resolves the key using Better Auth, and populates the user and session context.
 */
export async function requireApiKey(c: AppContext, next: () => Promise<void>) {
  const bag = requestBag(c);
  if (bag.__apiKeyVerified) {
    if (bag.__apiKeyUser) {
      c.set("user", bag.__apiKeyUser);
      c.set("session", bag.__apiKeySession ?? null);
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

    const verifyApiKey = getVerifyApiKey(auth);
    if (!verifyApiKey) {
      logError("api_key.verify_unavailable", {});
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "API key verification unavailable" },
        },
        401,
      );
    }

    const result = await verifyApiKey({
      body: { key },
      headers: new Headers(),
    });

    if (!result || result.valid === false || !result.key) {
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid API key" },
        },
        401,
      );
    }

    const { user, session } = toApiKeyPrincipal(result.key);

    bag.__apiKeyVerified = true;
    bag.__apiKeyUser = user;
    bag.__apiKeySession = session;

    c.set("user", user);
    c.set("session", session);
  } catch (error) {
    logError("api_key.verification_failed", { error });
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
