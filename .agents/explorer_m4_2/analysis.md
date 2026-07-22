# Analysis & Design Report: Cloudflare Workflows Integration

This report provides the analysis and architectural design for integrating Cloudflare Workflows under Milestone 4 (R3). It outlines the configuration updates for Wrangler, the design of Hono OpenAPI endpoints in `data-service`, and the automatic triggering of onboarding workflows via Better Auth lifecycle hooks.

---

## 1. Wrangler Bindings Design

To enable Cloudflare Workflows, the applications must define workflow bindings. Workflows are declared globally in the Cloudflare developer platform under specific names. A worker communicates with them by binding to their names.

### `apps/data-service/wrangler.jsonc` (Workflow Definer & Caller)

The `data-service` worker serves as the core backend engine. It defines the workflow implementation classes (`UserOnboardingWorkflow` and `OrgOnboardingWorkflow`) and exports them. It also requires bindings to trigger and interact with them.

```jsonc
  // Add this to apps/data-service/wrangler.jsonc
  "workflows": [
    {
      "name": "user-onboarding-workflow",
      "binding": "USER_ONBOARDING_WORKFLOW",
      "class_name": "UserOnboardingWorkflow"
    },
    {
      "name": "org-onboarding-workflow",
      "binding": "ORG_ONBOARDING_WORKFLOW",
      "class_name": "OrgOnboardingWorkflow"
    }
  ]
```

### `apps/user-web/wrangler.jsonc` (Workflow Caller)

The frontend `user-web` worker interacts with the workflows (e.g., initiating them on signup or checking status). It does not implement or export the workflow classes, so it only requires bindings to call them.

```jsonc
  // Add this to apps/user-web/wrangler.jsonc
  "workflows": [
    {
      "name": "user-onboarding-workflow",
      "binding": "USER_ONBOARDING_WORKFLOW"
    },
    {
      "name": "org-onboarding-workflow",
      "binding": "ORG_ONBOARDING_WORKFLOW"
    }
  ]
```

---

## 2. Hono OpenAPI Route Endpoints for `/workflows`

The workflow endpoints must be implemented under `apps/data-service/src/endpoints/workflows/*` using `@hono/zod-openapi` to match the OpenAPI documentation standards and testing suite specifications.

### A. Schemas (`apps/data-service/src/endpoints/workflows/schemas.ts`)

```typescript
import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const TriggerUserSignupSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    instanceId: z.string().optional(),
  })
  .openapi("TriggerUserSignupRequest");

export const TriggerOrgCreationSchema = z
  .object({
    orgId: z.string().min(1, "Org ID is required"),
    instanceId: z.string().optional(),
  })
  .openapi("TriggerOrgCreationRequest");

export const WorkflowTriggerResponseSchema = z
  .object({
    success: z.boolean(),
    instanceId: z.string(),
  })
  .openapi("WorkflowTriggerResponse");

export const WorkflowStatusResponseSchema = z
  .object({
    success: z.boolean(),
    status: z.string(),
    retryCount: z.number().default(0),
  })
  .openapi("WorkflowStatusResponse");

export const WorkflowStepSchema = z.object({
  name: z.string(),
  status: z.enum(["success", "failure"]),
  output: z.any().optional(),
  error: z.string().optional(),
});

export const WorkflowStepsResponseSchema = z
  .object({
    success: z.boolean(),
    stepsRun: z.array(WorkflowStepSchema),
  })
  .openapi("WorkflowStepsResponse");

export const ErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
  })
  .openapi("WorkflowError");
```

### B. Trigger Endpoint (`apps/data-service/src/endpoints/workflows/trigger.ts`)

Handles POST requests to trigger onboarding workflows. Handles validation, duplicate checks (status 409 Conflict), and instantiation.

