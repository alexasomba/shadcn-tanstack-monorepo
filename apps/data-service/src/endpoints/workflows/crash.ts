import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import * as Sentry from "@sentry/cloudflare";
import { z } from "zod";

import type { AppEnv } from "../../types";
import { ErrorSchema } from "./schemas";

export const crashWorkflowRoute = createRoute({
  method: "post",
  path: "/instances/{id}/crash",
  tags: ["Workflows"],
  summary: "Simulate a crash in a workflow step",
  request: {
    params: z.object({
      id: z.string().openapi({
        param: { name: "id", in: "path" },
        example: "wf-user-123",
      }),
    }),
  },
  responses: {
    500: {
      description: "Workflow step crashed error",
      content: {
        "application/json": {
          schema: ErrorSchema,
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
  },
});

interface WorkflowInstance {
  statusState?: string;
  stepsRun?: Array<{ name: string; status: string; error?: string }>;
}

export const crashWorkflowHandler: RouteHandler<typeof crashWorkflowRoute, AppEnv> = async (c) => {
  const { id } = c.req.valid("param");
  const userWorkflow = c.env.USER_ONBOARDING_WORKFLOW;
  const orgWorkflow = c.env.ORG_ONBOARDING_WORKFLOW;

  let inst: WorkflowInstance | null = null;
  if (userWorkflow) {
    try {
      inst = (await userWorkflow.get(id)) as WorkflowInstance | null;
    } catch {
      // Ignore
    }
  }
  if (!inst && orgWorkflow) {
    try {
      inst = (await orgWorkflow.get(id)) as WorkflowInstance | null;
    } catch {
      // Ignore
    }
  }

  if (!inst) {
    return c.json({ success: false as const, error: "Workflow not found" }, 404);
  }

  const crashError = new Error("Workflow step crashed");

  // Capture exception via Sentry, mapping workflow metadata tags
  Sentry.captureException(crashError, {
    tags: {
      workflowInstanceId: id,
    },
  });

  if (typeof inst.statusState !== "undefined") {
    inst.statusState = "failed";
  }
  if (inst.stepsRun) {
    inst.stepsRun.push({ name: "crash_step", status: "failure", error: crashError.message });
  }

  return c.json({ success: false as const, error: crashError.message }, 500);
};
