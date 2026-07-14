import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_protected/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-neutral-500">Signed in with Better Auth (admin)</p>
      </div>

      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-neutral-500">{user.email}</p>
      </div>

      <button
        type="button"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
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
      </button>
    </main>
  );
}
