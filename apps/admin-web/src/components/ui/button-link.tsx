import { Link } from "@tanstack/react-router";
import type { LinkComponentProps } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

type ButtonLinkProps = LinkComponentProps<"a"> &
  Pick<ButtonProps, "variant" | "size" | "className" | "disabled">;

/**
 * Type-safe internal CTA: package-ui Button chrome + TanStack Link navigation.
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
