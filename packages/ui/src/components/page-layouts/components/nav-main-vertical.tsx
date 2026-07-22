"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";

export function NavMainVertical({
  items,
}: {
  items: {
    title: string;
    type: string;
    url?: string;
    icon?: Icon;
    items?: {
      title: string;
      url: string;
      description?: string;
      icon?: Icon;
    }[];
  }[];
}) {
  return (
    <>
      {items.map((item, i) => (
        <SidebarGroup key={item.title}>
          <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
          <SidebarMenu>
            {item.items?.length ? (
              <>
                {item.items?.map((subItem) => (
                  <SidebarMenuItem key={subItem.title}>
                    <SidebarMenuButton render={<a href={subItem.url} />}>
                      <span>{subItem.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </>
            ) : null}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
