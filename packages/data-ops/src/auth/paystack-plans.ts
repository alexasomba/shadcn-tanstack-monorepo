/**
 * Canonical subscription plan catalog for better-auth-paystack.
 * Amounts are in the smallest currency unit (e.g. cents for USD, kobo for NGN).
 * Override planCode / paystackId via env for native Paystack dashboard plans.
 */

export type KitPaystackPlan = {
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: "monthly" | "annually" | "biannually" | "weekly" | "daily" | "hourly";
  planCode?: string;
  freeTrial?: { days: number };
  limits?: { seats?: number; teams?: number };
  features?: Array<string>;
  /** UI helpers (not required by plugin) */
  displayName: string;
  /** Highlight on pricing page */
  highlighted?: boolean;
};

function envPlanCode(planName: string): string | undefined {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const key = `PAYSTACK_PLAN_${planName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    const value = proc?.env?.[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Local-managed plans work without Paystack dashboard codes (plugin stores billing locally).
 * Set `PAYSTACK_PLAN_PRO` etc. to native PLN_* codes when ready for production.
 */
export const KIT_PAYSTACK_PLANS: Array<KitPaystackPlan> = [
  {
    name: "free",
    displayName: "Essential",
    description: "Explore the kit locally",
    amount: 0,
    currency: "USD",
    interval: "monthly",
    limits: { seats: 5, teams: 1 },
    features: [
      "Up to 5 organization seats",
      "1 team",
      "API keys (personal + org)",
      "Community support",
    ],
  },
  {
    name: "pro",
    displayName: "Professional",
    description: "For growing teams",
    amount: 3900, // $39.00
    currency: "USD",
    interval: "monthly",
    planCode: envPlanCode("pro"),
    freeTrial: { days: 14 },
    limits: { seats: 50, teams: 10 },
    highlighted: true,
    features: ["Up to 50 seats", "10 teams", "Priority email support", "14-day free trial"],
  },
  {
    name: "pro_yearly",
    displayName: "Professional (Yearly)",
    description: "Pro billed annually",
    amount: 34800, // $348 / year (~$29/mo)
    currency: "USD",
    interval: "annually",
    planCode: envPlanCode("pro_yearly"),
    freeTrial: { days: 14 },
    limits: { seats: 50, teams: 10 },
    features: ["Same as Professional", "2 months free vs monthly"],
  },
  {
    name: "business",
    displayName: "Business",
    description: "Scale with controls",
    amount: 14900, // $149.00
    currency: "USD",
    interval: "monthly",
    planCode: envPlanCode("business"),
    freeTrial: { days: 14 },
    limits: { seats: 200, teams: 50 },
    features: ["Up to 200 seats", "50 teams", "SSO-ready org model", "Dedicated success path"],
  },
  {
    name: "business_yearly",
    displayName: "Business (Yearly)",
    description: "Business billed annually",
    amount: 142800, // $1,428 / year (~$119/mo)
    currency: "USD",
    interval: "annually",
    planCode: envPlanCode("business_yearly"),
    freeTrial: { days: 14 },
    limits: { seats: 200, teams: 50 },
    features: ["Same as Business", "2 months free vs monthly"],
  },
];

/** Plans passed to `paystack({ subscription: { plans } })` (plugin shape). */
export function getPaystackSubscriptionPlans() {
  return KIT_PAYSTACK_PLANS.map(
    ({ name, description, amount, currency, interval, planCode, freeTrial, limits, features }) => ({
      name,
      description,
      amount,
      currency,
      interval,
      ...(planCode ? { planCode } : {}),
      ...(freeTrial ? { freeTrial } : {}),
      ...(limits ? { limits } : {}),
      ...(features ? { features } : {}),
    }),
  );
}

export function formatMoney(amount: number, currency: string): string {
  if (amount === 0) return "$0";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}
