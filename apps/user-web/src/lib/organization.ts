import { authClient } from "#/lib/auth-client";

/** Shared org types and helpers — prefer Better Auth APIs over custom RBAC. */

export type OrgRole = "owner" | "admin" | "member";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt?: Date | string;
  metadata?: Record<string, unknown> | null;
};

export type OrgMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt?: Date | string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
};

export type OrgInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  organizationId: string;
  expiresAt?: Date | string;
  inviterId?: string;
};

export type OrgTeam = {
  id: string;
  name: string;
  organizationId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string | null;
};

export type FullOrganization = OrganizationSummary & {
  members: OrgMember[];
  invitations?: OrgInvitation[];
  teams?: OrgTeam[];
};

export type InvitationDetails = {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  inviterId: string;
  status: string;
  expiresAt: Date | string;
  organizationName: string;
  organizationSlug: string;
  inviterEmail: string;
};

/** Default permissions used by BA access control (see better-auth organization access). */
export type OrgPermissionMap = {
  organization?: Array<"update" | "delete">;
  member?: Array<"create" | "update" | "delete">;
  invitation?: Array<"create" | "cancel">;
  team?: Array<"create" | "update" | "delete">;
};

export function slugifyOrgName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function clientErrorMessage(
  error: { message?: string | null; statusText?: string } | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;
  return error.message || error.statusText || fallback;
}

export function memberRoles(role: string): OrgRole[] {
  return role
    .split(",")
    .map((r) => r.trim())
    .filter((r): r is OrgRole => r === "owner" || r === "admin" || r === "member");
}

/**
 * Client-side permission check via Better Auth `checkRolePermission`
 * (static AC — same statements as server). Prefer this over hand-rolled role checks.
 */
export function roleHasPermission(role: string, permissions: OrgPermissionMap): boolean {
  const roles = memberRoles(role);
  if (roles.length === 0) return false;
  return roles.some((r) =>
    authClient.organization.checkRolePermission({
      role: r,
      permissions,
    }),
  );
}

export function canUpdateOrganization(role: string): boolean {
  return roleHasPermission(role, { organization: ["update"] });
}

export function canDeleteOrganization(role: string): boolean {
  return roleHasPermission(role, { organization: ["delete"] });
}

export function canManageMembers(role: string): boolean {
  return roleHasPermission(role, { member: ["create", "update", "delete"] });
}

export function canInviteMembers(role: string): boolean {
  return roleHasPermission(role, { invitation: ["create"] });
}

export function canManageTeams(role: string): boolean {
  return roleHasPermission(role, { team: ["create", "update", "delete"] });
}

export const ORG_ROLE_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

export async function checkSlugAvailable(slug: string): Promise<{
  available: boolean;
  message?: string;
}> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { available: false, message: "Slug is required" };
  }
  const res = await authClient.organization.checkSlug({ slug: trimmed });
  if (res.error) {
    return {
      available: false,
      message: clientErrorMessage(res.error, "Slug is already taken"),
    };
  }
  // BA returns { status: true } when available
  const status = (res.data as { status?: boolean } | null)?.status;
  return { available: status !== false };
}
