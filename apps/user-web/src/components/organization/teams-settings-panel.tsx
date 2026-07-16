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
import { useEffect, useState } from "react";

import type { OrgTeam } from "#/lib/organization";
import { canManageTeams } from "#/lib/organization";
import {
  addTeamMember,
  createTeam,
  listTeams,
  removeTeam,
  removeTeamMember,
  setActiveTeam,
  updateTeam,
  useActiveMember,
  useActiveOrganization,
} from "#/lib/organization.queries";

export function TeamsSettingsPanel() {
  const activeState = useActiveOrganization();
  const memberState = useActiveMember();
  const active = activeState.data;
  const myRole = memberState.data?.role ?? "";
  const canManage = myRole ? canManageTeams(myRole) : false;

  const [name, setName] = useState("");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [memberUserId, setMemberUserId] = useState("");
  const [teams, setTeams] = useState<OrgTeam[]>([]);
  const [teamsVersion, setTeamsVersion] = useState(0);

  // Prefer listTeams() over active.teams — BA client atom types lag teams-enabled shape.
  useEffect(() => {
    if (!active?.id) {
      setTeams([]);
      return;
    }
    let cancelled = false;
    void listTeams()
      .then((rows) => {
        if (!cancelled) setTeams(rows as OrgTeam[]);
      })
      .catch(() => {
        if (!cancelled) setTeams([]);
      });
    return () => {
      cancelled = true;
    };
  }, [active?.id, teamsVersion]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setBanner(null);
    try {
      await fn();
      setTeamsVersion((v) => v + 1);
      setBanner({ type: "ok", text: ok });
    } catch (e) {
      setBanner({
        type: "err",
        text:
          e !== null && typeof e === "object" && "message" in e && typeof e.message === "string"
            ? (e as { message: string }).message
            : "Something went wrong",
      });
    } finally {
      setBusy(false);
    }
  };

  if (activeState.isPending) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">Loading teams…</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="text-sm text-muted-foreground">Select an organization first.</p>
        <ButtonLink to="/settings/organization">Go to Organization</ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sub-groups inside {active.name}. Default team is created with the organization (Better
          Auth teams plugin).
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

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Teams in this organization</CardTitle>
          <CardDescription>
            {teams.length} team{teams.length === 1 ? "" : "s"} (max 20)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{team.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{team.id.slice(0, 12)}…</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await setActiveTeam(team.id);
                      }, `Active team: ${team.name}`)
                    }
                  >
                    Set active
                  </Button>
                  {canManage ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          const next = window.prompt("Rename team", team.name);
                          if (!next?.trim()) return;
                          void run(async () => {
                            await updateTeam({ teamId: team.id, name: next.trim() });
                          }, "Team renamed");
                        }}
                      >
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || teams.length <= 1}
                        onClick={() => {
                          if (teams.length <= 1) return;
                          const ok = window.confirm(`Remove team “${team.name}”?`);
                          if (!ok) return;
                          void run(async () => {
                            await removeTeam({
                              teamId: team.id,
                              organizationId: active.id,
                            });
                          }, "Team removed");
                        }}
                      >
                        Remove
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <>
          <Card className="border-border/70 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Create team</CardTitle>
              <CardDescription>Members must already belong to the organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Name</Label>
                <Input
                  id="team-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Engineering"
                />
              </div>
              <Button
                disabled={busy || !name.trim()}
                onClick={() =>
                  void run(async () => {
                    await createTeam({ name: name.trim(), organizationId: active.id });
                    setName("");
                  }, "Team created")
                }
              >
                Create team
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Team membership</CardTitle>
              <CardDescription>
                Add or remove org members from a team (they stay in the organization).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-pick">Team</Label>
                <NativeSelect
                  id="team-pick"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <NativeSelectOption value="">Select team…</NativeSelectOption>
                  {teams.map((t) => (
                    <NativeSelectOption key={t.id} value={t.id}>
                      {t.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-member">Org member</Label>
                <NativeSelect
                  id="team-member"
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                >
                  <NativeSelectOption value="">Select member…</NativeSelectOption>
                  {active.members.map(
                    (m: {
                      userId: string;
                      role: string;
                      user: { name?: string | null; email?: string | null };
                    }) => (
                      <NativeSelectOption key={m.userId} value={m.userId}>
                        {m.user.name || m.user.email} ({m.role})
                      </NativeSelectOption>
                    ),
                  )}
                </NativeSelect>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy || !selectedTeamId || !memberUserId}
                  onClick={() =>
                    void run(async () => {
                      await addTeamMember({
                        teamId: selectedTeamId,
                        userId: memberUserId,
                      });
                    }, "Added to team")
                  }
                >
                  Add to team
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !selectedTeamId || !memberUserId}
                  onClick={() =>
                    void run(async () => {
                      await removeTeamMember({
                        teamId: selectedTeamId,
                        userId: memberUserId,
                      });
                    }, "Removed from team")
                  }
                >
                  Remove from team
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          You need team:create/update/delete permission to manage teams.
        </p>
      )}
    </div>
  );
}
