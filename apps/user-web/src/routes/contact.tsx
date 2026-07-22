import { BuildingsIcon, EnvelopeIcon, HeadsetIcon, MapPinIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { ButtonLink } from "@workspace/ui/components/button-link";
import ContactBlock from "@workspace/ui/components/ui/contact/contact-1";

import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [{ title: "Contact — Starter" }],
  }),
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <ContactBlock
        badgeText="Contact"
        title="How can we help?"
        description="Reach product, sales, or support. Engineering demos stay under /demo/*."
        contactMethods={[
          {
            id: "support",
            icon: <HeadsetIcon className="h-6 w-6" />,
            title: "Product support",
            description: "Help with auth, dashboard access, and platform issues.",
            actionLabel: "support@example.com",
            actionUrl: "mailto:support@example.com",
          },
          {
            id: "sales",
            icon: <BuildingsIcon className="h-6 w-6" />,
            title: "Sales & enterprise",
            description: "Custom plans, SLAs, and multi-tenant rollouts.",
            actionLabel: "sales@example.com",
            actionUrl: "mailto:sales@example.com",
          },
          {
            id: "press",
            icon: <EnvelopeIcon className="h-6 w-6" />,
            title: "Press",
            description: "Media kits and partnership announcements.",
            actionLabel: "press@example.com",
            actionUrl: "mailto:press@example.com",
          },
          {
            id: "hq",
            icon: <MapPinIcon className="h-6 w-6" />,
            title: "HQ",
            description: "Remote-first — meet us where your team already ships.",
            actionLabel: "hello@example.com",
            actionUrl: "mailto:hello@example.com",
          },
        ]}
      />
      <div className="mx-auto flex max-w-6xl justify-center px-4 pb-16">
        <ButtonLink to="/faq" variant="outline" className="rounded-full">
          Read FAQ
        </ButtonLink>
      </div>
      <SiteFooter />
    </div>
  );
}
