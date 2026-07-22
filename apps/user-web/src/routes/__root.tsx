import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@workspace/ui/components/theme-provider";

import { tenantDocumentTitle } from "#/lib/tenant";
import { getTenant } from "#/lib/tenant.functions";
import type { TenantContext } from "#/lib/tenant.functions";
import { getLocale } from "#/paraglide/runtime";

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

  head: ({ match }) => {
    const tenant = match.context.tenant ?? null;
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
          title: tenantDocumentTitle(tenant, "Starter"),
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
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background font-sans [overflow-wrap:anywhere] text-foreground antialiased selection:bg-[rgba(79,184,178,0.24)]">
        <ThemeProvider defaultTheme="system" storageKey="theme">
          {children}
        </ThemeProvider>
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
