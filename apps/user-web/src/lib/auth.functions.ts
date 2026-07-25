import { createServerFn } from "@tanstack/react-start";

import { readSessionFromRequest } from "./auth.server";

/** Public: current session or null (safe for login/`beforeLoad` UX). */
export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  return await readSessionFromRequest();
});
