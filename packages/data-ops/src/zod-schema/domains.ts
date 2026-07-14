import { z } from "zod";

export const DomainSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  hostname: z.string().min(1).max(253),
  status: z.string(),
  createdAt: z.string().datetime(),
});

export const DomainCreateSchema = z.object({
  hostname: z.string().min(1).max(253),
});

export type Domain = z.infer<typeof DomainSchema>;
export type DomainCreate = z.infer<typeof DomainCreateSchema>;
