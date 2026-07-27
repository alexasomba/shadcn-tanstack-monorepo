import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { domains } from "../../drizzle/schema/core";

export const DomainSchema = createSelectSchema(domains, {
  hostname: (schema) => schema.min(1).max(253),
  createdAt: z.iso.datetime(),
});

export const DomainCreateSchema = createInsertSchema(domains, {
  hostname: (schema) => schema.min(1).max(253),
}).pick({ hostname: true });

export type Domain = z.infer<typeof DomainSchema>;
export type DomainCreate = z.infer<typeof DomainCreateSchema>;
