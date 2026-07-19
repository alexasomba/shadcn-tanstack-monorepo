import { ListIcon } from "@phosphor-icons/react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";
import { ModeToggle } from "@workspace/ui/components/mode-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { useState } from "react";

import { marketingNav } from "#/lib/nav";
import { tenantBrandLabel } from "#/lib/tenant";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { tenant } = useRouteContext({ from: "__root__" });
  const brand = tenantBrandLabel(tenant ?? null);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          preload="intent"
          className="group flex items-center gap-2.5 font-semibold tracking-tight no-underline"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary/25">
            <span className="size-2 rounded-full bg-primary" />
          </span>
          <span className="text-base">{brand}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {marketingNav.map(({ label, ...link }) => (
            <Link
              key={link.to}
              {...link}
              preload="intent"
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground no-underline transition hover:bg-muted hover:text-foreground"
              activeProps={{
                className:
                  "rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground no-underline bg-muted",
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            <ButtonLink to="/login" variant="outline" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink to="/dashboard" size="sm">
              Dashboard
            </ButtonLink>
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                <ListIcon className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-1">
                {marketingNav.map(({ label, ...link }) => (
                  <Link
                    key={link.to}
                    {...link}
                    preload="intent"
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground no-underline hover:bg-muted hover:text-foreground"
                    activeProps={{
                      className:
                        "rounded-xl px-3 py-2.5 text-sm font-medium text-foreground no-underline bg-muted",
                    }}
                  >
                    {label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                  <ButtonLink to="/login" variant="outline" onClick={() => setOpen(false)}>
                    Sign in
                  </ButtonLink>
                  <ButtonLink to="/dashboard" onClick={() => setOpen(false)}>
                    Dashboard
                  </ButtonLink>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
