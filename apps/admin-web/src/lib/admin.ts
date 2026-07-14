import { isAdminUser, readAdminUserIds } from "data-ops";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | string[] | null;
  banned?: boolean | null;
};

/**
 * Whether this session may use admin-web console + admin plugin APIs.
 * While impersonating, keep console access so the admin can stop impersonation.
 */
export function canAccessAdminConsole(user: SessionUser, session?: object | null): boolean {
  const impersonatedBy =
    session && "impersonatedBy" in session
      ? (session as { impersonatedBy?: string | null }).impersonatedBy
      : undefined;

  if (impersonatedBy) {
    return true;
  }

  return isAdminUser(
    { id: user.id, role: user.role },
    {
      adminRoles: ["admin"],
      adminUserIds: readAdminUserIds(),
    },
  );
}
