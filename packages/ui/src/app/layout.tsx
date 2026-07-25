import React, { useState, useEffect } from "react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../components/command";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "../components/toast";
import { ErrorBoundary } from "../components/ui/error-boundary";

export const metadata = {
  title: "UI Design System Shell",
  description: "A comprehensive modern accessible design system component library.",
};

export function RootLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest?.("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <html lang="en">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <ErrorBoundary>
          <ThemeProvider defaultTheme="system" storageKey="ui-theme">
            {children}
            <CommandDialog open={open} onOpenChange={setOpen}>
              <CommandInput placeholder="Search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Actions">
                  <CommandItem>Toggle Theme</CommandItem>
                </CommandGroup>
              </CommandList>
            </CommandDialog>
            <Toaster />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

export default RootLayout;
