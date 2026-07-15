import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { TodoSchema as DbTodoSchema, TodoCreateSchema as DbTodoCreateSchema } from "data-ops";
import { z } from "zod";

extendZodWithOpenApi(z);

export const TodoSchema = DbTodoSchema.openapi("Todo");

export const TodoCreateSchema = DbTodoCreateSchema.openapi("TodoCreate");

export const TodoUpdateSchema = DbTodoCreateSchema.openapi("TodoUpdate");

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
