import { asc, eq, isNull } from "drizzle-orm";

import type { Database } from "../database/setup";
import { outboxEvents } from "../schema";

export type OutboxEventRow = {
  id: number;
  type: string;
  payload: string;
  createdAt: Date | null;
  processedAt: Date | null;
};

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
    where: isNull(outboxEvents.processedAt),
    orderBy: [asc(outboxEvents.createdAt)],
    limit,
  });
}

export async function markOutboxEventProcessed(db: Database, id: number): Promise<void> {
  await db.update(outboxEvents).set({ processedAt: new Date() }).where(eq(outboxEvents.id, id));
}
