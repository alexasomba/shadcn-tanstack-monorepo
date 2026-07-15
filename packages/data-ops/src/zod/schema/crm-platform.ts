import { z } from "zod";

export const crmObjectKeySchema = z.enum([
  "contacts",
  "companies",
  "deals",
  "tickets",
  "quotes",
  "invoices",
  "transactions",
  "segments",
  "customers",
  "orders",
  "tasks",
  "products",
  "line_items",
  "subscriptions",
]);

export const crmViewTypeSchema = z.enum(["table", "kanban", "calendar"]);
export const crmViewVisibilitySchema = z.enum(["workspace", "private", "unlisted"]);

export const crmFieldTypeSchema = z.enum([
  "text",
  "rich_text",
  "number",
  "boolean",
  "date",
  "datetime",
  "currency",
  "select",
  "multi_select",
  "email",
  "phone",
  "url",
  "json",
  "relation",
  "actor",
  "rating",
  "file",
  "address",
  "full_name",
]);

export const crmFieldStorageKindSchema = z.enum([
  "column",
  "metadata_json",
  "computed",
  "relation",
]);

export const crmFilterOperatorSchema = z.enum([
  "eq",
  "neq",
  "contains",
  "starts_with",
  "ends_with",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "is_empty",
  "is_not_empty",
]);

export const crmSortDirectionSchema = z.enum(["asc", "desc"]);

export const crmViewFilterSchema = z.object({
  fieldKey: z.string().min(1),
  operator: crmFilterOperatorSchema,
  value: z.unknown().optional(),
});

export const crmViewSortSchema = z.object({
  fieldKey: z.string().min(1),
  direction: crmSortDirectionSchema.default("asc"),
});

export const crmViewColumnSchema = z.object({
  fieldKey: z.string().min(1),
  width: z.number().int().positive().optional(),
  pinned: z.enum(["left", "right"]).optional(),
  visible: z.boolean().default(true),
});

const tableConfigSchema = z.object({
  columns: z.array(crmViewColumnSchema).default([]),
  filters: z.array(crmViewFilterSchema).default([]),
  sorts: z.array(crmViewSortSchema).default([]),
  groupBy: z.string().nullable().optional(),
  visibleFieldKeys: z.array(z.string()).optional(),
  hiddenFieldKeys: z.array(z.string()).optional(),
});

const kanbanConfigSchema = z.object({
  columns: z.array(crmViewColumnSchema).default([]),
  filters: z.array(crmViewFilterSchema).default([]),
  sorts: z.array(crmViewSortSchema).default([]),
  groupBy: z.string().min(1),
});

const calendarConfigSchema = z.object({
  columns: z.array(crmViewColumnSchema).default([]),
  filters: z.array(crmViewFilterSchema).default([]),
  sorts: z.array(crmViewSortSchema).default([]),
  dateFieldKey: z.string().min(1),
  titleFieldKey: z.string().optional(),
});

export const crmViewConfigSchema = z.discriminatedUnion("type", [
  tableConfigSchema.extend({ type: z.literal("table") }),
  kanbanConfigSchema.extend({ type: z.literal("kanban") }),
  calendarConfigSchema.extend({ type: z.literal("calendar") }),
]);

export const crmRecordLayoutConfigSchema = z.object({
  headerFieldKeys: z.array(z.string()).default([]),
  keyFieldKeys: z.array(z.string()).default([]),
  detailSections: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        fieldKeys: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  relatedObjectKeys: z.array(crmObjectKeySchema).default([]),
});

export const saveCrmViewInputSchema = z.object({
  id: z.string().optional(),
  objectKey: crmObjectKeySchema,
  name: z.string().min(1),
  type: crmViewTypeSchema,
  visibility: crmViewVisibilitySchema.default("workspace"),
  config: crmViewConfigSchema,
  isDefault: z.boolean().optional(),
  ownerUserId: z.string().optional().nullable(),
  actorUserId: z.string().optional().nullable(),
  position: z.number().int().optional(),
});

export const saveCrmRecordFieldInputSchema = z.object({
  objectKey: crmObjectKeySchema,
  recordId: z.string().min(1),
  fieldKey: z.string().min(1),
  value: z.unknown(),
  actorUserId: z.string().optional().nullable(),
});

export const saveCrmTaskInputSchema = z.object({
  id: z.string().optional(),
  relatedObjectKey: crmObjectKeySchema,
  relatedRecordId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional().nullable(),
  status: z.enum(["todo", "in_progress", "done", "canceled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const appendCrmRecordActivityInputSchema = z.object({
  objectKey: crmObjectKeySchema,
  recordId: z.string().min(1),
  activityType: z.enum([
    "note",
    "task",
    "email",
    "calendar",
    "file",
    "audit",
    "workflow",
    "order",
    "deal",
    "ticket",
    "system",
  ]),
  title: z.string().min(1),
  body: z.string().optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional().nullable(),
  actorUserId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
  noteId: z.string().optional().nullable(),
  ticketId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  workflowRunId: z.string().optional().nullable(),
  occurredAt: z.coerce.date().optional(),
});

export type CrmObjectKey = z.infer<typeof crmObjectKeySchema>;
export type CrmViewConfig = z.infer<typeof crmViewConfigSchema>;
export type SaveCrmView = z.infer<typeof saveCrmViewInputSchema>;
export type SaveCrmRecordField = z.infer<typeof saveCrmRecordFieldInputSchema>;
export type SaveCrmTask = z.infer<typeof saveCrmTaskInputSchema>;
export type AppendCrmRecordActivity = z.infer<typeof appendCrmRecordActivityInputSchema>;
