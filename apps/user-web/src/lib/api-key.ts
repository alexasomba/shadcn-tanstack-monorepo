/** API key helpers — mirror Better Auth `@better-auth/api-key` configs in data-ops. */

export type ApiKeyConfigId = "user" | "organization";

export type ApiKeyRecord = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  referenceId: string;
  configId?: string | null;
  enabled: boolean | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  remaining?: number | null;
  rateLimitEnabled?: boolean | null;
  rateLimitMax?: number | null;
  rateLimitTimeWindow?: number | null;
  requestCount?: number | null;
  metadata?: unknown;
  /** Only present on create response — never on list/get. */
  key?: string;
};

export type ApiKeyListResult = {
  apiKeys: ApiKeyRecord[];
  total: number;
  limit?: number;
  offset?: number;
};

/** Keep in sync with `apiKey([...])` configs in packages/data-ops/src/auth/plugins.ts */
export const API_KEY_CONFIG = {
  user: {
    configId: "user" as const,
    label: "Personal",
    description: "Scoped to your user account.",
    defaultPrefix: "sk_user_",
  },
  organization: {
    configId: "organization" as const,
    label: "Organization",
    description: "Scoped to the active organization (recommended for data-service).",
    defaultPrefix: "sk_org_",
  },
} as const;

export const EXPIRES_OPTIONS: { label: string; seconds: number | null }[] = [
  { label: "Never", seconds: null },
  { label: "7 days", seconds: 60 * 60 * 24 * 7 },
  { label: "30 days", seconds: 60 * 60 * 24 * 30 },
  { label: "90 days", seconds: 60 * 60 * 24 * 90 },
  { label: "1 year", seconds: 60 * 60 * 24 * 365 },
];

export function clientErrorMessage(
  error: { message?: string | null; statusText?: string } | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;
  return error.message || error.statusText || fallback;
}

export function formatKeyPreview(key: ApiKeyRecord): string {
  if (key.start) return `${key.start}…`;
  if (key.prefix) return `${key.prefix}…`;
  return `${key.id.slice(0, 8)}…`;
}

export function formatExpires(expiresAt: Date | string | null | undefined): string {
  if (!expiresAt) return "Never";
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function curlExample(fullKey: string): string {
  return `curl -H "Authorization: Bearer ${fullKey}" \\
  https://your-data-service.example/todos

# or
curl -H "x-api-key: ${fullKey}" \\
  https://your-data-service.example/todos`;
}
