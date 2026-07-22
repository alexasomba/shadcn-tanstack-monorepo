import { Link, useRouterState } from "@tanstack/react-router";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

import type { AppNavItem } from "#/lib/app-nav";

export function AppNavMain({ label, items }: { label: string; items: AppNavItem[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.to ||
            (item.to !== "/dashboard" && pathname.startsWith(`${item.to}/`));

          return (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={item.label}
                render={<Link to={item.to} preload="intent" />}
              >
                <Icon className="size-4" weight={isActive ? "fill" : "regular"} />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
