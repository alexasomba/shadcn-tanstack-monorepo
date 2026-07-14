import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Faq1 } from "@workspace/ui/components/ui/faq-1";
import Features1 from "@workspace/ui/components/ui/feature-1";
import Features3 from "@workspace/ui/components/ui/feature-3";
import Pricing2 from "@workspace/ui/components/ui/pricing-2";
import Stats3 from "@workspace/ui/components/ui/stats-3";

import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";
import { ButtonLink } from "#/components/ui/button-link";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [{ title: "Starter — Premium Cloudflare monorepo kit" }],
  }),
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.7_0.08_180_/_0.18),transparent_55%)]"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="space-y-7">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              TanStack Start · Cloudflare · Watermelon
            </Badge>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              Ship multi-app SaaS with a{" "}
              <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                premium UI system
              </span>
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Shared D1 + Better Auth, service-bound data-service, and type-safe routing. Interfaces
              compose shadcn primitives and Watermelon blocks from{" "}
              <code className="text-foreground">@workspace/ui</code>.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/dashboard" size="lg" className="rounded-full px-6">
                Open dashboard
                <ArrowRightIcon className="size-4" />
              </ButtonLink>
              <ButtonLink to="/pricing" size="lg" variant="outline" className="rounded-full px-6">
                View pricing
              </ButtonLink>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>Type-safe Link navigation</span>
              <span>Auth-gated portfolio</span>
              <span>Admin Web3 desk</span>
            </div>
          </div>

          <Card className="border-border/70 shadow-xl ring-1 shadow-primary/5 ring-primary/10">
            <CardHeader>
              <CardTitle className="text-xl">What ships in the kit</CardTitle>
              <CardDescription>
                Opinionated defaults, production-shaped architecture.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {[
                ["user-web · 8300", "Marketing, auth, portfolio dashboard"],
                ["admin-web · 8301", "Operator console with Web3 metrics"],
                ["data-service · 8302", "Hono OpenAPI + jobs stubs"],
                ["data-ops", "D1 schema, auth plugins, queries"],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="flex flex-col gap-0.5 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3"
                >
                  <p className="font-medium">{title}</p>
                  <p className="text-muted-foreground">{body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Features1 />
      <Stats3 />
      <Features3 />

      <Pricing2
        title="Simple plans for product teams"
        subtitle="Start free. Scale into orgs, agents, and ops when you are ready."
      />

      <Faq1
        badge="FAQ"
        title={
          <>
            Built for agents & humans{" "}
            <span className="text-muted-foreground">shipping in parallel</span>
          </>
        }
        faqs={[
          {
            id: "nav",
            question: "How are internal links handled?",
            answer:
              "TanStack Router Link and linkOptions — fully type-checked paths, intent preloading, no raw internal hrefs.",
          },
          {
            id: "ui",
            question: "What is the UI stack?",
            answer:
              "shadcn primitives in packages/ui/src/components and Watermelon compositions in components/ui. Apps compose both.",
          },
          {
            id: "auth",
            question: "How does auth work?",
            answer:
              "Better Auth via data-ops. Protected routes redirect to /login with a typed redirect search param.",
          },
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-none">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center sm:p-10">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Open your portfolio</h2>
              <p className="max-w-md text-sm text-muted-foreground sm:text-base">
                Sign in for the Watermelon portfolio dashboard — holdings, P&amp;L, and 7-day chart.
              </p>
            </div>
            <ButtonLink to="/dashboard" size="lg" className="rounded-full px-6">
              Go to dashboard
              <ArrowRightIcon className="size-4" />
            </ButtonLink>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}
