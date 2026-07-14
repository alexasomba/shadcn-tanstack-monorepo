import { z } from "@hono/zod-openapi";

export const DnsRecordSchema = z.object({
  type: z.string().openapi({ example: "CNAME" }),
  name: z.string().openapi({ example: "app" }),
  value: z.string().openapi({ example: "fallback.example.com" }),
  purpose: z.string().openapi({ example: "routing" }),
  required: z.boolean().openapi({ example: true }),
  status: z.string().openapi({ example: "pending" }),
  description: z.string().optional(),
});

export const DomainVerificationSchema = z.object({
  status: z.string().openapi({ example: "pending" }),
  records: z.array(DnsRecordSchema),
  message: z.string().optional(),
});

export const DomainCertificateSchema = z.object({
  status: z.string().openapi({ example: "pending" }),
  issuer: z.string().optional(),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  message: z.string().optional(),
});

export const DomainIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  record: DnsRecordSchema.optional(),
  retryable: z.boolean(),
});

export const DomainDetailsSchema = z
  .object({
    id: z.string().openapi({ example: "dom_123" }),
    hostname: z.string().openapi({ example: "customer.com" }),
    provider: z.string().openapi({ example: "cloudflare" }),
    status: z.string().openapi({ example: "pending" }),
    records: z.array(DnsRecordSchema),
    verification: DomainVerificationSchema,
    certificate: DomainCertificateSchema,
    issues: z.array(DomainIssueSchema),
  })
  .openapi("DomainDetails");

export const DomainCreateSchema = z
  .object({
    hostname: z.string().min(1).openapi({ example: "app.customer.com" }),
  })
  .openapi("DomainCreate");

export const DbDomainSchema = z
  .object({
    id: z.string().openapi({ example: "dom_123" }),
    organizationId: z.string().openapi({ example: "org_123" }),
    hostname: z.string().openapi({ example: "app.customer.com" }),
    status: z.string().openapi({ example: "pending" }),
    createdAt: z.string().openapi({ example: "2026-07-10T15:50:00.000Z" }),
  })
  .openapi("DbDomain");

export const DomainHostnameParamSchema = z.object({
  hostname: z.string().openapi({
    param: { name: "hostname", in: "path" },
    example: "app.customer.com",
  }),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .openapi("SuccessResponse");

export const ErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("Error");
