import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const SeedResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .openapi("SeedResponse");

export const VerifyResponseSchema = z
  .object({
    success: z.literal(true),
    counts: z.object({
      users: z.number().int().nonnegative(),
      organizations: z.number().int().nonnegative(),
      todos: z.number().int().nonnegative(),
    }),
  })
  .openapi("VerifyResponse");

export const ErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("Error");
