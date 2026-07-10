"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { X } from "lucide-react";
import { HiRocketLaunch } from "react-icons/hi2";

export default function Announcement1() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-full items-center justify-between border-b border-primary px-4 py-1.5">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Badge variant="default" className="text-xs">
            NEW
          </Badge>

          <p className="flex items-center gap-2 truncate text-muted-foreground">
            New dashboard experience is live with faster load times and smoother navigation.
          </p>
          <div className="group flex items-center gap-1">
            <span className="relative flex cursor-pointer items-center gap-1 truncate font-medium text-primary before:absolute before:-bottom-1 before:left-0 before:h-[1px] before:w-full before:origin-right before:scale-x-0 before:bg-primary before:transition-transform before:duration-300 before:ease-out group-hover:before:scale-x-100">
              Explore now
            </span>
            <HiRocketLaunch className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer rounded-lg text-primary hover:bg-transparent hover:text-primary/50 hover:dark:bg-transparent"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
