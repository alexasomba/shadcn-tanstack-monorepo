/**
 * Server-only session helpers (convention: *.server.ts).
 * Call only from createServerFn handlers / middleware `.server()` — not from components.
 */
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getAuth } from "./auth";
import { getDatabase } from "./cloudflare-env";

export async function readSessionFromRequest() {
  const headers = getRequestHeaders();
  const auth = getAuth(getDatabase());
  return await auth.api.getSession({ headers });
}
