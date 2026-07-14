import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Faq1 } from "@workspace/ui/components/ui/faq-1";
import Pricing2 from "@workspace/ui/components/ui/pricing-2";

import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";
import { ButtonLink } from "#/components/ui/button-link";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [{ title: "Pricing — Starter" }],
  }),
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Pricing2
        title="Pricing that matches how you ship"
        subtitle="Demo tiers — wire real billing when you are ready."
      />
      <Faq1
        badge="Billing"
        title="Common pricing questions"
        faqs={[
          {
            id: "free",
            question: "Is Essential free?",
            answer: "Yes for this demo kit. Explore auth, dashboards, and data-service locally.",
          },
          {
            id: "orgs",
            question: "Do higher tiers include organizations?",
            answer: "Organization plugin is already in data-ops — map seats to your plan later.",
          },
          {
            id: "cancel",
            question: "Can I change plans later?",
            answer: "Yes. Start on Essential and upgrade when multi-app ops matter.",
          },
        ]}
      />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Start with the free dashboard
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an account and open the portfolio view.
              </p>
            </div>
            <ButtonLink to="/login" className="rounded-full">
              Sign up
              <ArrowRightIcon className="size-4" />
            </ButtonLink>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
