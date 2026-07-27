import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar";

import { AppHeader } from "./components/app-header";
import { AppSidebar } from "./components/app-sidebar";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-muted/50">
        <AppHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid min-h-[100vh] flex-1 place-items-center rounded-xl bg-background md:min-h-min">
            <span className="text-sm text-muted-foreground">Content goes here</span>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
