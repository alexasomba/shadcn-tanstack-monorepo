"use client";

import {
  GearIcon,
  FileTextIcon,
  LinkIcon,
  CopyIcon,
  ArrowBendUpRightIcon,
  TrashIcon,
  ArrowBendUpLeftIcon,
  ChartLineIcon,
  RowsIcon,
  BellIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
  DotsThreeOutlineIcon,
} from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import * as React from "react";

const data = [
  [
    {
      label: "Customize Page",
      icon: <GearIcon />,
    },
    {
      label: "Turn into wiki",
      icon: <FileTextIcon />,
    },
  ],
  [
    {
      label: "Copy Link",
      icon: <LinkIcon />,
    },
    {
      label: "Duplicate",
      icon: <CopyIcon />,
    },
    {
      label: "Move to",
      icon: <ArrowBendUpRightIcon />,
    },
    {
      label: "Move to Trash",
      icon: <TrashIcon />,
    },
  ],
  [
    {
      label: "Undo",
      icon: <ArrowBendUpLeftIcon />,
    },
    {
      label: "View analytics",
      icon: <ChartLineIcon />,
    },
    {
      label: "Version History",
      icon: <RowsIcon />,
    },
    {
      label: "Show delete pages",
      icon: <TrashIcon />,
    },
    {
      label: "Notifications",
      icon: <BellIcon />,
    },
  ],
  [
    {
      label: "Import",
      icon: <ArrowUpIcon />,
    },
    {
      label: "Export",
      icon: <ArrowDownIcon />,
    },
  ],
];
export function NavActions() {
  const [isOpen, setIsOpen] = React.useState(false);
  React.useEffect(() => {
    setIsOpen(true);
  }, []);
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="hidden font-medium text-muted-foreground md:inline-block">Edit Oct 08</div>
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <StarIcon />
      </Button>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={<Button variant="ghost" size="icon" className="h-7 w-7 data-open:bg-accent" />}
        >
          <DotsThreeOutlineIcon />
        </PopoverTrigger>
        <PopoverContent className="w-56 overflow-hidden rounded-lg p-0" align="end">
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent>
              {data.map((group, index) => (
                <SidebarGroup key={index} className="border-b last:border-none">
                  <SidebarGroupContent className="gap-0">
                    <SidebarMenu>
                      {group.map((item, index) => (
                        <SidebarMenuItem key={index}>
                          <SidebarMenuButton>
                            {item.icon} <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  );
}
