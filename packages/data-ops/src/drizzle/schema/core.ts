import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

import { organization } from "./auth";

// Application Schema
export const todos = sqliteTable(
  "todos",
  {
    id: integer({ mode: "number" }).primaryKey({
      autoIncrement: true,
    }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (table) => [index("todos_organization_idx").on(table.organizationId)],
);

/**
 * Outbox stub for async side-effects (email, webhooks, queues).
 * Cron / queue consumers claim rows and set processed_at.
 */
export const outboxEvents = sqliteTable(
  "outbox_events",
  {
    id: integer({ mode: "number" }).primaryKey({
      autoIncrement: true,
    }),
    type: text().notNull(),
    payload: text().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
    processedAt: integer("processed_at", { mode: "timestamp" }),
  },
  (table) => [index("outbox_events_type_idx").on(table.type)],
);

export const domains = sqliteTable(
  "domains",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull().unique(),
    status: text("status").notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (table) => [index("domains_organization_idx").on(table.organizationId)],
);

// --- Inferred Database Types ---
export type DbTodo = InferSelectModel<typeof todos>;
export type NewDbTodo = InferInsertModel<typeof todos>;

export type DbDomain = InferSelectModel<typeof domains>;
export type NewDbDomain = InferInsertModel<typeof domains>;

export type DbOutboxEvent = InferSelectModel<typeof outboxEvents>;
export type NewDbOutboxEvent = InferInsertModel<typeof outboxEvents>;
