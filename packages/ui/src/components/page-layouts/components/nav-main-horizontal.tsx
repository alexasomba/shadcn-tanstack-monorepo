"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@workspace/ui/components/navigation-menu";
import { cn } from "@workspace/ui/lib/utils";

export function NavMainHorizontal({
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
    <NavigationMenu className="max-md:hidden">
      <NavigationMenuList className="gap-2">
        {items.map((link, index) => (
          <NavigationMenuItem key={index}>
            {link.items?.length ? (
              <>
                <NavigationMenuTrigger className="bg-transparent px-2 py-1.5 font-medium text-muted-foreground hover:text-primary *:[svg]:-me-0.5 *:[svg]:size-3.5">
                  {link.title}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="z-50 p-1 data-[motion=from-end]:slide-in-from-right-16! data-[motion=from-start]:slide-in-from-left-16! data-[motion=to-end]:slide-out-to-right-16! data-[motion=to-start]:slide-out-to-left-16!">
                  <ul className={cn(link.type === "description" ? "min-w-64" : "min-w-48")}>
                    {link.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        <NavigationMenuLink href={item.url} className="py-1.5">
                          {/* Display icon if present */}
                          {link.type === "icon" && "icon" in item && (
                            <div className="flex items-center gap-2">
                              {item.icon && (
                                <item.icon
                                  size={16}
                                  className="text-foreground opacity-60"
                                  aria-hidden="true"
                                />
                              )}
                              <span>{item.title}</span>
                            </div>
                          )}

                          {/* Display label with description if present */}
                          {link.type === "description" && "description" in item ? (
                            <div className="space-y-1">
                              <div className="font-medium">{item.title}</div>
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          ) : (
                            // Display simple label if not icon or description type
                            !link.type ||
                            (link.type !== "icon" && link.type !== "description" && (
                              <span>{item.title}</span>
                            ))
                          )}
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink
                href={link.url}
                className="py-1.5 font-medium text-muted-foreground hover:text-primary"
              >
                {link.title}
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