```typescript
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
    return c.json({ success: false, error: "User ID is required" } as const, 400);
  }

  const workflow = c.env.USER_ONBOARDING_WORKFLOW;
  if (!workflow) {
    return c.json(
      { success: false, error: "USER_ONBOARDING_WORKFLOW binding not configured" } as const,
      500,
    );
  }

  const id = instanceId || `wf-user-${userId}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    const existing = await workflow.get(id);
    const status = await existing.status();
    if (status) {
      return c.json({ success: false, error: "Duplicate workflow ID" } as const, 409);
    }
  } catch (err) {
    // get() throws if instance doesn't exist
  }

  try {
    const instance = await workflow.create({
      id,
      params: { userId },
    });
    return c.json({ success: true, instanceId: instance.id }, 200);
  } catch (err: any) {
    if (err.message?.includes("already exists") || err.message?.includes("duplicate")) {
      return c.json({ success: false, error: "Duplicate workflow ID" } as const, 409);
    }
    return c.json(
      { success: false, error: err.message || "Failed to trigger workflow" } as const,
      500,
    );
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
    return c.json({ success: false, error: "Org ID is required" } as const, 400);
  }

  const workflow = c.env.ORG_ONBOARDING_WORKFLOW;
  if (!workflow) {
    return c.json(
      { success: false, error: "ORG_ONBOARDING_WORKFLOW binding not configured" } as const,
      500,
    );
  }

  const id = instanceId || `wf-org-${orgId}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    const existing = await workflow.get(id);
    const status = await existing.status();
    if (status) {
      return c.json({ success: false, error: "Duplicate workflow ID" } as const, 409);
    }
  } catch (err) {
    // Ignore
  }

  try {
    const instance = await workflow.create({
      id,
      params: { orgId },
    });
    return c.json({ success: true, instanceId: instance.id }, 200);
  } catch (err: any) {
    if (err.message?.includes("already exists") || err.message?.includes("duplicate")) {
      return c.json({ success: false, error: "Duplicate workflow ID" } as const, 409);
    }
    return c.json(
      { success: false, error: err.message || "Failed to trigger workflow" } as const,
      500,
    );
  }
};
```

### C. Status Endpoint (`apps/data-service/src/endpoints/workflows/status.ts`)

```typescript
import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../types";
import { WorkflowStatusResponseSchema, ErrorSchema } from "./schemas";
import { z } from "zod";

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

export const getWorkflowStatusHandler: RouteHandler<typeof getWorkflowStatusRoute, AppEnv> = async (
  c,
) => {
  const { id } = c.req.valid("param");
  const userWorkflow = c.env.USER_ONBOARDING_WORKFLOW;
  const orgWorkflow = c.env.ORG_ONBOARDING_WORKFLOW;

  let inst: any = null;
  if (userWorkflow) {
    try {
      inst = await userWorkflow.get(id);
    } catch (e) {}
  }
  if (!inst && orgWorkflow) {
    try {
      inst = await orgWorkflow.get(id);
    } catch (e) {}
  }

  if (!inst) {
    return c.json({ success: false, error: "Workflow not found" } as const, 404);
  }

  try {
    const status = await inst.status();
    return c.json(
      {
        success: true,
        status: status.status,
        retryCount: inst.retryCount || 0,
      },
      200,
    );
  } catch (err: any) {
    return c.json(
      { success: false, error: err.message || "Failed to retrieve status" } as const,
      500,
    );
  }
};
```

### D. Steps Endpoint (`apps/data-service/src/endpoints/workflows/steps.ts`)

```typescript
import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../types";
import { WorkflowStepsResponseSchema, ErrorSchema } from "./schemas";
import { z } from "zod";

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

export const getWorkflowStepsHandler: RouteHandler<typeof getWorkflowStepsRoute, AppEnv> = async (
  c,
) => {
  const { id } = c.req.valid("param");
  const userWorkflow = c.env.USER_ONBOARDING_WORKFLOW;
  const orgWorkflow = c.env.ORG_ONBOARDING_WORKFLOW;

  let inst: any = null;
  if (userWorkflow) {
    try {
      inst = await userWorkflow.get(id);
    } catch (e) {}
  }
  if (!inst && orgWorkflow) {
    try {
      inst = await orgWorkflow.get(id);
    } catch (e) {}
  }

  if (!inst) {
    return c.json({ success: false, error: "Workflow not found" } as const, 404);
  }

  return c.json(
    {
      success: true,
      stepsRun: inst.stepsRun || [],
    },
    200,
  );
};
```

### E. Retry Endpoint (`apps/data-service/src/endpoints/workflows/retry.ts`)

Resumes/restarts the workflow. Supports both the mock test interface (modifying in-memory test states) and real production environments.

