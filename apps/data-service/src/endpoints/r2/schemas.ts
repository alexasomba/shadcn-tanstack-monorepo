import { z } from "@hono/zod-openapi";

export const PresignedPutRequestSchema = z
  .object({
    key: z
      .string()
      .min(1, "Key is required")
      .refine((val) => val.trim() !== "", { message: "Invalid key" }),
    contentType: z.string().optional(),
    expiresIn: z
      .number()
      .int()
      .refine((val) => val > 0, { message: "Invalid expiration time" })
      .optional(),
  })
  .openapi("PresignedPutRequest");

export const PresignedPutResponseSchema = z
  .object({
    success: z.literal(true),
    url: z.string().openapi({ example: "https://mock-r2.local/bucket/avatar.png" }),
  })
  .openapi("PresignedPutResponse");

export const PresignedGetRequestSchema = z
  .object({
    key: z
      .string()
      .min(1, "Key is required")
      .refine((val) => val.trim() !== "", { message: "Invalid key" }),
    expiresIn: z
      .number()
      .int()
      .refine((val) => val > 0, { message: "Invalid expiration time" })
      .optional(),
  })
  .openapi("PresignedGetRequest");

export const PresignedGetResponseSchema = z
  .object({
    success: z.literal(true),
    url: z.string().openapi({ example: "https://mock-r2.local/bucket/avatar.png?get=true" }),
  })
  .openapi("PresignedGetResponse");

export const DeleteRequestSchema = z
  .object({
    key: z
      .string()
      .min(1, "Key is required")
      .refine((val) => val.trim() !== "", { message: "Invalid key" }),
  })
  .openapi("DeleteRequest");

export const DeleteResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .openapi("DeleteResponse");

export const R2ObjectSchema = z.object({
  key: z.string().openapi({ example: "avatar.png" }),
  size: z.number().openapi({ example: 1024 }),
  uploaded: z.string().openapi({ example: "2026-07-10T15:50:00.000Z" }),
});

export const ListResponseSchema = z
  .object({
    success: z.literal(true),
    files: z.array(R2ObjectSchema),
  })
  .openapi("ListResponse");

export const ErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("R2Error");
