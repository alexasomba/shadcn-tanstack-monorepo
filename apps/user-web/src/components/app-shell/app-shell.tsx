import { Separator } from "@workspace/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@workspace/ui/components/sidebar";

import { AuthInboxButton } from "#/components/auth/AuthInboxButton";
import type { TenantContext } from "#/lib/tenant";
import { tenantBrandLabel } from "#/lib/tenant";

import { AppSidebar } from "./app-sidebar";

export function AppShell({
  user,
  tenant = null,
  children,
}: {
  user: { name: string; email: string; image?: string | null };
  /** Host-mapped org branding (custom domain / vanity subdomain). */
  tenant?: TenantContext | null;
  children: React.ReactNode;
}) {
  const brand = tenantBrandLabel(tenant);

  return (
    <SidebarProvider>
      <AppSidebar user={user} tenant={tenant} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 data-vertical:self-auto" />
          {tenant ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{brand}</p>
              <p className="truncate text-xs text-muted-foreground">
                {tenant.match === "custom_domain"
                  ? tenant.host
                  : `${tenant.organizationSlug} workspace`}
              </p>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex items-center justify-end gap-2">
            <AuthInboxButton />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
