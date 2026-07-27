import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { getEntitlementsRoute, getEntitlementsHandler } from "./get";

export const entitlementsApp = new OpenAPIHono<AppEnv>();

entitlementsApp.openapi(getEntitlementsRoute, getEntitlementsHandler);
