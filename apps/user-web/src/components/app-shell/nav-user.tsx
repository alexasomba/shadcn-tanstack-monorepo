import { CaretUpDownIcon, GearSixIcon, SignOutIcon, StorefrontIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";

import { authClient } from "#/lib/auth-client";

function initials(name: string, email: string) {
  const base = name.trim() || email.trim() || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0] ?? "";
    const second = parts[1] ?? "";
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

export function AppNavUser({
  user,
}: {
  user: { name: string; email: string; image?: string | null };
}) {
  const { isMobile } = useSidebar();
  const fallback = initials(user.name, user.email);

  const signOut = () => {
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
      },
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}
          >
            <Avatar>
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name || "Account"}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <CaretUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarFallback>{fallback}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/account" preload="intent" />}>
                <GearSixIcon className="size-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/" preload="intent" />}>
                <StorefrontIcon className="size-4" />
                Marketing site
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <SignOutIcon className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
