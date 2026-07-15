import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

import { AuthInboxButton } from "#/components/auth/AuthInboxButton";
import { ReferralCard } from "#/components/auth/ReferralCard";
import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_protected/account")({
  component: AccountPage,
  head: () => ({
    meta: [{ title: "Account — Starter" }],
  }),
});

function AccountPage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16 sm:py-20">
        <div className="mb-4 flex justify-end">
          <AuthInboxButton />
        </div>
        <Card className="border-border/70 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Account</CardTitle>
            <CardDescription>Signed in with Better Auth · referrals &amp; inbox</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ButtonLink to="/dashboard">Portfolio dashboard</ButtonLink>
              <ButtonLink to="/" variant="outline">
                Marketing site
              </ButtonLink>
            </div>

            <ReferralCard />

            <Separator />

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                void authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = "/login";
                    },
                  },
                });
              }}
            >
              Sign out
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Prefer a full-page reload on sign-out to clear session cookies cleanly.
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
