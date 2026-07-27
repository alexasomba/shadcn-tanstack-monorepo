import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty";
import { useState } from "react";
import { z } from "zod";

import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";
import { getSession } from "#/lib/auth.functions";
import type { InvitationDetails } from "#/lib/organization";
import { acceptInvitation, getInvitation, rejectInvitation } from "#/lib/organization.queries";

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

export const Route = createFileRoute("/accept-invite")({
  validateSearch: z.object({
    id: z.string().catch(""),
  }),
  beforeLoad: async ({ search }) => {
    const session = await getSession();
    if (!session?.user) {
      const callback = search.id
        ? `/accept-invite?id=${encodeURIComponent(search.id)}`
        : "/accept-invite";
      throw redirect({
        to: "/login",
        search: { redirect: callback },
      });
    }
    if (!search.id) {
      throw redirect({ to: "/dashboard" });
    }
    return { user: session.user };
  },
  component: AcceptInvitePage,
  head: () => ({
    meta: [{ title: "Accept invitation — Starter" }],
  }),
});

function AcceptInvitePage() {
  const { id } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const invitationQuery = useQuery({
    queryKey: ["invitation-details", id],
    queryFn: async () => {
      const data = await getInvitation(id);
      return data as InvitationDetails;
    },
    enabled: Boolean(id),
  });

  const details = invitationQuery.data ?? null;
  const loadingInvite = invitationQuery.isLoading;
  const loadError = invitationQuery.isError
    ? unknownErrorMessage(
        invitationQuery.error,
        "Could not load invitation (verified email may be required)",
      )
    : "";

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvitation(id),
    onSuccess: async () => {
      await navigate({ to: "/settings/members" });
    },
    onError: (e) => {
      setError(unknownErrorMessage(e, "Could not accept invitation"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectInvitation(id),
    onSuccess: async () => {
      await navigate({ to: "/dashboard" });
    },
    onError: (e) => {
      setError(unknownErrorMessage(e, "Could not decline invitation"));
    },
  });

  const loading = acceptMutation.isPending || rejectMutation.isPending;

  const accept = () => {
    setError("");
    acceptMutation.mutate();
  };

  const reject = () => {
    setError("");
    rejectMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:py-24">
        <Card className="border-border/70 shadow-xl shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Organization invitation</CardTitle>
            <CardDescription>
              Signed in as {user.email}
              {user.emailVerified ? "" : " (verify email before accepting)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loadingInvite ? (
              <p className="text-sm text-muted-foreground">Loading invitation…</p>
            ) : loadError ? (
              <Alert variant="destructive">
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            ) : details ? (
              <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/30 px-3 py-3 text-sm">
                <p className="font-medium">{details.organizationName}</p>
                <p className="text-muted-foreground">/{details.organizationSlug}</p>
                <p className="text-muted-foreground">
                  Invited as <span className="capitalize">{details.role}</span> by{" "}
                  {details.inviterEmail}
                </p>
              </div>
            ) : (
              <Empty className="py-4">
                <EmptyHeader>
                  <EmptyTitle>No invitation details found</EmptyTitle>
                  <EmptyDescription className="font-mono text-xs break-all">
                    Invitation ID: {id}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  <p role="alert" aria-live="assertive">
                    {error}
                  </p>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button disabled={loading || Boolean(loadError)} onClick={() => accept()}>
                {acceptMutation.isPending ? "Accepting…" : "Accept invitation"}
              </Button>
              <Button
                variant="outline"
                disabled={loading || Boolean(loadError)}
                onClick={() => reject()}
              >
                {rejectMutation.isPending ? "Declining…" : "Decline"}
              </Button>
              <ButtonLink to="/dashboard" variant="ghost" size="sm">
                Skip
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
