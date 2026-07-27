import React, { useState, useEffect } from "react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./components/command";
import { Toaster } from "./components/sonner";
import { ThemeProvider } from "./components/theme-provider";
import { ErrorBoundary } from "./components/ui/error-boundary";

export const metadata = {
  title: "UI Design System Shell",
  description: "A comprehensive modern accessible design system component library.",
};

export function App() {
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
    <ErrorBoundary>
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </head>
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <div className="min-h-screen bg-background text-foreground">
          <main className="container mx-auto p-6">
            <h1 className="text-3xl font-bold">UI Component Library</h1>
            <p className="mt-2 text-muted-foreground">{metadata.description}</p>
          </main>
          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Search components and documentation..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Actions">
                <CommandItem>Toggle Theme</CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
          <Toaster />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
