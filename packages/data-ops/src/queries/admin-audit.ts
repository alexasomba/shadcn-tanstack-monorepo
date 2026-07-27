import type { DatabaseError } from "@workspace/result";
import { Result, databaseError } from "@workspace/result";

import type { Database } from "../database/setup";
import { adminAuditLogs } from "../drizzle/schema/crm";

export type AdminAuditLogData = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: unknown;
};

export async function logAdminAuditEvent(
  db: Database,
  data: AdminAuditLogData,
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const result = await db
        .insert(adminAuditLogs)
        .values({
          id: crypto.randomUUID(),
          actorUserId: data.actorUserId || null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId || null,
          summary: data.summary,
          metadata: data.metadata == null ? null : JSON.stringify(data.metadata),
          createdAt: new Date(),
        })
        .returning();
      return result[0];
    },
    catch: (cause) => databaseError("logAdminAuditEvent", cause),
  });
}

export async function listAdminAuditLogsForEntity(
  db: Database,
  entityType: string,
  entityId: string,
  limit: number = 20,
): Promise<Result<Array<unknown>, DatabaseError>> {
  return Result.tryPromise({
    try: () =>
      db.query.adminAuditLogs.findMany({
        where: { entityType, entityId },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit,
        with: {
          actor: true,
        },
      }),
    catch: (cause) => databaseError("listAdminAuditLogsForEntity", cause),
  });
}

export async function listAdminAuditLogs(
  db: Database,
  limit: number = 100,
): Promise<Result<Array<unknown>, DatabaseError>> {
  return Result.tryPromise({
    try: () =>
      db.query.adminAuditLogs.findMany({
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit,
        with: {
          actor: true,
        },
      }),
    catch: (cause) => databaseError("listAdminAuditLogs", cause),
  });
}
