import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { todos } from "../../drizzle/schema/core";

export const TodoSchema = createSelectSchema(todos, {
  id: (schema) => schema.positive(),
  title: (schema) => schema.min(1).max(500),
  createdAt: z.iso.datetime(),
});

export const TodoCreateSchema = createInsertSchema(todos, {
  title: (schema) => schema.min(1).max(500),
}).pick({ title: true });

export const TodoUpdateSchema = createInsertSchema(todos, {
  title: (schema) => schema.min(1).max(500),
})
  .pick({ title: true })
  .partial();

export type Todo = z.infer<typeof TodoSchema>;
export type TodoCreate = z.infer<typeof TodoCreateSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
