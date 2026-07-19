import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ButtonLink } from "@workspace/ui/components/button-link";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Faq1 } from "@workspace/ui/components/ui/faq/faq-1";
import Pricing2 from "@workspace/ui/components/ui/pricing/pricing-2";
import { useState } from "react";

import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";
import { authClient } from "#/lib/auth-client";
import { kitPlansToPricingTiers } from "#/lib/billing";
import { paystackCallbackURL, startSubscriptionCheckout } from "#/lib/billing.queries";

function unknownErrorMessage(error: unknown, fallback: string): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [{ title: "Pricing — Starter" }],
  }),
});

function PricingPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSelectPlan = async (plan: { tierId: string; planName: string; isMonthly: boolean }) => {
    setError("");
    if (plan.planName === "free") {
      if (session && session.user) {
        await navigate({ to: "/dashboard" });
      } else {
        await navigate({ to: "/login", search: { redirect: "/dashboard" } });
      }
      return;
    }

    if (!session || !session.user) {
      await navigate({
        to: "/login",
        search: { redirect: `/pricing` },
      });
      return;
    }

    setBusy(true);
    try {
      // Prefer active organization as billing reference when present.
      const orgRes = await authClient.organization.getFullOrganization();
      const orgId =
        orgRes.data && typeof orgRes.data === "object" && "id" in orgRes.data
          ? String((orgRes.data as { id: string }).id)
          : undefined;

      const result = await startSubscriptionCheckout({
        plan: plan.planName,
        referenceId: orgId,
        callbackURL: paystackCallbackURL(window.location.origin),
      });

      if (result && typeof result === "object" && "kind" in result) {
        const r = result as { kind: string; url?: string; message?: string };
        if (r.kind === "checkout" && r.url) {
          window.location.href = r.url;
          return;
        }
        if (r.kind === "scheduled" || r.kind === "prorated") {
          await navigate({ to: "/settings/billing" });
          return;
        }
      }
      setError(
        "Checkout unavailable. Configure PAYSTACK_SECRET_KEY for live Paystack, or use local plans with a valid key.",
      );
    } catch (e) {
      setError(unknownErrorMessage(e, "Checkout failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Pricing2
        title="Pricing that matches how you ship"
        subtitle="Plans from better-auth-paystack — local amounts for the kit; map PLN_* codes via env for production."
        tiers={kitPlansToPricingTiers()}
        onSelectPlan={(p) => {
          void onSelectPlan(p);
        }}
        selecting={busy}
      />
      {error ? (
        <p className="mx-auto max-w-2xl px-4 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Faq1
        badge="Billing"
        title="Common pricing questions"
        faqs={[
          {
            id: "free",
            question: "Is Essential free?",
            answer:
              "Yes. The free plan has $0 amount and local limits (seats/teams) without charging Paystack.",
          },
          {
            id: "orgs",
            question: "Are subscriptions per organization?",
            answer:
              "Yes when you have an active organization — checkout uses the org as referenceId (owner/admin can manage billing).",
          },
          {
            id: "keys",
            question: "Do I need Paystack keys for local demos?",
            answer:
              "Plan listing works from config. Live checkout and webhooks need PAYSTACK_SECRET_KEY and PAYSTACK_WEBHOOK_SECRET.",
          },
        ]}
      />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Manage billing in the app</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                View status, cancel at period end, and transaction history under Settings → Billing.
              </p>
            </div>
            <ButtonLink to="/settings/billing" className="rounded-full">
              Open billing
              <ArrowRightIcon className="size-4" />
            </ButtonLink>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
