import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import {
  TriggerUserSignupSchema,
  TriggerOrgCreationSchema,
  WorkflowTriggerResponseSchema,
  ErrorSchema,
} from "./schemas";

export const triggerUserSignupRoute = createRoute({
  method: "post",
  path: "/trigger/user-signup",
  tags: ["Workflows"],
  summary: "Trigger user signup onboarding workflow",
  request: {
    body: {
      content: {
        "application/json": {
          schema: TriggerUserSignupSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Workflow triggered",
      content: {
        "application/json": {
          schema: WorkflowTriggerResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid input",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    409: {
      description: "Duplicate workflow ID",
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

export const triggerUserSignupHandler: RouteHandler<typeof triggerUserSignupRoute, AppEnv> = async (
  c,
) => {
  const { userId, instanceId } = c.req.valid("json");

  if (!userId || userId.trim() === "") {
    return c.json({ success: false as const, error: "User ID is required" }, 400);
  }

  const workflow = c.env.USER_ONBOARDING_WORKFLOW;
  if (!workflow) {
    return c.json(
      { success: false as const, error: "USER_ONBOARDING_WORKFLOW binding not configured" },
      500,
    );
  }

  const id = instanceId || `wf-user-${userId}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    const existing = await workflow.get(id);
    const status = (await existing.status()) as unknown;
    if (status) {
      return c.json({ success: false as const, error: "Duplicate workflow ID" }, 409);
    }
  } catch {
    // Ignore
  }

  try {
    const instance = await workflow.create({
      id,
      params: { userId },
    });
    return c.json({ success: true, instanceId: instance.id }, 200);
  } catch (err) {
    const errorObj = err as Record<string, unknown>;
    const msg = typeof errorObj.message === "string" ? errorObj.message : "";
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("already run")
    ) {
      return c.json({ success: false as const, error: "Duplicate workflow ID" }, 409);
    }
    return c.json({ success: false as const, error: msg || "Failed to trigger workflow" }, 500);
  }
};

export const triggerOrgCreationRoute = createRoute({
  method: "post",
  path: "/trigger/org-creation",
  tags: ["Workflows"],
  summary: "Trigger organization creation onboarding workflow",
  request: {
    body: {
      content: {
        "application/json": {
          schema: TriggerOrgCreationSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Workflow triggered",
      content: {
        "application/json": {
          schema: WorkflowTriggerResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid input",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    409: {
      description: "Duplicate workflow ID",
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

export const triggerOrgCreationHandler: RouteHandler<
  typeof triggerOrgCreationRoute,
  AppEnv
> = async (c) => {
  const { orgId, instanceId } = c.req.valid("json");

  if (!orgId || orgId.trim() === "") {
    return c.json({ success: false as const, error: "Org ID is required" }, 400);
  }

  const workflow = c.env.ORG_ONBOARDING_WORKFLOW;
  if (!workflow) {
    return c.json(
      { success: false as const, error: "ORG_ONBOARDING_WORKFLOW binding not configured" },
      500,
    );
  }

  const id = instanceId || `wf-org-${orgId}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    const existing = await workflow.get(id);
    const status = (await existing.status()) as unknown;
    if (status) {
      return c.json({ success: false as const, error: "Duplicate workflow ID" }, 409);
    }
  } catch {
    // Ignore
  }

  try {
    const instance = await workflow.create({
      id,
      params: { orgId },
    });
    return c.json({ success: true, instanceId: instance.id }, 200);
  } catch (err) {
    const errorObj = err as Record<string, unknown>;
    const msg = typeof errorObj.message === "string" ? errorObj.message : "";
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("already run")
    ) {
      return c.json({ success: false as const, error: "Duplicate workflow ID" }, 409);
    }
    return c.json({ success: false as const, error: msg || "Failed to trigger workflow" }, 500);
  }
};
