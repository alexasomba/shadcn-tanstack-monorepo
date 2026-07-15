import { z } from "@hono/zod-openapi";

export const SeedResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().openapi({ example: "Database seeded successfully" }),
  })
  .openapi("SeedResponse");

export const VerifyResponseSchema = z
  .object({
    users: z.number().openapi({ example: 2 }),
    organizations: z.number().openapi({ example: 1 }),
    todos: z.number().openapi({ example: 1 }),
    domains: z.number().optional().openapi({ example: 1 }),
    crmContacts: z.number().optional().openapi({ example: 1 }),
    crmCompanies: z.number().optional().openapi({ example: 1 }),
    crmDeals: z.number().optional().openapi({ example: 1 }),
    crmNotes: z.number().optional().openapi({ example: 1 }),
    crmTickets: z.number().optional().openapi({ example: 1 }),
    crmTasks: z.number().optional().openapi({ example: 1 }),
  })
  .openapi("VerifyResponse");

export const SeedErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("SeedError");
