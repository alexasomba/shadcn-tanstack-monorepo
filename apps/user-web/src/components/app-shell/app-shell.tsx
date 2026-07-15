import { Separator } from "@workspace/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@workspace/ui/components/sidebar";

import { AuthInboxButton } from "#/components/auth/AuthInboxButton";

import { AppSidebar } from "./app-sidebar";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; image?: string | null };
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 data-vertical:self-auto" />
          <div className="flex flex-1 items-center justify-end gap-2">
            <AuthInboxButton />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
