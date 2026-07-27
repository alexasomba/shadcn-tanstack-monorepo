import {
  ArrowRightIcon,
  BuildingsIcon,
  CreditCardIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ButtonLink } from "@workspace/ui/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export const Route = createFileRoute("/_protected/dashboard")({
  component: UserDashboardPage,
  head: () => ({
    meta: [{ title: "Overview — App" }],
  }),
});

const quickLinks = [
  {
    to: "/settings/organization" as const,
    title: "Organization",
    description: "Create, switch, and manage tenants.",
    icon: BuildingsIcon,
  },
  {
    to: "/settings/billing" as const,
    title: "Billing",
    description: "Plans and Paystack checkout (M12–M13).",
    icon: CreditCardIcon,
  },
  {
    to: "/settings/api-keys" as const,
    title: "API Keys",
    description: "Create and revoke developer keys for data-service.",
    icon: KeyIcon,
  },
  {
    to: "/settings/security" as const,
    title: "Security",
    description: "2FA, backup codes, and passkeys.",
    icon: ShieldCheckIcon,
  },
];

function UserDashboardPage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Product home for the SaaS kit. Settings sections are stubbed until later milestones.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              preload="intent"
              className="group rounded-xl border border-border/70 bg-card p-4 no-underline shadow-none transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-4" weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 font-medium text-foreground">
                    {item.title}
                    <ArrowRightIcon className="size-3.5 opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Demos</CardTitle>
          <CardDescription>
            Showcase compositions live under <code className="text-xs">/demo/*</code> — not the
            product shell.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ButtonLink to="/demo/portfolio" variant="outline" size="sm">
            Portfolio dashboard
          </ButtonLink>
          <ButtonLink to="/" variant="outline" size="sm">
            Marketing site
          </ButtonLink>
          <ButtonLink to="/pricing" variant="outline" size="sm">
            Pricing
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}
