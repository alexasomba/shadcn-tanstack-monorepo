import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { z } from "zod";

import type { AppEnv } from "../../types";
import { WorkflowStepsResponseSchema, ErrorSchema } from "./schemas";

export const getWorkflowStepsRoute = createRoute({
  method: "get",
  path: "/instances/{id}/steps",
  tags: ["Workflows"],
  summary: "Get run steps of a workflow instance",
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
      description: "Workflow steps retrieved",
      content: {
        "application/json": {
          schema: WorkflowStepsResponseSchema,
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
  stepsRun?: Array<{ name: string; status: "success" | "failure"; error?: string }>;
  status?: () => Promise<
    | string
    | {
        status: string;
        steps?: Array<{ name: string; status: "success" | "failure"; error?: string }>;
      }
  >;
}

async function findWorkflowInstance(
  id: string,
  userWorkflow?: { get: (id: string) => Promise<unknown> },
  orgWorkflow?: { get: (id: string) => Promise<unknown> },
): Promise<WorkflowInstance | null> {
  if (userWorkflow) {
    try {
      return (await userWorkflow.get(id)) as WorkflowInstance;
    } catch {
      // Ignore
    }
  }
  if (orgWorkflow) {
    try {
      return (await orgWorkflow.get(id)) as WorkflowInstance;
    } catch {
      // Ignore
    }
  }
  return null;
}

async function getStepsFromInstance(inst: WorkflowInstance): Promise<WorkflowInstance["stepsRun"]> {
  let stepsRun = inst.stepsRun || [];
  if (typeof inst.status === "function" && stepsRun.length === 0) {
    const status = await inst.status();
    if (typeof status === "object" && "steps" in status && status.steps) {
      stepsRun = status.steps;
    }
  }
  return stepsRun;
}

export const getWorkflowStepsHandler: RouteHandler<typeof getWorkflowStepsRoute, AppEnv> = async (
  c,
) => {
  const { id } = c.req.valid("param");
  const inst = await findWorkflowInstance(
    id,
    c.env.USER_ONBOARDING_WORKFLOW,
    c.env.ORG_ONBOARDING_WORKFLOW,
  );

  if (!inst) {
    return c.json({ success: false as const, error: "Workflow not found" }, 404);
  }

  try {
    const stepsRun = await getStepsFromInstance(inst);
    return c.json(
      {
        success: true,
        stepsRun: stepsRun || [],
      },
      200,
    );
  } catch (err) {
    const errorObj = err as Record<string, unknown>;
    const msg = typeof errorObj.message === "string" ? errorObj.message : "";
    return c.json({ success: false as const, error: msg || "Failed to retrieve steps" }, 500);
  }
};
