import {
  ChartBarIcon,
  GearIcon,
  ShareNetworkIcon,
  SquaresFourIcon,
  SignOutIcon,
  UsersIcon,
  Briefcase as BriefcaseIcon,
} from "@phosphor-icons/react";
import { Link, Outlet } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

import { ImpersonationBanner } from "#/components/admin/impersonation-banner";
import { AuthInboxButton } from "#/components/auth/AuthInboxButton";
import { authClient } from "#/lib/auth-client";
import { adminDemoNav, adminNav } from "#/lib/nav";

export default function AdminShell({
  user,
  session,
}: {
  user: { name: string; email: string; image?: string | null };
  /** Session may include admin plugin field `impersonatedBy`. */
  session?: Record<string, unknown> | null;
}) {
  const initial = (user.name || user.email || "A").charAt(0).toUpperCase();
  const impersonatedBy =
    session && "impersonatedBy" in session
      ? (session as { impersonatedBy?: string | null }).impersonatedBy
      : undefined;
  const impersonating = Boolean(impersonatedBy);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {impersonating ? (
        <ImpersonationBanner subjectName={user.name} subjectEmail={user.email} />
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/70 bg-muted/20 p-4 md:flex">
          <Link
            to="/dashboard"
            preload="intent"
            className="mb-6 flex items-center gap-2.5 px-2 font-semibold tracking-tight no-underline"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <SquaresFourIcon className="size-4" />
            </span>
            Admin
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Console
            </p>
            {adminNav.map(({ label, ...link }) => (
              <Link
                key={link.to}
                {...link}
                preload="intent"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground no-underline transition hover:bg-muted hover:text-foreground",
                )}
                activeProps={{
                  className:
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground no-underline bg-muted",
                }}
              >
                {link.to === "/dashboard" ? (
                  <ChartBarIcon className="size-4" />
                ) : link.to === "/crm" ? (
                  <BriefcaseIcon className="size-4" />
                ) : link.to === "/users" ? (
                  <UsersIcon className="size-4" />
                ) : link.to === "/referrals" ? (
                  <ShareNetworkIcon className="size-4" />
                ) : (
                  <GearIcon className="size-4" />
                )}
                {label}
              </Link>
            ))}

            <Separator className="my-4" />

            <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Demos
            </p>
            {adminDemoNav.map(({ label, ...link }) => (
              <Link
                key={link.to}
                {...link}
                preload="intent"
                className="rounded-xl px-3 py-2 text-sm text-muted-foreground no-underline transition hover:bg-muted hover:text-foreground"
                activeProps={{
                  className: "rounded-xl px-3 py-2 text-sm text-foreground no-underline bg-muted",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-3 border-t border-border/70 pt-4">
            <div className="flex items-center gap-3 px-2">
              <Avatar className="size-9">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
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
              <SignOutIcon className="size-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur md:px-6">
            <div className="md:hidden">
              <Link
                to="/dashboard"
                preload="intent"
                className="font-semibold tracking-tight no-underline"
              >
                Admin
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <AuthInboxButton />
              <ButtonLink to="/account" variant="outline" size="sm" className="rounded-full">
                Account
              </ButtonLink>
              <ButtonLink to="/dashboard" size="sm" className="rounded-full md:hidden">
                Overview
              </ButtonLink>
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
