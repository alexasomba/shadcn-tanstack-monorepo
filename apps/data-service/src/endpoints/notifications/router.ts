import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { queueNotificationHandler, queueNotificationRoute } from "./queue";
import { sendNotificationHandler, sendNotificationRoute } from "./send";

export const notificationsApp = new OpenAPIHono<AppEnv>();

notificationsApp.openapi(sendNotificationRoute, sendNotificationHandler);
notificationsApp.openapi(queueNotificationRoute, queueNotificationHandler);
