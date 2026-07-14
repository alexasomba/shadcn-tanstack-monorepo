import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { getReferralOverview } from "#/lib/referrals.functions";

export const Route = createFileRoute("/_protected/referrals")({
  loader: () => getReferralOverview(),
  component: ReferralsAdminPage,
  head: () => ({
    meta: [{ title: "Admin · Referrals" }],
  }),
});

function ReferralsAdminPage() {
  const { total, leaderboard, recent } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of user-web invite attribution. End users manage codes on their account
          page.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Total attributed signups</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 sm:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Product surface</CardDescription>
            <CardTitle className="text-base font-medium">
              Referral codes &amp; invite links live on <span className="font-mono">user-web</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">Top referrers</CardTitle>
          <CardDescription>Users who drove the most signups via invite codes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No referrals yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaderboard.map((row) => (
                    <TableRow key={row.referrerUserId}>
                      <TableCell>
                        <p className="font-medium">{row.referrerName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{row.referrerEmail}</p>
                      </TableCell>
                      <TableCell>
                        {row.code ? (
                          <Badge variant="secondary" className="font-mono">
                            {row.code}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {row.totalReferrals}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
          <CardDescription>Latest referred signups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Referred</TableHead>
                  <TableHead>Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No referral activity yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{row.referrerEmail}</TableCell>
                      <TableCell className="text-sm">{row.referredEmail}</TableCell>
                      <TableCell>
                        {row.code ? <span className="font-mono text-xs">{row.code}</span> : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
