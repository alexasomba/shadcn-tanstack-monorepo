import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { seedHandler, seedRoute } from "./seed";
import { verifyHandler, verifyRoute } from "./verify";

export const databaseApp = new OpenAPIHono<AppEnv>();

databaseApp.openapi(seedRoute, seedHandler);
databaseApp.openapi(verifyRoute, verifyHandler);
