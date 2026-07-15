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

import { ReferralCard } from "#/components/auth/ReferralCard";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_protected/account")({
  component: AccountPage,
  head: () => ({
    meta: [{ title: "Account — Settings" }],
  }),
});

function AccountPage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile, referrals, and sign-out. Security settings live under Security.
        </p>
      </div>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Signed in with Better Auth</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/dashboard" size="sm">
              Overview
            </ButtonLink>
            <ButtonLink to="/settings/security" variant="outline" size="sm">
              Security
            </ButtonLink>
            <ButtonLink to="/" variant="outline" size="sm">
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
            Full-page reload on sign-out clears session cookies cleanly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
