import {
  ArrowLeftIcon,
  ProhibitIcon,
  CheckCircleIcon,
  UserSwitchIcon,
  ShieldCheckIcon,
  SignOutIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useEffect, useState } from "react";

import {
  banAdminUser,
  getAdminUser,
  impersonateAdminUser,
  listAdminUserSessions,
  removeAdminUser,
  revokeAllUserSessions,
  revokeUserSession,
  setAdminUserPassword,
  setAdminUserRole,
  unbanAdminUser,
  updateAdminUser,
} from "#/lib/admin.queries";
import type { AdminUser } from "#/lib/admin.queries";

export const Route = createFileRoute("/_protected/users/$userId")({
  component: UserDetailPage,
  head: () => ({
    meta: [{ title: "Admin · User detail" }],
  }),
});

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { user: sessionUser } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [banReason, setBanReason] = useState("Banned by admin console");
  /** Ban duration in seconds; empty = never expires (docs default). */
  const [banExpiresDays, setBanExpiresDays] = useState("");
  const [editName, setEditName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const userQuery = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getAdminUser(userId),
  });

  const sessionsQuery = useQuery({
    queryKey: ["admin-user-sessions", userId],
    queryFn: () => listAdminUserSessions(userId),
  });

  const user: AdminUser | undefined = userQuery.data;
  const sessions = sessionsQuery.data ?? [];
  const isSelf = sessionUser.id === userId;
  const isAdmin = (user?.role ?? "").split(",").includes("admin");

  useEffect(() => {
    if (user?.name) setEditName(user.name);
  }, [user?.id, user?.name]);

  const run = async (fn: () => Promise<unknown>, ok: string, reload = true) => {
    setBusy(true);
    setBanner(null);
    try {
      await fn();
      setBanner({ type: "ok", text: ok });
      if (reload) {
        await queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
        await queryClient.invalidateQueries({ queryKey: ["admin-user-sessions", userId] });
        await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      }
    } catch (e) {
      setBanner({
        type: "err",
        text:
          e && typeof e === "object" && "message" in e && typeof e.message === "string"
            ? String((e as { message: string }).message)
            : "Action failed",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink to="/users" variant="outline" size="sm">
          <ArrowLeftIcon className="size-4" />
          Users
        </ButtonLink>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User detail</h1>
          <p className="font-mono text-xs text-muted-foreground">{userId}</p>
        </div>
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

      {userQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading user…</p>
      ) : userQuery.error || !user ? (
        <Card className="border-border/70">
          <CardContent className="pt-6 text-sm text-destructive">
            {userQuery.error &&
            typeof userQuery.error === "object" &&
            "message" in userQuery.error &&
            typeof (userQuery.error as { message: unknown }).message === "string"
              ? String((userQuery.error as { message: string }).message)
              : "User not found or admin API unavailable."}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">{user.name || "Unnamed"}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <Badge variant={isAdmin ? "default" : "secondary"} className="mt-1">
                    {user.role || "user"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {user.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email verified</p>
                  <p>{user.emailVerified ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p>{formatDate(user.createdAt)}</p>
                </div>
                {user.banned ? (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Ban reason</p>
                      <p>{user.banReason || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ban expires</p>
                      <p>{formatDate(user.banExpires)}</p>
                    </div>
                  </>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">Update profile</p>
                <p className="text-xs text-muted-foreground">
                  POST /admin/update-user — password must use set-user-password, not update.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !editName.trim() || editName === user.name}
                    onClick={() =>
                      void run(
                        () => updateAdminUser(user.id, { name: editName.trim() }),
                        "Name updated",
                      )
                    }
                  >
                    Save name
                  </Button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="new-password">Set password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 12 characters (kit policy)"
                      minLength={12}
                      disabled={busy}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || newPassword.length < 12}
                    onClick={() =>
                      void run(async () => {
                        await setAdminUserPassword(user.id, newPassword);
                        setNewPassword("");
                      }, "Password set")
                    }
                  >
                    Set password
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || isSelf}
                  onClick={() =>
                    void run(
                      () => setAdminUserRole(user.id, isAdmin ? "user" : "admin"),
                      isAdmin ? "Demoted to user" : "Promoted to admin",
                    )
                  }
                >
                  <ShieldCheckIcon className="size-4" />
                  {isAdmin ? "Demote to user" : "Promote to admin"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || Boolean(user.banned) || isSelf}
                  onClick={() =>
                    void run(
                      async () => {
                        await impersonateAdminUser(user.id);
                        window.location.href = "/dashboard";
                      },
                      "Impersonating…",
                      false,
                    )
                  }
                >
                  <UserSwitchIcon className="size-4" />
                  Impersonate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || isSelf}
                  onClick={() =>
                    void run(() => revokeAllUserSessions(user.id), "All sessions revoked")
                  }
                >
                  <SignOutIcon className="size-4" />
                  Revoke all sessions
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">Ban / unban</p>
                <p className="text-xs text-muted-foreground">
                  Ban revokes all sessions. Optional expiry in days (omit for permanent).
                </p>
                {!user.banned ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="ban-reason">Reason</Label>
                      <Input
                        id="ban-reason"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        disabled={busy || isSelf}
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label htmlFor="ban-days">Days</Label>
                      <Input
                        id="ban-days"
                        type="number"
                        min={1}
                        placeholder="∞"
                        value={banExpiresDays}
                        onChange={(e) => setBanExpiresDays(e.target.value)}
                        disabled={busy || isSelf}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy || isSelf || !banReason.trim()}
                      onClick={() => {
                        const days = Number(banExpiresDays);
                        const banExpiresIn =
                          banExpiresDays.trim() && Number.isFinite(days) && days > 0
                            ? Math.floor(days * 24 * 60 * 60)
                            : undefined;
                        void run(
                          () => banAdminUser(user.id, banReason.trim(), banExpiresIn),
                          "User banned (sessions cleared)",
                        );
                      }}
                    >
                      <ProhibitIcon className="size-4" />
                      Ban user
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void run(() => unbanAdminUser(user.id), "User unbanned")}
                  >
                    <CheckCircleIcon className="size-4" />
                    Unban user
                  </Button>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Danger zone</p>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy || isSelf}
                  onClick={() => {
                    const ok = window.confirm(
                      `Permanently delete ${user.email}? This cannot be undone.`,
                    );
                    if (!ok) return;
                    void run(
                      async () => {
                        await removeAdminUser(user.id);
                        window.location.href = "/users";
                      },
                      "User removed",
                      false,
                    );
                  }}
                >
                  <TrashIcon className="size-4" />
                  Delete user
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Sessions</CardTitle>
              <CardDescription>
                Active sessions for this account (revoke one or all).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading sessions…</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions returned.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>IP / Agent</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s) => (
                        <TableRow key={s.id || s.token}>
                          <TableCell className="text-xs">{formatDate(s.createdAt)}</TableCell>
                          <TableCell className="text-xs">{formatDate(s.expiresAt)}</TableCell>
                          <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground">
                            {s.ipAddress || "—"}
                            {s.userAgent ? (
                              <span className="block truncate">{s.userAgent}</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy || !s.token}
                              onClick={() => {
                                if (!s.token) return;
                                void run(
                                  () => revokeUserSession(s.token as string),
                                  "Session revoked",
                                );
                              }}
                            >
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
