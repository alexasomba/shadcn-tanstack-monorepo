import type { PricingTier } from "@workspace/ui/components/ui/pricing/pricing-2";
import { formatMoney, KIT_PAYSTACK_PLANS } from "data-ops";

/** Map kit catalog into Pricing2 tiers (monthly + yearly siblings). */
export function kitPlansToPricingTiers(): PricingTier[] {
  const free = KIT_PAYSTACK_PLANS.find((p) => p.name === "free");
  const pro = KIT_PAYSTACK_PLANS.find((p) => p.name === "pro");
  const proYearly = KIT_PAYSTACK_PLANS.find((p) => p.name === "pro_yearly");
  const business = KIT_PAYSTACK_PLANS.find((p) => p.name === "business");
  const businessYearly = KIT_PAYSTACK_PLANS.find((p) => p.name === "business_yearly");

  return [
    {
      id: "free",
      name: free?.displayName ?? "Essential",
      monthlyPrice: formatMoney(free?.amount ?? 0, free?.currency ?? "USD"),
      yearlyPrice: formatMoney(free?.amount ?? 0, free?.currency ?? "USD"),
      priceUnit: "Month",
      buttonText: "Get started free",
      monthlyPlanName: "free",
      yearlyPlanName: "free",
      features: (free?.features ?? []).map((name) => ({ name })),
    },
    {
      id: "pro",
      name: pro?.displayName ?? "Professional",
      monthlyPrice: formatMoney(pro?.amount ?? 3900, pro?.currency ?? "USD"),
      yearlyPrice: formatMoney(
        Math.round((proYearly?.amount ?? 34800) / 12),
        proYearly?.currency ?? "USD",
      ),
      priceUnit: "Month",
      buttonText: "Start free trial",
      isHighlighted: true,
      monthlyPlanName: "pro",
      yearlyPlanName: "pro_yearly",
      features: (pro?.features ?? []).map((name) => ({ name })),
    },
    {
      id: "business",
      name: business?.displayName ?? "Business",
      monthlyPrice: formatMoney(business?.amount ?? 14900, business?.currency ?? "USD"),
      yearlyPrice: formatMoney(
        Math.round((businessYearly?.amount ?? 142800) / 12),
        businessYearly?.currency ?? "USD",
      ),
      priceUnit: "Month",
      buttonText: "Start free trial",
      monthlyPlanName: "business",
      yearlyPlanName: "business_yearly",
      features: (business?.features ?? []).map((name) => ({ name })),
    },
  ];
}

export type SubscriptionRecord = {
  id: string;
  plan: string;
  referenceId: string;
  status?: string | null;
  paystackSubscriptionCode?: string | null;
  paystackEmailToken?: string | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  cancelAtPeriodEnd?: boolean | null;
  seats?: number | null;
  pendingPlan?: string | null;
};

export function formatSubDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isActiveStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === "active" || s === "trialing" || s === "non-renewing";
}
