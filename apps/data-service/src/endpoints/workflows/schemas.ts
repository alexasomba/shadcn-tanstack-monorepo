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
