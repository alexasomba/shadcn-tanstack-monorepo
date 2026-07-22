/**
 * Organization data layer — prefer Better Auth reactive hooks + client methods.
 * Avoid reimplementing session/org state with React Query when BA atoms already track it.
 */
import { authClient } from "#/lib/auth-client";
import type { OrgRole } from "#/lib/organization";
import { clientErrorMessage } from "#/lib/organization";

/** BA atom hook: organizations the session user belongs to. */
export function useOrganizationsList() {
  return authClient.useListOrganizations();
}

/** BA atom hook: active organization (full: members, invitations, teams when enabled). */
export function useActiveOrganization() {
  return authClient.useActiveOrganization();
}

/** BA atom hook: current user's membership in the active org. */
export function useActiveMember() {
  return authClient.useActiveMember();
}

async function unwrapOrgCall<T>(
  promise: Promise<{ data: T; error: { message?: string | null; statusText?: string } | null }>,
  fallback: string,
): Promise<T> {
  const res = await promise;
  if (res.error) {
    throw new Error(clientErrorMessage(res.error, fallback));
  }
  return res.data;
}

export async function createOrganization(input: {
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown>;
  keepCurrentActiveOrganization?: boolean;
}) {
  return unwrapOrgCall(
    authClient.organization.create({
      name: input.name,
      slug: input.slug,
      ...(input.logo !== undefined ? { logo: input.logo } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      ...(input.keepCurrentActiveOrganization !== undefined
        ? { keepCurrentActiveOrganization: input.keepCurrentActiveOrganization }
        : {}),
    }),
    "Could not create organization",
  );
}

export async function setActiveOrganization(organizationId: string) {
  return unwrapOrgCall(
    authClient.organization.setActive({ organizationId }),
    "Could not switch organization",
  );
}

export async function updateOrganization(input: {
  organizationId: string;
  name?: string;
  slug?: string;
  logo?: string | null;
}) {
  return unwrapOrgCall(
    authClient.organization.update({
      organizationId: input.organizationId,
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.logo !== undefined ? { logo: input.logo } : {}),
      },
    }),
    "Could not update organization",
  );
}

export async function deleteOrganization(organizationId: string) {
  return unwrapOrgCall(
    authClient.organization.delete({ organizationId }),
    "Could not delete organization",
  );
}

export async function inviteMember(input: {
  email: string;
  role: OrgRole;
  organizationId?: string;
}) {
  return unwrapOrgCall(
    authClient.organization.inviteMember({
      email: input.email,
      role: input.role,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    }),
    "Could not send invitation",
  );
}

export async function cancelInvitation(invitationId: string) {
  return unwrapOrgCall(
    authClient.organization.cancelInvitation({ invitationId }),
    "Could not cancel invitation",
  );
}

export async function updateMemberRole(input: {
  memberId: string;
  role: OrgRole;
  organizationId?: string;
}) {
  return unwrapOrgCall(
    authClient.organization.updateMemberRole({
      memberId: input.memberId,
      role: input.role,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    }),
    "Could not update role",
  );
}

export async function removeMember(input: { memberIdOrEmail: string; organizationId?: string }) {
  return unwrapOrgCall(
    authClient.organization.removeMember({
      memberIdOrEmail: input.memberIdOrEmail,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    }),
    "Could not remove member",
  );
}

export async function leaveOrganization(organizationId: string) {
  return unwrapOrgCall(
    authClient.organization.leave({ organizationId }),
    "Could not leave organization",
  );
}

export async function acceptInvitation(invitationId: string) {
  return unwrapOrgCall(
    authClient.organization.acceptInvitation({ invitationId }),
    "Could not accept invitation",
  );
}

export async function rejectInvitation(invitationId: string) {
  return unwrapOrgCall(
    authClient.organization.rejectInvitation({ invitationId }),
    "Could not reject invitation",
  );
}

export async function getInvitation(invitationId: string) {
  return unwrapOrgCall(
    authClient.organization.getInvitation({
      query: { id: invitationId },
    }),
    "Could not load invitation",
  );
}

export async function listUserInvitations() {
  return unwrapOrgCall(authClient.organization.listUserInvitations(), "Could not load invitations");
}

// —— Teams (requires organizationClient({ teams: { enabled: true } })) ——

export async function createTeam(input: { name: string; organizationId?: string }) {
  return unwrapOrgCall(
    authClient.organization.createTeam({
      name: input.name,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    }),
    "Could not create team",
  );
}

export async function updateTeam(input: { teamId: string; name: string }) {
  return unwrapOrgCall(
    authClient.organization.updateTeam({
      teamId: input.teamId,
      data: { name: input.name },
    }),
    "Could not update team",
  );
}

export async function removeTeam(input: { teamId: string; organizationId?: string }) {
  return unwrapOrgCall(
    authClient.organization.removeTeam({
      teamId: input.teamId,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    }),
    "Could not remove team",
  );
}

export async function setActiveTeam(teamId: string | null) {
  return unwrapOrgCall(
    authClient.organization.setActiveTeam({
      teamId,
    }),
    "Could not set active team",
  );
}

export async function listTeams() {
  return unwrapOrgCall(authClient.organization.listTeams(), "Could not list teams");
}

export async function addTeamMember(input: { teamId: string; userId: string }) {
  return unwrapOrgCall(
    authClient.organization.addTeamMember({
      teamId: input.teamId,
      userId: input.userId,
    }),
    "Could not add team member",
  );
}

export async function removeTeamMember(input: { teamId: string; userId: string }) {
  return unwrapOrgCall(
    authClient.organization.removeTeamMember({
      teamId: input.teamId,
      userId: input.userId,
    }),
    "Could not remove team member",
  );
}

export async function listTeamMembers(teamId?: string) {
  return unwrapOrgCall(
    authClient.organization.listTeamMembers(teamId ? { query: { teamId } } : {}),
    "Could not list team members",
  );
}
