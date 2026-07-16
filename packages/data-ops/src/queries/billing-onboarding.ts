/**
 * Free-plan provisioning for signup / org create (M15).
 * Local subscription rows (no Paystack charge) so entitlements resolve immediately.
 */
import { and, eq, inArray } from "drizzle-orm";

import { KIT_PAYSTACK_PLANS } from "../auth/paystack-plans";
import type { Database } from "../database/setup";
import { organization, subscription, user } from "../drizzle/schema/auth";
import { isActiveSubscriptionStatus } from "../entitlements";

const FREE_PLAN = "free";

export type EnsureFreeSubscriptionResult = {
  created: boolean;
  subscriptionId: string;
  referenceId: string;
  plan: string;
  status: string;
};

function freeSeatLimit(): number {
  const catalog = KIT_PAYSTACK_PLANS.find((p) => p.name === FREE_PLAN);
  return catalog?.limits?.seats ?? 5;
}

/**
 * Ensure an active free subscription exists for a billing reference (user or org id).
 * Idempotent: skips when any active/trialing/non-renewing row already exists.
 */
export async function ensureFreeSubscription(
  db: Database,
  referenceId: string,
): Promise<EnsureFreeSubscriptionResult> {
  const existing = await db
    .select()
    .from(subscription)
    .where(eq(subscription.referenceId, referenceId));

  const active = existing.find((row) => isActiveSubscriptionStatus(row.status));
  if (active) {
    return {
      created: false,
      subscriptionId: active.id,
      referenceId,
      plan: active.plan,
      status: active.status ?? "active",
    };
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const seats = freeSeatLimit();

  await db.insert(subscription).values({
    id,
    plan: FREE_PLAN,
    referenceId,
    status: "active",
    periodStart: now,
    seats,
    cancelAtPeriodEnd: false,
    // Local-managed marker (matches better-auth-paystack LOC_/sub_local_ convention).
    paystackSubscriptionCode: `sub_local_free_${id.replace(/-/g, "").slice(0, 12)}`,
  });

  return {
    created: true,
    subscriptionId: id,
    referenceId,
    plan: FREE_PLAN,
    status: "active",
  };
}

export type UserProfileDefaults = {
  userId: string;
  email: string | null;
  name: string | null;
  displayUsername: string | null;
  updated: boolean;
};

/**
 * Apply sensible first-run defaults (display username from email local-part when missing).
 */
export async function applyUserProfileDefaults(
  db: Database,
  userId: string,
): Promise<UserProfileDefaults> {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  const row = rows.at(0);
  if (row === undefined) {
    return {
      userId,
      email: null,
      name: null,
      displayUsername: null,
      updated: false,
    };
  }

  let updated = false;
  const patch: Partial<{
    displayUsername: string;
    username: string;
  }> = {};

  const emailLocal = row.email.includes("@") ? row.email.split("@")[0].trim() : "";

  const hasDisplayUsername =
    typeof row.displayUsername === "string" && row.displayUsername.length > 0;
  if (emailLocal.length > 0 && !hasDisplayUsername) {
    patch.displayUsername = emailLocal.slice(0, 32);
    updated = true;
  }

  const hasUsername = typeof row.username === "string" && row.username.length > 0;
  if (emailLocal.length >= 3 && !hasUsername) {
    // Best-effort unique-ish username; conflicts are ignored.
    const candidate = emailLocal
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);
    if (candidate.length >= 3) {
      const taken = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, candidate))
        .limit(1);
      if (taken.length === 0) {
        patch.username = candidate;
        updated = true;
      }
    }
  }

  if (updated) {
    await db.update(user).set(patch).where(eq(user.id, userId));
  }

  const after = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  const finalRow = after.at(0) ?? row;

  return {
    userId,
    email: finalRow.email,
    name: finalRow.name,
    displayUsername: finalRow.displayUsername ?? null,
    updated,
  };
}

export async function getUserEmailForOnboarding(
  db: Database,
  userId: string,
): Promise<{ email: string; name: string } | null> {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  const row = rows.at(0);
  if (row === undefined) return null;
  return { email: row.email, name: row.name || row.displayUsername || "there" };
}

export async function getOrgForOnboarding(
  db: Database,
  orgId: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await db.select().from(organization).where(eq(organization.id, orgId)).limit(1);
  const row = rows.at(0);
  if (row === undefined) return null;
  return { id: row.id, name: row.name };
}

/**
 * Tag organization metadata.plan = free when missing (kit default).
 */
export async function ensureOrgFreePlanMetadata(
  db: Database,
  orgId: string,
): Promise<{ updated: boolean }> {
  const rows = await db.select().from(organization).where(eq(organization.id, orgId)).limit(1);
  const row = rows.at(0);
  if (row === undefined) return { updated: false };

  let meta: Record<string, unknown> = {};
  if (typeof row.metadata === "string" && row.metadata.length > 0) {
    try {
      const parsed: unknown = JSON.parse(row.metadata);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        meta = { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      meta = {};
    }
  }

  if (typeof meta.plan === "string" && meta.plan.length > 0) {
    return { updated: false };
  }

  meta.plan = FREE_PLAN;
  await db
    .update(organization)
    .set({ metadata: JSON.stringify(meta) })
    .where(eq(organization.id, orgId));

  return { updated: true };
}

/** Active free subscription count for a set of references (tests / diagnostics). */
export async function countActiveFreeSubscriptions(db: Database, referenceIds: Array<string>) {
  if (referenceIds.length === 0) return 0;
  const rows = await db
    .select()
    .from(subscription)
    .where(and(inArray(subscription.referenceId, referenceIds), eq(subscription.plan, FREE_PLAN)));
  return rows.filter((r) => isActiveSubscriptionStatus(r.status)).length;
}
