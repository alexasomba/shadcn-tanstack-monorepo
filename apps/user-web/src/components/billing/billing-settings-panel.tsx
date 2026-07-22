import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { useCallback, useEffect, useState } from "react";

import type { SubscriptionRecord } from "#/lib/billing";
import { formatSubDate, isActiveStatus } from "#/lib/billing";
import {
  cancelSubscription,
  listSubscriptions,
  listTransactions,
  openBillingPortal,
  restoreSubscription,
  startSubscriptionCheckout,
} from "#/lib/billing.queries";
import { resolveClientEntitlements } from "#/lib/entitlements";
import { useActiveOrganization } from "#/lib/organization.queries";

function unknownErrorMessage(error: unknown, fallback: string): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

type TxRow = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  plan?: string | null;
  createdAt?: Date | string;
};

export function BillingSettingsPanel(props: {
  checkoutStatus?: string;
  checkoutReference?: string;
}) {
  const orgState = useActiveOrganization();
  const org = orgState.data;

  const [subs, setSubs] = useState<SubscriptionRecord[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(() => {
    if (props.checkoutStatus === "success") {
      return {
        type: "ok",
        text: props.checkoutReference
          ? `Payment confirmed (ref ${props.checkoutReference}). Subscriptions will refresh below.`
          : "Payment confirmed. Subscriptions will refresh below.",
      };
    }
    if (props.checkoutStatus === "1") {
      return {
        type: "ok",
        text: "Returned from checkout. Confirm subscription status below (webhooks may lag).",
      };
    }
    return null;
  });

  const referenceId = org?.id;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        listSubscriptions(referenceId),
        listTransactions(referenceId),
      ]);
      setSubs(s);
      setTxs(t as TxRow[]);
    } catch (e) {
      setBanner({
        type: "err",
        text: unknownErrorMessage(e, "Failed to load billing"),
      });
      setSubs([]);
      setTxs([]);
    } finally {
      setLoading(false);
    }
  }, [referenceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setBanner(null);
    try {
      await fn();
      setBanner({ type: "ok", text: ok });
      await refresh();
    } catch (e) {
      setBanner({
        type: "err",
        text: unknownErrorMessage(e, "Something went wrong"),
      });
    } finally {
      setBusy(false);
    }
  };

  let current: SubscriptionRecord | null = null;
  for (const s of subs) {
    if (isActiveStatus(s.status)) {
      current = s;
      break;
    }
  }
  if (current === null && subs.length > 0) {
    current = subs[0];
  }
  const hasActivePaid =
    current !== null &&
    isActiveStatus(current.status) &&
    current.plan !== "free" &&
    current.paystackSubscriptionCode != null &&
    current.paystackSubscriptionCode.length > 0;

  const entitlements = resolveClientEntitlements(subs);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paystack subscriptions via Better Auth. Organization billing uses the active org as{" "}
          <code className="text-xs">referenceId</code>.
        </p>
      </div>

      {banner ? (
        <p
          className={
            banner.type === "ok"
              ? "rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm"
              : "rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          }
          role="status"
        >
          {banner.text}
        </p>
      ) : null}

      {!org ? (
        <Card className="border-border/70 shadow-none">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Select or create an organization to manage team billing. Personal checkout still works
              from Pricing.
            </p>
            <ButtonLink to="/settings/organization" size="sm">
              Organization settings
            </ButtonLink>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Current subscription</CardTitle>
          <CardDescription>
            {org ? `Organization: ${org.name}` : "No active organization"}
            {loading ? " · Loading…" : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && current === null ? (
            <p className="text-sm text-muted-foreground">No subscription on file.</p>
          ) : null}
          {current !== null ? (
            <div className="space-y-2 rounded-xl border border-border/70 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Plan:</span>{" "}
                <span className="font-medium capitalize">{current.plan}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="font-medium">{current.status ?? "—"}</span>
                {current.cancelAtPeriodEnd ? " (cancels at period end)" : ""}
              </p>
              <p>
                <span className="text-muted-foreground">Period:</span>{" "}
                {formatSubDate(current.periodStart)} → {formatSubDate(current.periodEnd)}
              </p>
              {current.paystackSubscriptionCode ? (
                <p className="font-mono text-xs text-muted-foreground">
                  {current.paystackSubscriptionCode}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/pricing" size="sm">
              View plans / upgrade
            </ButtonLink>
            {hasActivePaid && current !== null && current.paystackSubscriptionCode ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const code = current.paystackSubscriptionCode;
                      if (!code) throw new Error("Missing subscription code");
                      const portal = await openBillingPortal(code);
                      const link =
                        portal && typeof portal === "object" && "link" in portal
                          ? String((portal as { link: string }).link)
                          : null;
                      if (link) window.location.href = link;
                      else throw new Error("No manage link returned");
                    }, "Opening billing portal…")
                  }
                >
                  Manage payment method
                </Button>
                {!current.cancelAtPeriodEnd ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      const ok = window.confirm(
                        "Cancel at period end? Access continues until the period ends.",
                      );
                      if (!ok) return;
                      void run(async () => {
                        const code = current.paystackSubscriptionCode;
                        if (!code) throw new Error("Missing subscription code");
                        await cancelSubscription({
                          subscriptionCode: code,
                          emailToken: current.paystackEmailToken ?? undefined,
                          atPeriodEnd: true,
                        });
                      }, "Cancellation scheduled");
                    }}
                  >
                    Cancel at period end
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const code = current.paystackSubscriptionCode;
                        if (!code) throw new Error("Missing subscription code");
                        await restoreSubscription({
                          subscriptionCode: code,
                          emailToken: current.paystackEmailToken ?? undefined,
                        });
                      }, "Subscription restored")
                    }
                  >
                    Restore subscription
                  </Button>
                )}
              </>
            ) : null}
            {!hasActivePaid ? (
              <Button
                size="sm"
                disabled={busy || !referenceId}
                onClick={() =>
                  void run(async () => {
                    if (!referenceId) throw new Error("Select an organization first");
                    const result = await startSubscriptionCheckout({
                      plan: "pro",
                      referenceId,
                    });
                    if (result && typeof result === "object" && "kind" in result) {
                      const r = result as { kind: string; url?: string };
                      if (r.kind === "checkout" && r.url) {
                        window.location.href = r.url;
                        return;
                      }
                    }
                    throw new Error(
                      "Checkout did not return a URL. Set PAYSTACK_SECRET_KEY for live Paystack.",
                    );
                  }, "Redirecting to Paystack…")
                }
              >
                Upgrade to Pro
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Entitlements</CardTitle>
          <CardDescription>
            Feature gates for data-service (free keeps todos + API keys; R2 & domains need Pro+).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Plan:</span> {entitlements.displayName} (
            {entitlements.plan}) · {entitlements.status}
          </p>
          <p>
            <span className="text-muted-foreground">Seats / teams / API keys:</span>{" "}
            {entitlements.seats} / {entitlements.teams} / {entitlements.apiKeys}
          </p>
          <ul className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(entitlements.features).map(([feature, on]) => (
              <li key={feature} className="rounded-lg border border-border/60 px-2 py-1">
                <span className="capitalize">{feature}</span>:{" "}
                <span className={on ? "text-foreground" : "text-muted-foreground"}>
                  {on ? "included" : "upgrade"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Recent transactions</CardTitle>
          <CardDescription>Local records from the Paystack plugin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {txs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            txs.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{tx.plan ?? tx.reference}</p>
                  <p className="font-mono text-xs text-muted-foreground">{tx.reference}</p>
                </div>
                <div className="text-right text-xs">
                  <p>
                    {(tx.amount / 100).toFixed(2)} {tx.currency}
                  </p>
                  <p className="text-muted-foreground">{tx.status}</p>
                </div>
              </div>
            ))
          )}
          <Separator />
          <p className="text-xs text-muted-foreground">
            Webhooks: <code className="text-xs">POST /api/auth/paystack/webhook</code> (set{" "}
            <code className="text-xs">PAYSTACK_WEBHOOK_SECRET</code>).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
