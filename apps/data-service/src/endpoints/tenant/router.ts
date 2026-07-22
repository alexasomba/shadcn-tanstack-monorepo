import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { resolveTenantHandler, resolveTenantRoute } from "./resolve";

export const tenantApp = new OpenAPIHono<AppEnv>();

tenantApp.openapi(resolveTenantRoute, resolveTenantHandler);
