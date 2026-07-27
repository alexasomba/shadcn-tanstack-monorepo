import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select";
import { useState } from "react";
import { toast } from "sonner";

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

export function TeamsSettingsPanel() {
  const queryClient = useQueryClient();
  const activeState = useActiveOrganization();
  const memberState = useActiveMember();
  const active = activeState.data;
  const myRole = memberState.data?.role ?? "";
  const canManage = myRole ? canManageTeams(myRole) : false;

  const [name, setName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [memberUserId, setMemberUserId] = useState("");

  const teamsQuery = useQuery({
    queryKey: ["teams", active?.id],
    queryFn: async () => {
      if (!active?.id) return [];
      return (await listTeams()) as OrgTeam[];
    },
    enabled: Boolean(active?.id),
  });

  const teams = teamsQuery.data ?? [];

  const invalidateTeams = async () => {
    await queryClient.invalidateQueries({ queryKey: ["teams", active?.id] });
  };

  const createTeamMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: async () => {
      await invalidateTeams();
      toast.success("Team created");
      setName("");
    },
    onError: (e) => toast.error(unknownErrorMessage(e, "Failed to create team")),
  });

  const setActiveTeamMutation = useMutation({
    mutationFn: setActiveTeam,
    onSuccess: async (_, teamId) => {
      await invalidateTeams();
      const team = teams.find((t) => t.id === teamId);
      toast.success(`Active team: ${team?.name ?? teamId}`);
    },
    onError: (e) => toast.error(unknownErrorMessage(e, "Failed to set active team")),
  });

  const updateTeamMutation = useMutation({
    mutationFn: updateTeam,
    onSuccess: async () => {
      await invalidateTeams();
      toast.success("Team renamed");
    },
    onError: (e) => toast.error(unknownErrorMessage(e, "Failed to rename team")),
  });

  const removeTeamMutation = useMutation({
    mutationFn: removeTeam,
    onSuccess: async () => {
      await invalidateTeams();
      toast.success("Team removed");
    },
    onError: (e) => toast.error(unknownErrorMessage(e, "Failed to remove team")),
  });

  const addMemberMutation = useMutation({
    mutationFn: addTeamMember,
    onSuccess: async () => {
      await invalidateTeams();
      toast.success("Added to team");
    },
    onError: (e) => toast.error(unknownErrorMessage(e, "Failed to add member to team")),
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeTeamMember,
    onSuccess: async () => {
      await invalidateTeams();
      toast.success("Removed from team");
    },
    onError: (e) => toast.error(unknownErrorMessage(e, "Failed to remove member from team")),
  });

  const isBusy =
    createTeamMutation.isPending ||
    setActiveTeamMutation.isPending ||
    updateTeamMutation.isPending ||
    removeTeamMutation.isPending ||
    addMemberMutation.isPending ||
    removeMemberMutation.isPending;

  if (activeState.isPending) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">Loading teams…</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">Select an active organization first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {active.name} — subdivide organization members into teams (Better Auth teams plugin).
        </p>
      </div>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Teams in this organization</CardTitle>
          <CardDescription>
            {teams.length} team{teams.length === 1 ? "" : "s"} (max 20)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.length === 0 && !teamsQuery.isPending ? (
            <Empty className="py-6">
              <EmptyHeader>
                <EmptyTitle>No teams found</EmptyTitle>
                <EmptyDescription>
                  Create a team below to subdivide organization members.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
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
                    disabled={isBusy}
                    onClick={() => setActiveTeamMutation.mutate(team.id)}
                  >
                    {setActiveTeamMutation.isPending ? "Setting…" : "Set active"}
                  </Button>
                  {canManage ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => {
                          const next = window.prompt("Rename team", team.name);
                          if (!next?.trim()) return;
                          updateTeamMutation.mutate({ teamId: team.id, name: next.trim() });
                        }}
                      >
                        {updateTeamMutation.isPending ? "Renaming…" : "Rename"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy || teams.length <= 1}
                        onClick={() => {
                          if (teams.length <= 1) return;
                          const ok = window.confirm(`Remove team “${team.name}”?`);
                          if (!ok) return;
                          removeTeamMutation.mutate({
                            teamId: team.id,
                            organizationId: active.id,
                          });
                        }}
                      >
                        {removeTeamMutation.isPending ? "Removing…" : "Remove"}
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim() || createTeamMutation.isPending) return;
                  createTeamMutation.mutate({
                    name: name.trim(),
                    organizationId: active.id,
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="team-name">Name</Label>
                  <Input
                    id="team-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Engineering"
                    required
                    minLength={1}
                  />
                </div>
                <Button type="submit" disabled={createTeamMutation.isPending || !name.trim()}>
                  {createTeamMutation.isPending ? "Creating…" : "Create team"}
                </Button>
              </form>
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
                  disabled={isBusy || !selectedTeamId || !memberUserId}
                  onClick={() =>
                    addMemberMutation.mutate({
                      teamId: selectedTeamId,
                      userId: memberUserId,
                    })
                  }
                >
                  {addMemberMutation.isPending ? "Adding…" : "Add to team"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBusy || !selectedTeamId || !memberUserId}
                  onClick={() =>
                    removeMemberMutation.mutate({
                      teamId: selectedTeamId,
                      userId: memberUserId,
                    })
                  }
                >
                  {removeMemberMutation.isPending ? "Removing…" : "Remove from team"}
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
