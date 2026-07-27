import { createFileRoute } from "@tanstack/react-router";

import { getR2Bucket } from "#/lib/cloudflare-env";
import { isAllowedMediaKey } from "#/lib/media";

/**
 * Stream product media from R2.
 * Keys must be under avatars/ or orgs/ (see lib/media.ts).
 */
export const Route = createFileRoute("/api/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = params._splat ?? "";
        const key = splat
          .split("/")
          .map((s) => {
            try {
              return decodeURIComponent(s);
            } catch {
              return s;
            }
          })
          .join("/");

        if (!isAllowedMediaKey(key)) {
          return new Response("Invalid media key", { status: 400 });
        }

        const bucket = getR2Bucket();
        if (!bucket) {
          return new Response("R2 not configured", { status: 503 });
        }

        const object = await bucket.get(key);
        if (!object) {
          return new Response("Not found", { status: 404 });
        }

        const headers = new Headers();
        const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
        headers.set("Content-Type", contentType);
        headers.set("Cache-Control", "public, max-age=86400, immutable");
        if (object.httpEtag) {
          headers.set("ETag", object.httpEtag);
        }

        return new Response(object.body, { status: 200, headers });
      },
    },
  },
});
