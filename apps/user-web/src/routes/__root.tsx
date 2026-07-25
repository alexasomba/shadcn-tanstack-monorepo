import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Link, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Button } from "@workspace/ui/components/button";
import { ThemeProvider } from "@workspace/ui/components/theme-provider";
import { Toaster } from "sonner";

import { AppErrorBoundary } from "#/components/app-error-boundary";
import { CommandMenu } from "#/components/app-shell/command-menu";
import { useThemeHotkey } from "#/hooks/use-theme-hotkey";
import { getTenant } from "#/lib/tenant.functions";
import type { TenantContext } from "#/lib/tenant.functions";
import { getLocale } from "#/paraglide/runtime";

import "../../content-collections";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import StoreDevtools from "../lib/demo-store-devtools";

import appCss from "../styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
  /** Host-mapped org (custom domain or {slug}.PLATFORM_BASE_DOMAIN), else null. */
  tenant: TenantContext | null;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    // Other redirect strategies are possible; see
    // https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", getLocale());
    }

    // Host → organization.slug (D1; null on primary platform host)
    let tenant: TenantContext | null = null;
    try {
      tenant = await getTenant();
    } catch (err) {
      console.warn("[root] tenant resolve failed", err);
    }
    return { tenant };
  },

  head: () => {
    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: "Starter Application",
        },
        {
          name: "title",
          content: "Starter Application",
        },
        {
          name: "description",
          content:
            "A modern React web application built with TanStack Start, Tailwind, and shadcn UI components.",
        },
        {
          property: "og:title",
          content: "Starter Application",
        },
        {
          property: "og:description",
          content:
            "A modern React web application built with TanStack Start, Tailwind, and shadcn UI components.",
        },
        {
          property: "og:image",
          content: "https://user-web.app/og-image.png",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "twitter:title",
          content: "Starter Application",
        },
        {
          name: "twitter:description",
          content:
            "A modern React web application built with TanStack Start, Tailwind, and shadcn UI components.",
        },
        {
          name: "twitter:image",
          content: "https://user-web.app/og-image.png",
        },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
      ],
    };
  },
  errorComponent: ({ error }: { error: Error }) => (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button type="button" onClick={() => window.location.reload()} className="mt-4">
        Try again
      </Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-extrabold">404</h1>
      <p className="mt-2 text-lg font-medium text-muted-foreground">Page Not Found</p>
      <Link
        to="/"
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Return Home
      </Link>
    </div>
  ),
  shellComponent: RootDocument,
});

function AppShellContent({ children }: { children: React.ReactNode }) {
  useThemeHotkey();
  return (
    <>
      {children}
      <CommandMenu />
      <Toaster />
    </>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background font-sans [overflow-wrap:anywhere] text-foreground antialiased selection:bg-[rgba(79,184,178,0.24)]">
        <AppErrorBoundary>
          <ThemeProvider defaultTheme="system" storageKey="theme">
            <AppShellContent>{children}</AppShellContent>
          </ThemeProvider>
        </AppErrorBoundary>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            StoreDevtools,
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
