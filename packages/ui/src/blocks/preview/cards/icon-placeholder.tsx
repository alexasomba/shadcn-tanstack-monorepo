"use client";

import * as Phosphor from "@phosphor-icons/react";
import * as React from "react";

export type IconLibraryName = "lucide" | "tabler" | "hugeicons" | "phosphor" | "remixicon";

export function IconPlaceholder({
  ...props
}: {
  [K in IconLibraryName]: string;
} & React.ComponentProps<"svg">) {
  const phosphorName = props.phosphor;

  if (!phosphorName) {
    return null;
  }

  // Strip "Icon" suffix from the name (e.g. MagnifyingGlassIcon -> MagnifyingGlass)
  const cleanName = phosphorName.endsWith("Icon") ? phosphorName.slice(0, -4) : phosphorName;

  // Resolve the icon from Phosphor React library
  const IconComponent = (Phosphor as unknown as Record<string, React.ComponentType>)[cleanName];

  if (!IconComponent) {
    console.warn(`IconPlaceholder: Icon "${cleanName}" not found in @phosphor-icons/react`);
    return null;
  }

  // Pass down svg props like className, size, etc.
  return <IconComponent {...props} />;
}
