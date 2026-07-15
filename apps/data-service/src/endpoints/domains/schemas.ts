import { z } from "@hono/zod-openapi";
import type { Domain, DnsRecord, DomainIssue } from "@opencoredev/domain-sdk";
import {
  DomainSchema as DbDomainSchemaFromOps,
  DomainCreateSchema as DbDomainCreateSchemaFromOps,
} from "data-ops";

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
  code: z.string().openapi({ example: "dns_missing" }),
  message: z.string().openapi({ example: "CNAME record not found" }),
  record: DnsRecordSchema.optional(),
  retryable: z.boolean().openapi({ example: true }),
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
    createdAt: z.string().optional().openapi({ example: "2026-07-10T15:50:00.000Z" }),
    updatedAt: z.string().optional().openapi({ example: "2026-07-10T15:50:00.000Z" }),
  })
  .openapi("DomainDetails");

export const DomainCreateSchema = z
  .object(DbDomainCreateSchemaFromOps.shape)
  .openapi("DomainCreate");

export const DbDomainSchema = z.object(DbDomainSchemaFromOps.shape).openapi("DbDomain");

export type ApiDomainDetails = z.infer<typeof DomainDetailsSchema>;

function formatDate(val: unknown): string | undefined {
  if (
    val &&
    typeof val === "object" &&
    "toISOString" in val &&
    typeof val.toISOString === "function"
  ) {
    return (val as { toISOString: () => string }).toISOString();
  }
  if (typeof val === "string") {
    return val;
  }
  return undefined;
}

export function domainToApi(domain: Domain, dbCreatedAt?: Date | null): ApiDomainDetails {
  return {
    id: domain.id,
    hostname: domain.hostname,
    provider: domain.provider,
    status: domain.status,
    records: domain.records.map((r: DnsRecord) => ({
      type: r.type,
      name: r.name,
      value: r.value,
      purpose: r.purpose,
      required: r.required,
      status: r.status,
      description: r.description,
    })),
    verification: {
      status: domain.verification.status,
      records: domain.verification.records.map((r: DnsRecord) => ({
        type: r.type,
        name: r.name,
        value: r.value,
        purpose: r.purpose,
        required: r.required,
        status: r.status,
        description: r.description,
      })),
      message: domain.verification.message,
    },
    certificate: {
      status: domain.certificate.status,
      issuer: domain.certificate.issuer,
      issuedAt: formatDate(domain.certificate.issuedAt),
      expiresAt: formatDate(domain.certificate.expiresAt),
      message: domain.certificate.message,
    },
    issues: domain.issues.map((issue: DomainIssue) => ({
      code: issue.code,
      message: issue.message,
      record: issue.record
        ? {
            type: issue.record.type,
            name: issue.record.name,
            value: issue.record.value,
            purpose: issue.record.purpose,
            required: issue.record.required,
            status: issue.record.status,
            description: issue.record.description,
          }
        : undefined,
      retryable: issue.retryable,
    })),
    createdAt: formatDate(domain.createdAt) || formatDate(dbCreatedAt),
    updatedAt: formatDate(domain.updatedAt) || formatDate(new Date()),
  };
}

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
