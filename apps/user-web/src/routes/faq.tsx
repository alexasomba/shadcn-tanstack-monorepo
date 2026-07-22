import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { ButtonLink } from "@workspace/ui/components/button-link";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Faq1 } from "@workspace/ui/components/ui/faq/faq-1";

import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [{ title: "FAQ — Starter" }],
  }),
});

function FaqPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Faq1
        badge="Help center"
        title="Frequently asked questions"
        faqs={[
          {
            id: "stack",
            question: "What is the stack?",
            answer:
              "Vite+, TanStack Start, Better Auth, Drizzle + D1, Hono data-service, shadcn primitives, and Watermelon UI blocks.",
          },
          {
            id: "links",
            question: "Are routes type-safe?",
            answer:
              "Yes. Internal navigation uses TanStack Link and linkOptions — invalid paths fail at compile time.",
          },
          {
            id: "user-dash",
            question: "Where is the user dashboard?",
            answer: "Sign in and open /dashboard — Watermelon portfolio dashboard.",
          },
          {
            id: "admin",
            question: "What about admin?",
            answer: "admin-web on port 8301 serves an authenticated Web3 operations dashboard.",
          },
        ]}
      />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Still stuck?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reach support or open the dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink to="/contact" variant="outline" className="rounded-full">
                Contact
              </ButtonLink>
              <ButtonLink to="/dashboard" className="rounded-full">
                Dashboard
                <ArrowRightIcon className="size-4" />
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
