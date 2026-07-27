/**
 * Helpers for Better Auth admin plugin roles.
 * Roles may be a single string or comma-separated multi-role string.
 */

export function parseUserRoles(role: string | Array<string> | null | undefined): Array<string> {
  if (!role) return [];
  if (Array.isArray(role)) {
    return role.map((r) => r.trim()).filter(Boolean);
  }
  return role
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

/** True when the user has the `admin` role (or any role in `adminRoles`). */
export function userHasAdminRole(
  user: { role?: string | Array<string> | null },
  adminRoles: Array<string> = ["admin"],
): boolean {
  const roles = parseUserRoles(user.role);
  const allowed = new Set(adminRoles.map((r) => r.toLowerCase()));
  return roles.some((r) => allowed.has(r.toLowerCase()));
}

/** Admin if role matches or user id is in the bootstrap adminUserIds list. */
export function isAdminUser(
  user: { id: string; role?: string | Array<string> | null },
  options?: { adminRoles?: Array<string>; adminUserIds?: Array<string> },
): boolean {
  if (userHasAdminRole(user, options?.adminRoles ?? ["admin"])) {
    return true;
  }
  const ids = options?.adminUserIds ?? [];
  return ids.includes(user.id);
}
