import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useEffect, useState } from "react";

import { authClient } from "#/lib/auth-client";

type ReferralDashboard = {
  code: string;
  stats: {
    joinedToday: number;
    total: number;
  };
};

type ReferredUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type ReferralRecord = {
  id: string;
  createdAt: Date | string;
  referredUser: ReferredUser;
};

/**
 * User-web referral dashboard (Better Auth referral plugin).
 * Codes + invite links for end users; admin-web has a separate read-only overview.
 */
export function ReferralCard() {
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [referrals, setReferrals] = useState<Array<ReferralRecord>>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [dash, list] = await Promise.all([
          authClient.referrals(),
          authClient.referrals.listReferrals({
            query: { limit: 10, offset: 0 },
          }),
        ]);
        if (cancelled) return;
        if (dash.error) {
          setError(dash.error.message || "Could not load referral dashboard");
          return;
        }
        setDashboard(dash.data);

        if (!list.error && list.data) {
          const data = list.data as { referrals?: Array<ReferralRecord> };
          setReferrals(data.referrals ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load referral dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const shareUrl =
    typeof window !== "undefined" && dashboard?.code
      ? `${window.location.origin}/login?ref=${dashboard.code}`
      : "";

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Referrals</CardTitle>
        <CardDescription>Share your invite code. Track who signed up with it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Loading referral code…</p> : null}

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        {dashboard ? (
          <>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Your code
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-widest">
                {dashboard.code}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  Total: <strong className="text-foreground">{dashboard.stats.total}</strong>
                </span>
                <span>
                  Today: <strong className="text-foreground">{dashboard.stats.joinedToday}</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => void copyShareLink()}
              >
                {copied ? "Copied" : "Copy invite link"}
              </Button>
            </div>

            {shareUrl ? (
              <p className="font-mono text-xs break-all text-muted-foreground">{shareUrl}</p>
            ) : null}

            {referrals.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Recent signups
                </p>
                <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
                  {referrals.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.referredUser.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.referredUser.email}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
