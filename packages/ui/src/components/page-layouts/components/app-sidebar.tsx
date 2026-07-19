"use client";

import { BookOpen, Info, Lifebuoy } from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import * as React from "react";

import { Logo } from "./logo";
import { NavMainVertical } from "./nav-main-vertical";

export const navigationLinks = [
  {
    title: "Get Started",
    type: "description",
    items: [
      {
        url: "#",
        title: "Dashboard",
        description: "Browse all components in the library.",
      },
      {
        url: "#",
        title: "Ecommerce",
        description: "Learn how to use the library.",
      },
      {
        url: "#",
        title: "Reports",
        description: "Pre-built layouts for common use cases.",
      },
    ],
  },
  {
    title: "Apps",
    type: "simple",
    items: [
      { url: "#", title: "Chats" },
      { url: "#", title: "Kanban Board" },
      { url: "#", title: "Notes" },
      { url: "#", title: "Event Calendar" },
    ],
  },
  {
    title: "Pages",
    type: "icon",
    items: [
      { url: "#", title: "Profile Page", icon: BookOpen },
      { url: "#", title: "User List", icon: Lifebuoy },
      { url: "#", title: "Pricing Page", icon: Info },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Logo />}></SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMainVertical items={navigationLinks} />
      </SidebarContent>
    </Sidebar>
  );
}
