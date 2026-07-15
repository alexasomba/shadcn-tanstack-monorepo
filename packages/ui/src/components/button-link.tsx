import { Link } from "@tanstack/react-router";
import type { LinkComponentProps } from "@tanstack/react-router";
import type { ComponentProps } from "react";

import { Button } from "./button";

type ButtonProps = ComponentProps<typeof Button>;

type ButtonLinkProps = LinkComponentProps<"a"> &
  Pick<ButtonProps, "variant" | "size" | "className" | "disabled">;

/**
 * Type-safe internal CTA: package-ui Button chrome + TanStack Link navigation.
 * Prefer over raw <a href> and over useNavigate for clickable elements.
 */
export function ButtonLink({
  variant,
  size,
  className,
  disabled,
  children,
  ...linkProps
}: ButtonLinkProps) {
  return (
    <Button variant={variant} size={size} className={className} disabled={disabled} asChild>
      <Link preload="intent" {...linkProps}>
        {children}
      </Link>
    </Button>
  );
}
