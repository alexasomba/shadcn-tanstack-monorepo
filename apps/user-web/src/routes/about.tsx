import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { ButtonLink } from "@workspace/ui/components/button-link";
import { Card, CardContent } from "@workspace/ui/components/card";
import Features3 from "@workspace/ui/components/ui/feature-3";
import Stats3 from "@workspace/ui/components/ui/stats-3";

import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [{ title: "About — Starter" }],
  }),
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="mb-3 text-sm font-medium tracking-wide text-primary uppercase">About</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            A monorepo kit built for premium product surfaces
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            TanStack Start apps, shared data-ops, Cloudflare Workers, and UI from{" "}
            <code className="text-foreground">@workspace/ui</code> — primitives for structure,
            Watermelon for polish.
          </p>
        </section>
        <Features3 />
        <Stats3 />
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Card className="border-border/70 shadow-none">
            <CardContent className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Talk to us</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Architecture, multi-tenant orgs, or deployment questions.
                </p>
              </div>
              <ButtonLink to="/contact" className="rounded-full">
                Contact
                <ArrowRightIcon className="size-4" />
              </ButtonLink>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
