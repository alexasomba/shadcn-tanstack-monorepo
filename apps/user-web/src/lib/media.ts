/**
 * Product media keys for R2 (avatars + org logos).
 * Objects are served via GET /api/media/*
 */

export const MEDIA_PREFIXES = ["avatars/", "orgs/"] as const;

export type MediaKind = "avatar" | "org-logo";

export const MEDIA_LIMITS = {
  avatar: {
    maxBytes: 1_000_000,
    kinds: ["image/jpeg", "image/png", "image/webp", "image/gif"] as const,
  },
  "org-logo": {
    maxBytes: 2_000_000,
    kinds: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"] as const,
  },
} as const;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export function isAllowedMediaKey(key: string): boolean {
  if (!key || key.includes("..") || key.startsWith("/")) return false;
  return MEDIA_PREFIXES.some((p) => key.startsWith(p));
}

export function mediaPublicPath(key: string): string {
  // Encode path segments but keep slashes for the splat route.
  return `/api/media/${key
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")}`;
}

export function buildAvatarKey(userId: string, contentType: string): string {
  const ext = EXT_BY_TYPE[contentType] ?? ".bin";
  return `avatars/${userId}/${crypto.randomUUID()}${ext}`;
}

export function buildOrgLogoKey(orgId: string, contentType: string): string {
  const ext = EXT_BY_TYPE[contentType] ?? ".bin";
  return `orgs/${orgId}/logo-${crypto.randomUUID()}${ext}`;
}

export function validateMediaUpload(
  kind: MediaKind,
  contentType: string,
  byteLength: number,
): { ok: true } | { ok: false; message: string } {
  const limits = MEDIA_LIMITS[kind];
  if (!(limits.kinds as readonly string[]).includes(contentType)) {
    return {
      ok: false,
      message: `Unsupported type ${contentType}. Allowed: ${limits.kinds.join(", ")}`,
    };
  }
  if (byteLength <= 0) {
    return { ok: false, message: "Empty file" };
  }
  if (byteLength > limits.maxBytes) {
    const mb = (limits.maxBytes / 1_000_000).toFixed(1);
    return { ok: false, message: `File too large (max ${mb} MB)` };
  }
  return { ok: true };
}

/** Decode base64 (optionally data-URL) to bytes. */
export function decodeBase64Payload(input: string): Uint8Array {
  const raw = input.includes(",") ? (input.split(",").pop() ?? "") : input;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
