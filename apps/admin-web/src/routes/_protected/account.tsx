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

import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_protected/account")({
  component: AccountPage,
  head: () => ({
    meta: [{ title: "Account — Admin" }],
  }),
});

function AccountPage() {
  const { user, session } = Route.useRouteContext();
  const impersonatedBy =
    typeof session === "object" && "impersonatedBy" in session
      ? (session as { impersonatedBy?: string | null }).impersonatedBy
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <Card className="border-border/70 shadow-lg shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">Account</CardTitle>
          <CardDescription>Admin operator profile (Better Auth)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {"role" in user && typeof user.role === "string" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Role: <span className="font-mono text-foreground">{user.role}</span>
              </p>
            ) : null}
          </div>

          {impersonatedBy ? (
            <div className="space-y-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="text-sm font-medium">Impersonation active</p>
              <p className="text-xs text-muted-foreground">
                Acting as this user. Admin id: <span className="font-mono">{impersonatedBy}</span>
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  void authClient.admin.stopImpersonating().then((result) => {
                    if (!result.error) {
                      window.location.href = "/users";
                    }
                  });
                }}
              >
                Stop impersonating
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/dashboard">Back to overview</ButtonLink>
            <ButtonLink to="/users" variant="outline">
              Manage users
            </ButtonLink>
          </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
