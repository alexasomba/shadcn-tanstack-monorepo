import { BuildingsIcon, CaretUpDownIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
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
import { useState } from "react";

import {
  setActiveOrganization,
  useActiveOrganization,
  useOrganizationsList,
} from "#/lib/organization.queries";

/**
 * Active organization switcher using Better Auth reactive hooks
 * (`useListOrganizations` / `useActiveOrganization`).
 */
export function OrgSwitcher() {
  const { isMobile } = useSidebar();
  const listState = useOrganizationsList();
  const activeState = useActiveOrganization();
  const [busy, setBusy] = useState(false);

  const organizations = listState.data ?? [];
  const activeOrg = activeState.data;
  let displayName = "No organization";
  if (activeOrg) {
    displayName = activeOrg.name;
  } else if (organizations.length > 0) {
    displayName = organizations[0].name;
  }
  const planLabel = activeOrg ? "Active" : organizations.length > 0 ? "Select org" : "Personal";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <BuildingsIcon className="size-4" weight="duotone" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{planLabel}</span>
            </div>
            <CaretUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Organizations
              </DropdownMenuLabel>
              {organizations.length === 0 ? (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  No organizations yet
                </DropdownMenuItem>
              ) : (
                organizations.map((org: { id: string; name: string }) => (
                  <DropdownMenuItem
                    key={org.id}
                    className="gap-2 p-2"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void setActiveOrganization(org.id).finally(() => setBusy(false));
                    }}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <BuildingsIcon className="size-3.5" />
                    </div>
                    <span className="truncate">{org.name}</span>
                    {activeOrg?.id === org.id ? (
                      <span className="ml-auto text-xs text-muted-foreground">Active</span>
                    ) : null}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 p-2" render={<Link to="/settings/organization" />}>
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Manage organizations</div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
