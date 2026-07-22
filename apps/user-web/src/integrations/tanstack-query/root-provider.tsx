import { QueryClient } from "@tanstack/react-query";

import type { TenantContext } from "#/lib/tenant";

export function getContext() {
  const queryClient = new QueryClient();

  return {
    queryClient,
    /** Filled in root beforeLoad via Host → org slug resolve. */
    tenant: null as TenantContext | null,
  };
}
export default function TanstackQueryProvider() {}