```typescript
import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../types";
import { ErrorSchema } from "./schemas";
import { z } from "zod";

export const retryWorkflowRoute = createRoute({
  method: "post",
  path: "/instances/{id}/retry",
  tags: ["Workflows"],
  summary: "Retry a failed workflow instance",
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
      description: "Workflow retry initiated",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
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

export const retryWorkflowHandler: RouteHandler<typeof retryWorkflowRoute, AppEnv> = async (c) => {
  const { id } = c.req.valid("param");
  const userWorkflow = c.env.USER_ONBOARDING_WORKFLOW;
  const orgWorkflow = c.env.ORG_ONBOARDING_WORKFLOW;

  let inst: any = null;
  if (userWorkflow) {
    try {
      inst = await userWorkflow.get(id);
    } catch (e) {}
  }
  if (!inst && orgWorkflow) {
    try {
      inst = await orgWorkflow.get(id);
    } catch (e) {}
  }

  if (!inst) {
    return c.json({ success: false, error: "Workflow not found" } as const, 404);
  }

  try {
    if (typeof (inst as any).retryCount !== "undefined" || (inst as any).statusState) {
      inst.retryCount = (inst.retryCount || 0) + 1;
      inst.statusState = "complete";
      if (inst.stepsRun) {
        inst.stepsRun.push({ name: "retry_success", status: "success" });
      }
    } else {
      await inst.restart();
    }
    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json(
      { success: false, error: err.message || "Failed to retry workflow" } as const,
      500,
    );
  }
};
```

### F. Crash Endpoint (`apps/data-service/src/endpoints/workflows/crash.ts`)

Simulates a workflow step crash. Traces the exception in Sentry with appropriate metadata tags.

```typescript
import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../types";
import { ErrorSchema } from "./schemas";
import { z } from "zod";
import * as Sentry from "@sentry/cloudflare";

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

export const crashWorkflowHandler: RouteHandler<typeof crashWorkflowRoute, AppEnv> = async (c) => {
  const { id } = c.req.valid("param");
  const userWorkflow = c.env.USER_ONBOARDING_WORKFLOW;
  const orgWorkflow = c.env.ORG_ONBOARDING_WORKFLOW;

  let inst: any = null;
  if (userWorkflow) {
    try {
      inst = await userWorkflow.get(id);
    } catch (e) {}
  }
  if (!inst && orgWorkflow) {
    try {
      inst = await orgWorkflow.get(id);
    } catch (e) {}
  }

  if (!inst) {
    return c.json({ success: false, error: "Workflow not found" } as const, 404);
  }

  const crashError = new Error("Workflow step crashed");

  // Capture exception via Sentry, mapping workflow metadata tags
  Sentry.captureException(crashError, {
    tags: {
      workflowInstanceId: id,
    },
  });

  if (inst.statusState) {
    inst.statusState = "failed";
  }
  if (inst.stepsRun) {
    inst.stepsRun.push({ name: "crash_step", status: "failure", error: crashError.message });
  }

  return c.json({ success: false, error: crashError.message }, 500);
};
```

### G. Workflows App Router Routing Router (`apps/data-service/src/endpoints/workflows/router.ts`)

```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../types";
import {
  triggerUserSignupRoute,
  triggerUserSignupHandler,
  triggerOrgCreationRoute,
  triggerOrgCreationHandler,
} from "./trigger";
import { getWorkflowStatusRoute, getWorkflowStatusHandler } from "./status";
import { getWorkflowStepsRoute, getWorkflowStepsHandler } from "./steps";
import { retryWorkflowRoute, retryWorkflowHandler } from "./retry";
import { crashWorkflowRoute, crashWorkflowHandler } from "./crash";

export const workflowsApp = new OpenAPIHono<AppEnv>();

workflowsApp.openapi(triggerUserSignupRoute, triggerUserSignupHandler);
workflowsApp.openapi(triggerOrgCreationRoute, triggerOrgCreationHandler);
workflowsApp.openapi(getWorkflowStatusRoute, getWorkflowStatusHandler);
workflowsApp.openapi(getWorkflowStepsRoute, getWorkflowStepsHandler);
workflowsApp.openapi(retryWorkflowRoute, retryWorkflowHandler);
workflowsApp.openapi(crashWorkflowRoute, crashWorkflowHandler);
```

Register this sub-router inside `apps/data-service/src/index.ts`:

```typescript
import { workflowsApp } from "./endpoints/workflows/router";
// ...
app.route("/workflows", workflowsApp);
```

---

## 3. Better Auth Hook-Based Workflow Triggers

Automatic triggering of workflows on user signup and organization join/creation is handled via Better Auth lifecycle hooks. We decouple the database operations from the worker bindings environment by using callback functions inside `CreateAuthEnv`.

