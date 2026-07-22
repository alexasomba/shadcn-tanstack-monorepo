import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { deleteRoute, deleteHandler } from "./delete";
import { listRoute, listHandler } from "./list";
import { presignedGetRoute, presignedGetHandler } from "./presigned-get";
import { presignedPutRoute, presignedPutHandler } from "./presigned-put";

export const r2App = new OpenAPIHono<AppEnv>();

r2App.openapi(presignedPutRoute, presignedPutHandler);
r2App.openapi(presignedGetRoute, presignedGetHandler);
r2App.openapi(deleteRoute, deleteHandler);
r2App.openapi(listRoute, listHandler);
