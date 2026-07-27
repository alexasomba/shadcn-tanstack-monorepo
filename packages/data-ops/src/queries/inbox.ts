/**
 * Lightweight in-app inbox writes (better-inbox `notification` table).
 *
 * Prefer this over `auth.api.notify` for server-side producers:
 * - Single D1 INSERT (low CPU ms) vs full Better Auth endpoint stack
 * - No session / HTTP framing overhead on Workers
 * - Same table the `<InboxButton />` UI already reads
 */
import type { Database } from "../database/setup";
import { notification } from "../drizzle/schema/auth";

export type CreateInboxNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  organizationId?: string | null;
  data?: Record<string, unknown> | null;
};

export type CreateInboxNotificationResult = {
  id: string;
};

function newId(): string {
  return crypto.randomUUID();
}

/** Insert one in-app notification for a user. Cheap D1 write; never blocks on HTTP. */
export async function createInboxNotification(
  db: Database,
  input: CreateInboxNotificationInput,
): Promise<CreateInboxNotificationResult> {
  const id = newId();
  await db.insert(notification).values({
    id,
    userId: input.userId,
    organizationId: input.organizationId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    data: input.data ?? null,
    read: false,
    createdAt: new Date(),
  });
  return { id };
}
