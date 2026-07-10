"use client";

import { SidebarIcon } from "@phosphor-icons/react";
import { SearchForm } from "@workspace/ui/blocks/sidebar-01/components/search-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { useSidebar } from "@workspace/ui/components/sidebar";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button className="h-8 w-8" variant="ghost" size="icon" onClick={toggleSidebar}>
          <SidebarIcon />
        </Button>
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Data Fetching</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <SearchForm className="w-full sm:ml-auto sm:w-auto" />
      </div>
    </header>
  );
}
