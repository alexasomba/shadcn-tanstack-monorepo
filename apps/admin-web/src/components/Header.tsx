import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ModeToggle } from "@workspace/ui/components/mode-toggle";

import { adminDemoNav, adminNav } from "#/lib/nav";

import BetterAuthHeader from "../integrations/better-auth/header-user.js";

/** Chrome for admin demo / conference routes outside the protected shell. */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 py-3">
        <Link
          to="/"
          className="font-display mr-auto text-lg font-bold tracking-tight text-foreground"
        >
          Conference Admin
        </Link>
        <div className="flex items-center gap-2">
          {adminNav.map(({ label, ...link }) => (
            <Link
              key={link.to}
              {...link}
              preload="intent"
              className="rounded-full px-3 py-1.5 text-muted-foreground no-underline hover:bg-muted hover:text-foreground"
              activeProps={{
                className: "rounded-full px-3 py-1.5 text-foreground no-underline bg-muted",
              }}
            >
              {label}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="rounded-full">
                  Demos
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="min-w-48">
              <DropdownMenuGroup>
                {adminDemoNav.map(({ label, ...link }) => (
                  <DropdownMenuItem key={link.to} className="p-0">
                    <Link
                      {...link}
                      preload="intent"
                      className="flex w-full items-center rounded-xl px-2 py-1.5 text-sm no-underline"
                    >
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <BetterAuthHeader />
        </div>
      </nav>
    </header>
  );
}
