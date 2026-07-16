/**
 * Session-backed media uploads to R2 (M16).
 * Avatars: all signed-in users. Org logos: require plan feature `r2`.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createDatabase, hasFeature, resolveEntitlements } from "data-ops";
import { z } from "zod";

import { getAuth } from "./auth";
import { requireAuthMiddleware } from "./auth.middleware";
import { getDatabase, getR2Bucket } from "./cloudflare-env";
import {
  buildAvatarKey,
  buildOrgLogoKey,
  decodeBase64Payload,
  mediaPublicPath,
  validateMediaUpload,
} from "./media";

const uploadSchema = z.object({
  contentType: z.string().min(1),
  /** Base64 or data-URL payload */
  fileBase64: z.string().min(1),
  fileName: z.string().optional(),
});

const orgLogoSchema = uploadSchema.extend({
  organizationId: z.string().min(1),
});

function requireBucket(): R2Bucket {
  const bucket = getR2Bucket();
  if (!bucket) {
    throw new Error("R2_BUCKET is not configured on this Worker");
  }
  return bucket;
}

export const uploadUserAvatar = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator((input: unknown) => uploadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const bytes = decodeBase64Payload(data.fileBase64);
    const check = validateMediaUpload("avatar", data.contentType, bytes.byteLength);
    if (!check.ok) {
      throw new Error(check.message);
    }

    const key = buildAvatarKey(context.user.id, data.contentType);
    const bucket = requireBucket();
    await bucket.put(key, bytes, {
      httpMetadata: { contentType: data.contentType },
      customMetadata: {
        userId: context.user.id,
        kind: "avatar",
      },
    });

    const imageUrl = mediaPublicPath(key);
    const headers = getRequestHeaders();
    const auth = getAuth(getDatabase());
    // Better Auth update user profile image
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (auth.api as any).updateUser({
      body: { image: imageUrl },
      headers,
    });

    return { key, url: imageUrl };
  });

export const uploadOrgLogo = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator((input: unknown) => orgLogoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = createDatabase(getDatabase());
    const entitlements = await resolveEntitlements(db, data.organizationId);
    if (!hasFeature(entitlements, "r2")) {
      throw new Error(
        `Organization logos require a plan with R2 storage (current: ${entitlements.displayName}). Upgrade at /pricing.`,
      );
    }

    const bytes = decodeBase64Payload(data.fileBase64);
    const check = validateMediaUpload("org-logo", data.contentType, bytes.byteLength);
    if (!check.ok) {
      throw new Error(check.message);
    }

    const key = buildOrgLogoKey(data.organizationId, data.contentType);
    const bucket = requireBucket();
    await bucket.put(key, bytes, {
      httpMetadata: { contentType: data.contentType },
      customMetadata: {
        organizationId: data.organizationId,
        uploadedBy: context.user.id,
        kind: "org-logo",
      },
    });

    const logoUrl = mediaPublicPath(key);
    return {
      key,
      url: logoUrl,
      organizationId: data.organizationId,
    };
  });
