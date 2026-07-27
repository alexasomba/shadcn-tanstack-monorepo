import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";

export interface TypesetProps extends React.HTMLAttributes<HTMLDivElement> {
  preset?: "docs" | "chat" | "reading" | "compact" | "large";
}

export function Typeset({ className, preset = "docs", ...props }: TypesetProps) {
  return <div className={cn("typeset", preset && `typeset-${preset}`, className)} {...props} />;
}
