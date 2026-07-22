import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useEffect, useState } from "react";
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

const searchSchema = z.object({
  id: z.string().min(1),
});

export const Route = createFileRoute("/accept-invite")({
  validateSearch: searchSchema,
  beforeLoad: async ({ location, search }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: `${location.pathname}?id=${encodeURIComponent(search.id)}`,
        },
      });
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
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingInvite(true);
    setLoadError("");
    void getInvitation(id)
      .then((data) => {
        if (!cancelled) {
          setDetails(data as InvitationDetails);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(
            unknownErrorMessage(e, "Could not load invitation (verified email may be required)"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInvite(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const accept = async () => {
    setError("");
    setLoading(true);
    try {
      await acceptInvitation(id);
      await navigate({ to: "/settings/members" });
    } catch (e) {
      setError(unknownErrorMessage(e, "Could not accept invitation"));
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    setError("");
    setLoading(true);
    try {
      await rejectInvitation(id);
      await navigate({ to: "/dashboard" });
    } catch (e) {
      setError(unknownErrorMessage(e, "Could not decline invitation"));
    } finally {
      setLoading(false);
    }
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
          <CardContent className="space-y-4">
            {loadingInvite ? (
              <p className="text-sm text-muted-foreground">Loading invitation…</p>
            ) : loadError ? (
              <p className="text-sm text-destructive" role="alert">
                {loadError}
              </p>
            ) : details ? (
              <div className="space-y-1 rounded-xl border border-border/70 bg-muted/30 px-3 py-3 text-sm">
                <p className="font-medium">{details.organizationName}</p>
                <p className="text-muted-foreground">/{details.organizationSlug}</p>
                <p className="text-muted-foreground">
                  Invited as <span className="capitalize">{details.role}</span> by{" "}
                  {details.inviterEmail}
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 font-mono text-xs break-all">
                {id}
              </p>
            )}

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button disabled={loading || Boolean(loadError)} onClick={() => void accept()}>
                Accept invitation
              </Button>
              <Button
                variant="outline"
                disabled={loading || Boolean(loadError)}
                onClick={() => void reject()}
              >
                Decline
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
