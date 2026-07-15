import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { z } from "zod";

import type { AppEnv } from "../../types";
import { WorkflowStatusResponseSchema, ErrorSchema } from "./schemas";

export const getWorkflowStatusRoute = createRoute({
  method: "get",
  path: "/instances/{id}/status",
  tags: ["Workflows"],
  summary: "Get status of a workflow instance",
  request: {
    params: z.object({
      id: z.string().openapi({
        param: { name: "id", in: "path" },
        example: "wf-user-123",
      }),
    }),
  },
  responses: {
    200: {
      description: "Workflow status retrieved",
      content: {
        "application/json": {
          schema: WorkflowStatusResponseSchema,
        },
      },
    },
    404: {
      description: "Workflow not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

interface WorkflowInstance {
  status: () => Promise<string | { status: string }>;
  retryCount?: number;
}

export const getWorkflowStatusHandler: RouteHandler<typeof getWorkflowStatusRoute, AppEnv> = async (
  c,
) => {
  const { id } = c.req.valid("param");
  const userWorkflow = c.env.USER_ONBOARDING_WORKFLOW;
  const orgWorkflow = c.env.ORG_ONBOARDING_WORKFLOW;

  let inst: WorkflowInstance | null = null;
  if (userWorkflow) {
    try {
      inst = await userWorkflow.get(id);
    } catch {
      // Ignore
    }
  }
  if (!inst && orgWorkflow) {
    try {
      inst = await orgWorkflow.get(id);
    } catch {
      // Ignore
    }
  }

  if (!inst) {
    return c.json({ success: false as const, error: "Workflow not found" }, 404);
  }

  try {
    const status = await inst.status();
    // Support both real status object { status: 'complete', etc. } and mock string
    const statusString = typeof status === "string" ? status : status.status || "unknown";
    return c.json(
      {
        success: true,
        status: statusString,
        retryCount: inst.retryCount || 0,
      },
      200,
    );
  } catch (err) {
    const errorObj = err as Record<string, unknown>;
    const msg = typeof errorObj.message === "string" ? errorObj.message : "";
    return c.json({ success: false as const, error: msg || "Failed to retrieve status" }, 500);
  }
};
