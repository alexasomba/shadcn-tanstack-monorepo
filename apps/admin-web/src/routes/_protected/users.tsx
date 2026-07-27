import {
  MagnifyingGlassIcon,
  ProhibitIcon,
  CheckCircleIcon,
  UserSwitchIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useState } from "react";
import type { FormEvent } from "react";

import {
  banAdminUser,
  createAdminUser,
  impersonateAdminUser,
  listAdminUsers,
  setAdminUserRole,
  unbanAdminUser,
} from "#/lib/admin.queries";
import type { AdminUser } from "#/lib/admin.queries";

export const Route = createFileRoute("/_protected/users")({
  component: UsersAdminPage,
  head: () => ({
    meta: [{ title: "Admin · Users" }],
  }),
});

const PAGE_SIZE = 20;

function UsersAdminPage() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"email" | "name">("email");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"user" | "admin">("user");
  const [createBusy, setCreateBusy] = useState(false);

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["admin-users", { offset, search, searchField }],
    queryFn: () => listAdminUsers({ limit: PAGE_SIZE, offset, search, searchField }),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const displayError = queryError ? queryError.message : error;

  const runAction = async (userId: string, action: () => Promise<unknown>) => {
    setBusyId(userId);
    setError("");
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      setError(
        e && typeof e === "object" && "message" in e && typeof e.message === "string"
          ? String((e as { message: string }).message)
          : "Action failed",
      );
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateBusy(true);
    setError("");
    try {
      await createAdminUser({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      });
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("user");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? String((err as { message: string }).message)
          : "Create failed",
      );
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Better Auth{" "}
          <a
            href="https://www.better-auth.com/docs/plugins/admin"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            admin plugin
          </a>
          : create, roles, bans, sessions, impersonation.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Create user</CardTitle>
          <CardDescription>
            POST /admin/create-user — optional role defaults to <code>user</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            onSubmit={(e) => void onCreate(e)}
          >
            <Input
              placeholder="Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
              disabled={createBusy}
            />
            <Input
              type="email"
              placeholder="Email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              required
              disabled={createBusy}
            />
            <Input
              type="password"
              placeholder="Password (min 12 in kit)"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              required
              minLength={12}
              disabled={createBusy}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value as "user" | "admin")}
              disabled={createBusy}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <Button type="submit" disabled={createBusy}>
              {createBusy ? "Creating…" : "Create"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Directory</CardTitle>
          <CardDescription>
            {total} user{total === 1 ? "" : "s"} · page {currentPage} of {totalPages} · limit{" "}
            {PAGE_SIZE}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
              setOffset(0);
            }}
          >
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchField === "email" ? "Search by email…" : "Search by name…"}
                className="pl-9"
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as "email" | "name")}
            >
              <option value="email">email</option>
              <option value="name">name</option>
            </select>
            <Button type="submit" disabled={isLoading}>
              Search
            </Button>
          </form>

          {displayError ? (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user: AdminUser) => {
                    const busy = busyId === user.id;
                    const isAdmin = (user.role ?? "").split(",").includes("admin");
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Link
                            to="/users/$userId"
                            params={{ userId: user.id }}
                            preload="intent"
                            className="block min-w-0 no-underline hover:opacity-80"
                          >
                            <p className="truncate font-medium text-foreground">
                              {user.name || "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                              {user.id}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isAdmin ? "default" : "secondary"}>
                            {user.role || "user"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.banned ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <ButtonLink
                              size="sm"
                              variant="ghost"
                              to="/users/$userId"
                              params={{ userId: user.id }}
                            >
                              <ArrowRightIcon className="size-4" />
                              Detail
                            </ButtonLink>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              title={isAdmin ? "Demote to user" : "Promote to admin"}
                              onClick={() =>
                                void runAction(user.id, () =>
                                  setAdminUserRole(user.id, isAdmin ? "user" : "admin"),
                                )
                              }
                            >
                              <ShieldCheckIcon className="size-4" />
                              {isAdmin ? "User" : "Admin"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void runAction(user.id, () =>
                                  user.banned
                                    ? unbanAdminUser(user.id)
                                    : banAdminUser(user.id, "Banned by admin console"),
                                )
                              }
                            >
                              {user.banned ? (
                                <CheckCircleIcon className="size-4" />
                              ) : (
                                <ProhibitIcon className="size-4" />
                              )}
                              {user.banned ? "Unban" : "Ban"}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy || Boolean(user.banned)}
                              onClick={() =>
                                void runAction(user.id, async () => {
                                  await impersonateAdminUser(user.id);
                                  window.location.href = "/dashboard";
                                })
                              }
                            >
                              <UserSwitchIcon className="size-4" />
                              Impersonate
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || offset <= 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
