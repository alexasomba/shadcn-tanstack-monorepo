import { UserSwitchIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";

import { stopImpersonating } from "#/lib/admin.queries";

/**
 * Shown while session.impersonatedBy is set — restore admin session.
 */
export function ImpersonationBanner({
  subjectName,
  subjectEmail,
}: {
  subjectName?: string | null;
  subjectEmail?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = subjectName || subjectEmail || "another user";

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2">
          <UserSwitchIcon className="size-4 shrink-0" />
          <span>
            Impersonating <strong>{label}</strong>
            {subjectEmail && subjectName ? (
              <span className="text-muted-foreground"> ({subjectEmail})</span>
            ) : null}
            . Actions run as this user until you stop.
          </span>
        </p>
        <div className="flex items-center gap-2">
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            className="border-amber-600/50 bg-background"
            onClick={() => {
              setBusy(true);
              setError(null);
              void stopImpersonating()
                .then(() => {
                  window.location.href = "/users";
                })
                .catch((e: unknown) => {
                  setError(
                    e && typeof e === "object" && "message" in e && typeof e.message === "string"
                      ? String((e as { message: string }).message)
                      : "Could not stop",
                  );
                  setBusy(false);
                });
            }}
          >
            {busy ? "Stopping…" : "Stop impersonating"}
          </Button>
        </div>
      </div>
    </div>
  );
}