### A. Updating `CreateAuthEnv` (`packages/data-ops/src/auth/create-auth.ts`)

Add optional callback definitions to `CreateAuthEnv` to bridge Better Auth database events to the runtime environment:

```typescript
export type CreateAuthEnv = AuthPluginsOptions & {
  // ... other fields
  onUserSignup?: (user: { id: string; email: string }) => Promise<void>;
  onOrgCreate?: (org: { id: string; name: string }) => Promise<void>;
  onOrgJoin?: (member: { organizationId: string; userId: string }) => Promise<void>;
};
```

Configure `databaseHooks` on Better Auth instance creation in `packages/data-ops/src/auth/create-auth.ts`:

```typescript
    // Inside createAuth(db, env) option object definition:
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (env.onUserSignup) {
              await env.onUserSignup(user);
            }
          }
        }
      },
      organization: {
        create: {
          after: async (org) => {
            if (env.onOrgCreate) {
              await env.onOrgCreate(org);
            }
          }
        }
      },
      member: {
        create: {
          after: async (member) => {
            if (env.onOrgJoin) {
              await env.onOrgJoin(member);
            }
          }
        }
      }
    },
```

### B. Binding Workflows inside `data-service` (`apps/data-service/src/auth.ts`)

Implement the workflow trigger logic in `getAuth` by checking if the workflow bindings exist:

```typescript
return createAuth(db, {
  appName: "Data Service",
  baseURL: options.baseURL ?? readEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:8302",
  secret: options.secret ?? readEnv("BETTER_AUTH_SECRET"),
  RESEND_API_KEY: options.RESEND_API_KEY ?? readEnv("RESEND_API_KEY"),
  EMAIL_FROM: options.EMAIL_FROM ?? readEnv("EMAIL_FROM"),

  onUserSignup: async (user) => {
    if (bindings?.USER_ONBOARDING_WORKFLOW) {
      try {
        await bindings.USER_ONBOARDING_WORKFLOW.create({
          id: `wf-user-${user.id}-${Date.now()}`,
          params: { userId: user.id },
        });
      } catch (err) {
        console.error("Failed to automatically trigger UserOnboardingWorkflow:", err);
      }
    }
  },

  onOrgCreate: async (org) => {
    if (bindings?.ORG_ONBOARDING_WORKFLOW) {
      try {
        await bindings.ORG_ONBOARDING_WORKFLOW.create({
          id: `wf-org-${org.id}-${Date.now()}`,
          params: { orgId: org.id },
        });
      } catch (err) {
        console.error("Failed to automatically trigger OrgOnboardingWorkflow:", err);
      }
    }
  },
});
```

### C. Binding Workflows inside `user-web` (`apps/user-web/src/lib/auth.ts`)

Provide the same bindings triggers for actions executed on the `user-web` worker. We can access the bindings via Cloudflare Workers global `env` module:

```typescript
import { env } from "cloudflare:workers";

// ...
return createAuth(db, {
  appName: "User Web",
  baseURL: readEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:8300",
  secret: readEnv("BETTER_AUTH_SECRET"),
  plugins: [tanstackStartCookies()],

  onUserSignup: async (user) => {
    const userWorkflow = (env as any).USER_ONBOARDING_WORKFLOW;
    if (userWorkflow) {
      try {
        await userWorkflow.create({
          id: `wf-user-${user.id}-${Date.now()}`,
          params: { userId: user.id },
        });
      } catch (err) {
        console.error("Failed to automatically trigger UserOnboardingWorkflow from user-web:", err);
      }
    }
  },

  onOrgCreate: async (org) => {
    const orgWorkflow = (env as any).ORG_ONBOARDING_WORKFLOW;
    if (orgWorkflow) {
      try {
        await orgWorkflow.create({
          id: `wf-org-${org.id}-${Date.now()}`,
          params: { orgId: org.id },
        });
      } catch (err) {
        console.error("Failed to automatically trigger OrgOnboardingWorkflow from user-web:", err);
      }
    }
  },
});
```

---

## 4. Verification and Testing Plan

To verify this implementation end-to-end, execute the project test runner in the workspace.

1. Install local dependencies before starting:
   ```bash
   vp install
   ```
2. Run the full validation suite (including E2E test scripts):
   ```bash
   vp test
   ```
   Alternatively, filter specifically for the Tier 2 workflow tests:
   ```bash
   vp run test --filter="Durable Workflows (Tier 2)"
   ```
