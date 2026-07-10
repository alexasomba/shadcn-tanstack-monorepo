import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getAuth } from "./auth";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  // @ts-expect-error - vinxi/http is a platform-specific import
  const { getEvent } = await import("vinxi/http");
  const db = getEvent()?.context?.cloudflare?.env?.DB;
  const auth = getAuth(db);
  return await auth.api.getSession({ headers });
});

export const ensureSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  // @ts-expect-error - vinxi/http is a platform-specific import
  const { getEvent } = await import("vinxi/http");
  const db = getEvent()?.context?.cloudflare?.env?.DB;
  const auth = getAuth(db);
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
});
