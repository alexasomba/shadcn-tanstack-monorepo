import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import type * as React from "react";

import { appNavMain, appNavSettings } from "#/lib/app-nav";
import type { TenantContext } from "#/lib/tenant";

import { AppNavMain } from "./nav-main";
import { AppNavUser } from "./nav-user";
import { OrgSwitcher } from "./org-switcher";

export function AppSidebar({
  user,
  tenant: _tenant,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; image?: string | null };
  tenant?: TenantContext | null;
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <AppNavMain label="App" items={appNavMain} />
        <AppNavMain label="Settings" items={appNavSettings} />
      </SidebarContent>
      <SidebarFooter>
        <AppNavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
