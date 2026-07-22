import { useRouter } from "@tanstack/react-router";
import { InboxButton } from "better-inbox/react";

import { authClient } from "#/lib/auth-client";

/** Bell + panel for authenticated admin console chrome. */
export function AuthInboxButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <InboxButton
      client={authClient}
      className={className}
      onNavigate={(href) => {
        if (href.startsWith("http://") || href.startsWith("https://")) {
          window.location.href = href;
          return;
        }
        router.history.push(href);
      }}
    />
  );
}
