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
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select";
import { Separator } from "@workspace/ui/components/separator";
import { useEffect, useState } from "react";

import type { OrgInvitation, OrgRole } from "#/lib/organization";
import { canInviteMembers, canManageMembers, ORG_ROLE_OPTIONS } from "#/lib/organization";
import {
  acceptInvitation,
  cancelInvitation,
  inviteMember,
  leaveOrganization,
  listUserInvitations,
  rejectInvitation,
  removeMember,
  updateMemberRole,
  useActiveMember,
  useActiveOrganization,
} from "#/lib/organization.queries";

function unknownErrorMessage(error: unknown, fallback: string): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function MembersSettingsPanel({ userId }: { userId: string }) {
  const activeState = useActiveOrganization();
  const memberState = useActiveMember();

  const [inbound, setInbound] = useState<OrgInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("member");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const active = activeState.data;
  const myRole = memberState.data?.role ?? "";
  const canInvite = myRole ? canInviteMembers(myRole) : false;
  const canManage = myRole ? canManageMembers(myRole) : false;
  const pendingInvites = active
    ? active.invitations.filter((i: { status: string }) => i.status === "pending")
    : [];

  const refreshInbound = async () => {
    try {
      const data = await listUserInvitations();
      setInbound(data as OrgInvitation[]);
    } catch {
      setInbound([]);
    }
  };

  useEffect(() => {
    void refreshInbound();
  }, [active?.id]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setBanner(null);
    try {
      await fn();
      setBanner({ type: "ok", text: ok });
      await refreshInbound();
    } catch (e) {
      setBanner({
        type: "err",
        text: unknownErrorMessage(e, "Something went wrong"),
      });
    } finally {
      setBusy(false);
    }
  };

  if (activeState.isPending) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">Loading members…</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select or create an organization first.
          </p>
        </div>
        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-6">
            <ButtonLink to="/settings/organization">Go to Organization</ButtonLink>
          </CardContent>
        </Card>
        <InboundInvitations
          invitations={inbound}
          busy={busy}
          onAccept={(id) =>
            void run(async () => {
              await acceptInvitation(id);
            }, "Invitation accepted")
          }
          onReject={(id) =>
            void run(async () => {
              await rejectInvitation(id);
            }, "Invitation rejected")
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {active.name} — invite teammates, manage roles, or leave. Permissions use Better Auth
          access control.
        </p>
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

      <InboundInvitations
        invitations={inbound}
        busy={busy}
        onAccept={(id) =>
          void run(async () => {
            await acceptInvitation(id);
          }, "Invitation accepted")
        }
        onReject={(id) =>
          void run(async () => {
            await rejectInvitation(id);
          }, "Invitation rejected")
        }
      />

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Team</CardTitle>
          <CardDescription>
            {active.members.length} member{active.members.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.members.map(
            (member: {
              id: string;
              userId: string;
              role: string;
              user: { name?: string | null; email?: string | null };
            }) => {
              const isSelf = member.userId === userId;
              const primaryRole = (member.role.split(",")[0] ?? "member") as OrgRole;
              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {member.user.name || member.user.email}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">You</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canManage && !isSelf ? (
                      <NativeSelect
                        value={primaryRole}
                        disabled={busy}
                        onChange={(e) => {
                          const next = e.target.value as OrgRole;
                          void run(async () => {
                            await updateMemberRole({
                              memberId: member.id,
                              role: next,
                              organizationId: active.id,
                            });
                          }, "Role updated");
                        }}
                      >
                        {ORG_ROLE_OPTIONS.map((opt) => (
                          <NativeSelectOption key={opt.value} value={opt.value}>
                            {opt.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                        {member.role}
                      </span>
                    )}
                    {canManage && !isSelf ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          const ok = window.confirm(
                            `Remove ${member.user.email} from ${active.name}?`,
                          );
                          if (!ok) return;
                          void run(async () => {
                            await removeMember({
                              memberIdOrEmail: member.id,
                              organizationId: active.id,
                            });
                          }, "Member removed");
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            },
          )}
        </CardContent>
      </Card>

      {canInvite ? (
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Invite member</CardTitle>
            <CardDescription>
              Uses Better Auth invitations (7-day expiry, re-invite cancels pending, verified email
              required to accept).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <NativeSelect
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as OrgRole)}
              >
                {ORG_ROLE_OPTIONS.filter((r) => r.value !== "owner").map((opt) => (
                  <NativeSelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <Button
              disabled={busy || !email.trim()}
              onClick={() =>
                void run(async () => {
                  await inviteMember({
                    email: email.trim().toLowerCase(),
                    role,
                    organizationId: active.id,
                  });
                  setEmail("");
                }, "Invitation sent")
              }
            >
              Send invite
            </Button>

            {pendingInvites.length > 0 ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pending invitations</p>
                  {pendingInvites.map((inv: { id: string; email: string; role: string }) => (
                    <div
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm">{inv.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">{inv.role}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await cancelInvitation(inv.id);
                          }, "Invitation cancelled")
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Leave organization</CardTitle>
          <CardDescription>
            Sole owners cannot leave until ownership is transferred (Better Auth enforces this).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              const ok = window.confirm(`Leave ${active.name}?`);
              if (!ok) return;
              void run(async () => {
                await leaveOrganization(active.id);
              }, "You left the organization");
            }}
          >
            Leave organization
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InboundInvitations({
  invitations,
  busy,
  onAccept,
  onReject,
}: {
  invitations: OrgInvitation[];
  busy: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (invitations.length === 0) return null;
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Invitations for you</CardTitle>
        <CardDescription>
          From listUserInvitations. Accept requires a verified email address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {invitations
          .filter((i) => !i.status || i.status === "pending")
          .map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">Invitation</p>
                <p className="text-xs text-muted-foreground">Role: {inv.role}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => onAccept(inv.id)}>
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onReject(inv.id)}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
