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
import { useCallback, useEffect, useState } from "react";

import { authClient } from "#/lib/auth-client";

type OrgRow = {
  id: string;
  name: string;
  slug?: string | null;
};

/**
 * Active organization switcher.
 * Lists orgs from Better Auth when available; empty state links to settings (M9).
 */
export function OrgSwitcher() {
  const { isMobile } = useSidebar();
  const [organizations, setOrganizations] = useState<OrgRow[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const listRes = await authClient.organization.list();
      const rows = (listRes.data ?? []) as OrgRow[];
      setOrganizations(rows);

      const full = await authClient.organization.getFullOrganization();
      const active = full.data as OrgRow | null;
      setActiveOrgId(active?.id ?? null);
    } catch (err) {
      console.error("[OrgSwitcher] refresh failed", err);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  let displayName = "No organization";
  if (activeOrg) {
    displayName = activeOrg.name;
  } else if (organizations.length > 0) {
    displayName = organizations[0].name;
  }
  const planLabel =
    activeOrgId !== null ? "Active" : organizations.length > 0 ? "Select org" : "Personal";

  const setActive = async (organizationId: string) => {
    try {
      await authClient.organization.setActive({ organizationId });
      setActiveOrgId(organizationId);
    } catch (err) {
      console.error("[OrgSwitcher] setActive failed", err);
    }
  };

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
                organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    className="gap-2 p-2"
                    onClick={() => {
                      void setActive(org.id);
                    }}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <BuildingsIcon className="size-3.5" />
                    </div>
                    <span className="truncate">{org.name}</span>
                    {activeOrgId === org.id ? (
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
