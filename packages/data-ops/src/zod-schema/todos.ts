import { z } from "zod";

export const TodoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(500),
  createdAt: z.string().datetime(),
});

export const TodoCreateSchema = z.object({
  title: z.string().min(1).max(500),
});

export const TodoUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
});

export type Todo = z.infer<typeof TodoSchema>;
export type TodoCreate = z.infer<typeof TodoCreateSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
