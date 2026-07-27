import { eq } from "drizzle-orm";

import type { Database } from "../database/setup";
import { outboxEvents } from "../drizzle/schema/core";
import type { DbOutboxEvent } from "../drizzle/schema/core";

export type OutboxEventRow = DbOutboxEvent;

export async function enqueueOutboxEvent(
  db: Database,
  type: string,
  payload: unknown,
): Promise<OutboxEventRow> {
  const rows = await db
    .insert(outboxEvents)
    .values({
      type,
      payload: JSON.stringify(payload),
    })
    .returning();
  return rows[0];
}

/** Unprocessed events oldest-first (cron / queue drain). */
export async function listPendingOutboxEvents(
  db: Database,
  limit = 50,
): Promise<Array<OutboxEventRow>> {
  return db.query.outboxEvents.findMany({
    where: { processedAt: { isNull: true } },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
    limit,
  });
}

export async function markOutboxEventProcessed(db: Database, id: number): Promise<void> {
  await db.update(outboxEvents).set({ processedAt: new Date() }).where(eq(outboxEvents.id, id));
}
