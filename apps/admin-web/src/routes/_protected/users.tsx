import {
  MagnifyingGlassIcon,
  ProhibitIcon,
  CheckCircleIcon,
  UserSwitchIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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

import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_protected/users")({
  component: UsersAdminPage,
  head: () => ({
    meta: [{ title: "Admin · Users" }],
  }),
});

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt?: Date | string;
};

const PAGE_SIZE = 20;

function UsersAdminPage() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery<{
    users: AdminUser[];
    total: number;
  }>({
    queryKey: ["admin-users", { offset, search }],
    queryFn: async () => {
      const result = await authClient.admin.listUsers({
        query: {
          limit: PAGE_SIZE,
          offset,
          ...(search.trim()
            ? {
                searchValue: search.trim(),
                searchField: "email" as const,
                searchOperator: "contains" as const,
              }
            : {}),
          sortBy: "createdAt",
          sortDirection: "desc" as const,
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to list users");
      }

      const listData = result.data as {
        users?: Array<AdminUser>;
        total?: number;
      } | null;

      return {
        users: listData?.users ?? [],
        total: listData?.total ?? 0,
      };
    },
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const displayError = queryError ? queryError.message : error;

  const runAction = async (
    userId: string,
    action: () => Promise<{ error?: { message?: string } | null }>,
  ) => {
    setBusyId(userId);
    setError("");
    try {
      const result = await action();
      if (result.error) {
        setError(result.error.message || "Action failed");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      setError("Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage accounts with the Better Auth admin plugin (roles, bans, impersonation).
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Directory</CardTitle>
          <CardDescription>
            {total} user{total === 1 ? "" : "s"} · page {currentPage} of {totalPages}
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
                placeholder="Search by email…"
                className="pl-9"
              />
            </div>
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
                  users.map((user) => {
                    const busy = busyId === user.id;
                    const isAdmin = (user.role ?? "").split(",").includes("admin");
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{user.name || "—"}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                              {user.id}
                            </p>
                          </div>
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
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              title={isAdmin ? "Demote to user" : "Promote to admin"}
                              onClick={() =>
                                void runAction(user.id, () =>
                                  authClient.admin.setRole({
                                    userId: user.id,
                                    role: isAdmin ? "user" : "admin",
                                  }),
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
                                    ? authClient.admin.unbanUser({ userId: user.id })
                                    : authClient.admin.banUser({
                                        userId: user.id,
                                        banReason: "Banned by admin console",
                                      }),
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
                                  const result = await authClient.admin.impersonateUser({
                                    userId: user.id,
                                  });
                                  if (!result.error) {
                                    window.location.href = "/dashboard";
                                  }
                                  return result;
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
