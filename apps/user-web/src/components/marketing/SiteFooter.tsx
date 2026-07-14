import { Link } from "@tanstack/react-router";
import { Separator } from "@workspace/ui/components/separator";

import { demoNav, marketingNav, productNav } from "#/lib/nav";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link
              to="/"
              preload="intent"
              className="inline-flex items-center gap-2 font-semibold tracking-tight no-underline"
            >
              <span className="size-2 rounded-full bg-primary" />
              Starter
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Premium multi-app kit on TanStack Start, Cloudflare, and{" "}
              <span className="text-foreground">@workspace/ui</span> — shadcn primitives plus
              Watermelon compositions.
            </p>
          </div>

          <FooterColumn title="Explore" items={marketingNav} />
          <FooterColumn title="Product" items={productNav.slice(0, 4)} />
          <FooterColumn title="Demos" items={demoNav.slice(0, 5)} />
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Starter. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://tanstack.com/start"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              TanStack Start
            </a>
            <a
              href="https://ui.watermelon.sh"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Watermelon UI
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{ to: string; label: string; [key: string]: unknown }>;
}) {
  return (
    <div className="lg:col-span-2">
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map(({ label, ...link }) => (
          <li key={String(link.to)}>
            <Link
              {...(link as { to: "/" })}
              preload="intent"
              className="text-sm text-muted-foreground no-underline transition hover:text-foreground"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
