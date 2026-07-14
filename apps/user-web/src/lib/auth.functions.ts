import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getAuth } from "./auth";
import { getDatabase } from "./cloudflare-env";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const auth = getAuth(getDatabase());
  return await auth.api.getSession({ headers });
});

export const ensureSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const auth = getAuth(getDatabase());
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
});
