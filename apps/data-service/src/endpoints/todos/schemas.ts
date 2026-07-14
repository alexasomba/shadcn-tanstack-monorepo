import { z } from "@hono/zod-openapi";

export const TodoSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    title: z.string().openapi({ example: "Buy milk" }),
    createdAt: z.string().datetime().openapi({ example: "2026-07-10T15:50:00.000Z" }),
  })
  .openapi("Todo");

export const TodoCreateSchema = z
  .object({
    title: z.string().min(1).openapi({ example: "Buy milk" }),
  })
  .openapi("TodoCreate");

export const TodoUpdateSchema = z
  .object({
    title: z.string().min(1).openapi({ example: "Buy oat milk" }),
  })
  .openapi("TodoUpdate");

export const TodoIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({
      param: { name: "id", in: "path" },
      example: 1,
    }),
});

export const ErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("Error");

export type Todo = z.infer<typeof TodoSchema>;
