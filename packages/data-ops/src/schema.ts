import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// Application Schema
export const todos = sqliteTable("todos", {
  id: integer({ mode: "number" }).primaryKey({
    autoIncrement: true,
  }),
  title: text().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

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
