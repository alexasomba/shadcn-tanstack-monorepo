import type { ApiKeyConfigId, ApiKeyListResult, ApiKeyRecord } from "#/lib/api-key";
import { clientErrorMessage } from "#/lib/api-key";
/**
 * Thin wrappers around Better Auth `authClient.apiKey.*` — no custom key store.
 */
import { authClient } from "#/lib/auth-client";

async function unwrap<T>(
  promise: Promise<{ data: T; error: { message?: string | null; statusText?: string } | null }>,
  fallback: string,
): Promise<T> {
  const res = await promise;
  if (res.error) {
    throw new Error(clientErrorMessage(res.error, fallback));
  }
  return res.data;
}

export async function listApiKeys(input?: {
  configId?: ApiKeyConfigId;
  organizationId?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiKeyListResult> {
  const data = await unwrap(
    authClient.apiKey.list({
      query: {
        ...(input?.configId ? { configId: input.configId } : {}),
        ...(input?.organizationId ? { organizationId: input.organizationId } : {}),
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    }),
    "Could not list API keys",
  );
  return data as ApiKeyListResult;
}

export async function createApiKey(input: {
  name: string;
  configId: ApiKeyConfigId;
  organizationId?: string;
  /** Expiration in seconds (Better Auth create body). null = never. */
  expiresIn?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<ApiKeyRecord> {
  const data = await unwrap(
    authClient.apiKey.create({
      name: input.name,
      configId: input.configId,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      expiresIn: input.expiresIn ?? null,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
    "Could not create API key",
  );
  return data as ApiKeyRecord;
}

export async function deleteApiKey(input: {
  keyId: string;
  configId: ApiKeyConfigId;
}): Promise<void> {
  await unwrap(
    authClient.apiKey.delete({
      keyId: input.keyId,
      configId: input.configId,
    }),
    "Could not delete API key",
  );
}

export async function updateApiKeyName(input: {
  keyId: string;
  configId: ApiKeyConfigId;
  name: string;
}): Promise<ApiKeyRecord> {
  const data = await unwrap(
    authClient.apiKey.update({
      keyId: input.keyId,
      configId: input.configId,
      name: input.name,
    }),
    "Could not update API key",
  );
  return data as ApiKeyRecord;
}
