import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { crashWorkflowRoute, crashWorkflowHandler } from "./crash";
import { retryWorkflowRoute, retryWorkflowHandler } from "./retry";
import { getWorkflowStatusRoute, getWorkflowStatusHandler } from "./status";
import { getWorkflowStepsRoute, getWorkflowStepsHandler } from "./steps";
import {
  triggerUserSignupRoute,
  triggerUserSignupHandler,
  triggerOrgCreationRoute,
  triggerOrgCreationHandler,
} from "./trigger";

export const workflowsApp = new OpenAPIHono<AppEnv>();

workflowsApp.openapi(triggerUserSignupRoute, triggerUserSignupHandler);
workflowsApp.openapi(triggerOrgCreationRoute, triggerOrgCreationHandler);
workflowsApp.openapi(getWorkflowStatusRoute, getWorkflowStatusHandler);
workflowsApp.openapi(getWorkflowStepsRoute, getWorkflowStepsHandler);
workflowsApp.openapi(retryWorkflowRoute, retryWorkflowHandler);
workflowsApp.openapi(crashWorkflowRoute, crashWorkflowHandler);
