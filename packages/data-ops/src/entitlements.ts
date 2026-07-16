/**
 * Plan entitlements for the SaaS kit.
 * Derived from KIT_PAYSTACK_PLANS limits + feature gates for paid-only APIs.
 */
import { desc, eq, inArray } from "drizzle-orm";

import { KIT_PAYSTACK_PLANS } from "./auth/paystack-plans";
import type { Database } from "./database/setup";
import { subscription } from "./drizzle/schema/auth";

export type PlanFeature = "todos" | "apiKeys" | "r2" | "domains" | "workflows" | "prioritySupport";

export type PlanEntitlements = {
  plan: string;
  displayName: string;
  seats: number;
  teams: number;
  /** Max org-scoped API keys (soft UI limit). */
  apiKeys: number;
  features: Record<PlanFeature, boolean>;
  isPaid: boolean;
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "non-renewing"]);

const PAID_FEATURES: Record<PlanFeature, boolean> = {
  todos: true,
  apiKeys: true,
  r2: true,
  domains: true,
  workflows: true,
  prioritySupport: true,
};

const FREE_FEATURES: Record<PlanFeature, boolean> = {
  todos: true,
  apiKeys: true,
  r2: false,
  domains: false,
  workflows: true,
  prioritySupport: false,
};

function baseFromCatalog(planName: string): PlanEntitlements {
  const catalog =
    KIT_PAYSTACK_PLANS.find((p) => p.name === planName) ??
    KIT_PAYSTACK_PLANS.find((p) => p.name === "free");
  const name = catalog?.name ?? "free";
  const isPaid = name !== "free" && (catalog?.amount ?? 0) > 0;
  return {
    plan: name,
    displayName: catalog?.displayName ?? "Essential",
    seats: catalog?.limits?.seats ?? 5,
    teams: catalog?.limits?.teams ?? 1,
    apiKeys: isPaid ? (name.startsWith("business") ? 50 : 20) : 5,
    features: isPaid ? { ...PAID_FEATURES } : { ...FREE_FEATURES },
    isPaid,
  };
}

/** Normalize yearly plan names to their base entitlement family. */
export function normalizePlanFamily(planName: string): string {
  if (planName.endsWith("_yearly")) {
    return planName.replace(/_yearly$/, "");
  }
  return planName;
}

export function entitlementsForPlan(planName: string): PlanEntitlements {
  const family = normalizePlanFamily(planName);
  // Map pro/business yearly → same limits as monthly sibling
  const lookup =
    KIT_PAYSTACK_PLANS.find((p) => p.name === planName) ??
    KIT_PAYSTACK_PLANS.find((p) => p.name === family) ??
    KIT_PAYSTACK_PLANS.find((p) => p.name === "free");
  return baseFromCatalog(lookup?.name ?? "free");
}

export type ResolvedEntitlements = PlanEntitlements & {
  status: string;
  referenceId: string;
  subscriptionId: string | null;
};

/**
 * Resolve entitlements for a reference (usually organization id).
 * No subscription row → free tier (kit always usable).
 */
export async function resolveEntitlements(
  db: Database,
  referenceId: string,
): Promise<ResolvedEntitlements> {
  const rows = await db
    .select()
    .from(subscription)
    .where(eq(subscription.referenceId, referenceId))
    .orderBy(desc(subscription.periodEnd));

  const active =
    rows.find((r) => r.status != null && ACTIVE_STATUSES.has(r.status.toLowerCase())) ??
    (rows.length > 0 ? rows[0] : undefined);

  if (active === undefined) {
    const free = entitlementsForPlan("free");
    return {
      ...free,
      status: "none",
      referenceId,
      subscriptionId: null,
    };
  }

  const status = (active.status ?? "incomplete").toLowerCase();

  // Only active/trialing/non-renewing unlock paid features; otherwise free limits.
  if (!ACTIVE_STATUSES.has(status)) {
    const free = entitlementsForPlan("free");
    return {
      ...free,
      plan: active.plan,
      displayName: entitlementsForPlan(active.plan).displayName,
      status,
      referenceId,
      subscriptionId: active.id,
    };
  }

  return {
    ...entitlementsForPlan(active.plan),
    status,
    referenceId,
    subscriptionId: active.id,
  };
}

export function hasFeature(entitlements: PlanEntitlements, feature: PlanFeature): boolean {
  return Boolean(entitlements.features[feature]);
}

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_STATUSES.has(status.toLowerCase());
}

/** Query helper for middleware tests / multi-ref resolution. */
export async function listActiveSubscriptions(db: Database, referenceIds: Array<string>) {
  if (referenceIds.length === 0) return [];
  return db.select().from(subscription).where(inArray(subscription.referenceId, referenceIds));
}
