import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";

import { authClient } from "#/lib/auth-client";

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <ButtonLink to="/account" variant="outline" size="sm" className="rounded-full">
          {session.user.name.split(" ")[0] || "Account"}
        </ButtonLink>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={() => {
            void authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/login";
                },
              },
            });
          }}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <ButtonLink to="/login" size="sm" className="rounded-full">
      Sign in
    </ButtonLink>
  );
}
