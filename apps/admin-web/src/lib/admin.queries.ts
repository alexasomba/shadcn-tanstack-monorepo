/**
 * Better Auth admin plugin client wrappers.
 * API shapes follow the official Admin docs:
 * https://www.better-auth.com/docs/plugins/admin
 */
import { authClient } from "#/lib/auth-client";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean | null;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type AdminUserSession = {
  id: string;
  token?: string;
  userId?: string;
  createdAt?: Date | string;
  expiresAt?: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  impersonatedBy?: string | null;
};

export type ListAdminUsersResult = {
  users: Array<AdminUser>;
  total: number;
  limit?: number;
  offset?: number;
};

function errMsg(
  error: { message?: string | null; statusText?: string } | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;
  return error.message || error.statusText || fallback;
}

async function unwrapAdmin<T>(
  promise: Promise<{ data: T; error: { message?: string | null; statusText?: string } | null }>,
  fallback: string,
): Promise<T> {
  const res = await promise;
  if (res.error) throw new Error(errMsg(res.error, fallback));
  return res.data;
}

/** GET /admin/list-users */
export async function listAdminUsers(input: {
  limit?: number;
  offset?: number;
  search?: string;
  searchField?: "email" | "name";
}): Promise<ListAdminUsersResult> {
  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;
  const result = await unwrapAdmin(
    authClient.admin.listUsers({
      query: {
        limit,
        offset,
        ...(input.search?.trim()
          ? {
              searchValue: input.search.trim(),
              searchField: input.searchField ?? "email",
              searchOperator: "contains" as const,
            }
          : {}),
        sortBy: "createdAt",
        sortDirection: "desc" as const,
      },
    }),
    "Failed to list users",
  );
  const data = result as ListAdminUsersResult | null;
  return {
    users: data?.users ?? [],
    total: data?.total ?? 0,
    limit: data?.limit ?? limit,
    offset: data?.offset ?? offset,
  };
}

/**
 * GET /admin/get-user?id=
 * Docs: `data` is the User object (handler returns parseUserOutput, not nested).
 */
export async function getAdminUser(userId: string): Promise<AdminUser> {
  try {
    const result = await unwrapAdmin(
      authClient.admin.getUser({ query: { id: userId } }),
      "Failed to load user",
    );
    if (result && typeof result === "object") {
      if ("user" in result) {
        return (result as { user: AdminUser }).user;
      }
      if ("id" in result) {
        return result as AdminUser;
      }
    }
  } catch {
    // Fall through — filter by id when getUser is unavailable.
  }

  // Prefer exact id match via listUsers filter.
  try {
    const byId = await unwrapAdmin(
      authClient.admin.listUsers({
        query: {
          limit: 50,
          offset: 0,
          filterField: "id",
          filterValue: userId,
          filterOperator: "eq",
        },
      }) as Promise<{
        data: ListAdminUsersResult | null;
        error: { message?: string | null; statusText?: string } | null;
      }>,
      "Failed to load user",
    );
    if (byId?.users !== undefined && byId.users.length > 0) {
      return byId.users[0];
    }
  } catch {
    // ignore
  }

  const listed = await listAdminUsers({ limit: 100, offset: 0 });
  const found = listed.users.find((u) => u.id === userId);
  if (found === undefined) throw new Error("User not found");
  return found;
}

/** POST /admin/create-user */
export async function createAdminUser(input: {
  email: string;
  password: string;
  name: string;
  role?: string | Array<string>;
}) {
  return unwrapAdmin(
    authClient.admin.createUser({
      email: input.email,
      password: input.password,
      name: input.name,
      ...(input.role !== undefined ? { role: input.role } : {}),
    }),
    "Failed to create user",
  );
}

/** POST /admin/update-user */
export async function updateAdminUser(userId: string, data: Record<string, unknown>) {
  return unwrapAdmin(authClient.admin.updateUser({ userId, data }), "Failed to update user");
}

/** POST /admin/set-user-password */
export async function setAdminUserPassword(userId: string, newPassword: string) {
  return unwrapAdmin(
    authClient.admin.setUserPassword({ userId, newPassword }),
    "Failed to set password",
  );
}

/** POST /admin/list-user-sessions */
export async function listAdminUserSessions(userId: string): Promise<Array<AdminUserSession>> {
  const result = await unwrapAdmin(
    authClient.admin.listUserSessions({ userId }),
    "Failed to list sessions",
  );
  if (result && typeof result === "object" && "sessions" in result) {
    const list = (result as { sessions?: Array<AdminUserSession> }).sessions;
    return Array.isArray(list) ? list : [];
  }
  return Array.isArray(result) ? (result as Array<AdminUserSession>) : [];
}

/** POST /admin/set-role */
export async function setAdminUserRole(userId: string, role: string | Array<string>) {
  return unwrapAdmin(authClient.admin.setRole({ userId, role }), "Failed to set role");
}

/** POST /admin/ban-user — revokes all sessions server-side */
export async function banAdminUser(userId: string, banReason?: string, banExpiresIn?: number) {
  return unwrapAdmin(
    authClient.admin.banUser({
      userId,
      ...(banReason ? { banReason } : {}),
      ...(banExpiresIn !== undefined ? { banExpiresIn } : {}),
    }),
    "Failed to ban user",
  );
}

/** POST /admin/unban-user */
export async function unbanAdminUser(userId: string) {
  return unwrapAdmin(authClient.admin.unbanUser({ userId }), "Failed to unban user");
}

/** POST /admin/impersonate-user — session duration from server plugin config */
export async function impersonateAdminUser(userId: string) {
  return unwrapAdmin(authClient.admin.impersonateUser({ userId }), "Failed to impersonate user");
}

/** POST /admin/stop-impersonating */
export async function stopImpersonating() {
  return unwrapAdmin(authClient.admin.stopImpersonating(), "Failed to stop impersonation");
}

/** POST /admin/revoke-user-sessions */
export async function revokeAllUserSessions(userId: string) {
  return unwrapAdmin(authClient.admin.revokeUserSessions({ userId }), "Failed to revoke sessions");
}

/** POST /admin/revoke-user-session */
export async function revokeUserSession(sessionToken: string) {
  return unwrapAdmin(
    authClient.admin.revokeUserSession({ sessionToken }),
    "Failed to revoke session",
  );
}

/** POST /admin/remove-user — hard delete */
export async function removeAdminUser(userId: string) {
  return unwrapAdmin(authClient.admin.removeUser({ userId }), "Failed to remove user");
}

/**
 * Client-side role permission check (sync, no network).
 * Uses default admin/user statements from the admin client plugin.
 */
export function adminRoleHasPermission(
  role: string,
  permissions: Record<string, Array<string>>,
): boolean {
  try {
    return Boolean(
      authClient.admin.checkRolePermission({
        role,
        permissions,
      }),
    );
  } catch {
    return role === "admin";
  }
}
