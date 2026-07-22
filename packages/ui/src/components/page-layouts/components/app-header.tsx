import { Bell, Envelope } from "@phosphor-icons/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import * as React from "react";

import { navigationLinks } from "./app-sidebar";
import { Logo } from "./logo";
import { NavMainHorizontal } from "./nav-main-horizontal";
import { NavUser } from "./nav-user";

export function AppHeader() {
  return (
    <header
      data-slot="header"
      className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 [&_[data-logo=description]]:hidden"
    >
      <div className="flex grow items-center">
        <Logo />
        <Separator orientation="vertical" className="mx-4 data-[orientation=vertical]:h-4" />
        <SidebarTrigger className="-ml-1 md:hidden" />
        <NavMainHorizontal items={navigationLinks} />
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="ghost">
            <Envelope className="size-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" className="relative">
            <Bell className="size-4" />
            <Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1 text-[10px]">
              5
            </Badge>
          </Button>
        </div>
        <NavUser />
      </div>
    </header>
  );
}
