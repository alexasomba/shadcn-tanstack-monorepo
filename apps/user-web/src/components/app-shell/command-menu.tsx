import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { useEffect, useState } from "react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                void navigate({ to: "/" });
              })
            }
          >
            Home
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                void navigate({ to: "/dashboard" });
              })
            }
          >
            Dashboard
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                void navigate({ to: "/demo/better-auth" });
              })
            }
          >
            Auth Demo
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
