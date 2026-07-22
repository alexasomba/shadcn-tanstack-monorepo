/**
 * Thin wrappers around better-auth-paystack client APIs.
 */
import type { SubscriptionRecord } from "#/lib/billing";
import { paystackActions, subscriptionActions, transactionActions } from "#/lib/paystack-client";

/** Canonical Paystack return URL (server-verified). */
export function paystackCallbackURL(origin?: string): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8300");
  return `${base}/billing/paystack/callback`;
}

function errMsg(
  error: { message?: string | null; statusText?: string } | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;
  return error.message || error.statusText || fallback;
}

async function unwrap(
  promise: Promise<{
    data: unknown;
    error: { message?: string | null; statusText?: string } | null;
  }>,
  fallback: string,
): Promise<unknown> {
  const res = await promise;
  if (res.error) throw new Error(errMsg(res.error, fallback));
  return res.data;
}

export async function listBillingPlans() {
  return unwrap(paystackActions.listPlans(), "Could not load plans");
}

export async function listSubscriptions(referenceId?: string): Promise<SubscriptionRecord[]> {
  const data = await unwrap(
    subscriptionActions.list(referenceId ? { query: { referenceId } } : undefined),
    "Could not load subscriptions",
  );
  if (data && typeof data === "object" && "subscriptions" in data) {
    const list = Reflect.get(data, "subscriptions");
    return Array.isArray(list) ? (list as SubscriptionRecord[]) : [];
  }
  return [];
}

export async function listTransactions(referenceId?: string): Promise<unknown[]> {
  const data = await unwrap(
    transactionActions.list(referenceId ? { query: { referenceId } } : undefined),
    "Could not load transactions",
  );
  if (data && typeof data === "object" && "transactions" in data) {
    const list = Reflect.get(data, "transactions");
    return Array.isArray(list) ? list : [];
  }
  return [];
}

/**
 * Start checkout / subscription for a plan.
 * On success with kind "checkout", open `url` (Paystack hosted page).
 */
export async function startSubscriptionCheckout(input: {
  plan: string;
  /** Org id for organization billing; omit for personal. */
  referenceId?: string;
  callbackURL?: string;
}) {
  return unwrap(
    subscriptionActions.create({
      plan: input.plan,
      ...(input.referenceId ? { referenceId: input.referenceId } : {}),
      callbackURL: input.callbackURL ?? paystackCallbackURL(),
    }),
    "Could not start checkout",
  );
}

export async function cancelSubscription(input: {
  subscriptionCode: string;
  emailToken?: string;
  atPeriodEnd?: boolean;
}) {
  return unwrap(
    subscriptionActions.cancel({
      subscriptionCode: input.subscriptionCode,
      ...(input.emailToken ? { emailToken: input.emailToken } : {}),
      atPeriodEnd: input.atPeriodEnd ?? true,
    }),
    "Could not cancel subscription",
  );
}

export async function restoreSubscription(input: {
  subscriptionCode: string;
  emailToken?: string;
}) {
  return unwrap(
    subscriptionActions.restore({
      subscriptionCode: input.subscriptionCode,
      ...(input.emailToken ? { emailToken: input.emailToken } : {}),
    }),
    "Could not restore subscription",
  );
}

export async function openBillingPortal(subscriptionCode: string) {
  return unwrap(
    subscriptionActions.billingPortal({ subscriptionCode }),
    "Could not open billing portal",
  );
}
