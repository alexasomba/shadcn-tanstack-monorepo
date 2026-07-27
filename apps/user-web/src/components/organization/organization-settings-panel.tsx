import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { useState } from "react";

import { UpgradeGate } from "#/components/billing/upgrade-gate";
import { ImageUploadField } from "#/components/media/image-upload-field";
import { listSubscriptions } from "#/lib/billing.queries";
import { clientHasFeature, resolveClientEntitlements } from "#/lib/entitlements";
import type { ClientEntitlements } from "#/lib/entitlements";
import { uploadOrgLogo } from "#/lib/media.functions";
import {
  canDeleteOrganization,
  canUpdateOrganization,
  checkSlugAvailable,
  slugifyOrgName,
} from "#/lib/organization";
import {
  createOrganization,
  deleteOrganization,
  setActiveOrganization,
  updateOrganization,
  useActiveMember,
  useActiveOrganization,
  useOrganizationsList,
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

export function OrganizationSettingsPanel({ userId: _userId }: { userId: string }) {
  const listState = useOrganizationsList();
  const activeState = useActiveOrganization();
  const memberState = useActiveMember();
  const uploadLogo = useServerFn(uploadOrgLogo);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [keepCurrent, setKeepCurrent] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const orgs = listState.data ?? [];
  const active = activeState.data;

  // Sync edit form state when active organization changes during render
  const [prevActiveId, setPrevActiveId] = useState<string | null>(null);
  if (active?.id !== prevActiveId) {
    setPrevActiveId(active?.id ?? null);
    if (active) {
      setEditName(active.name);
      setEditSlug(active.slug);
      setLogoUrl(typeof active.logo === "string" ? active.logo : null);
    } else {
      setEditName("");
      setEditSlug("");
      setLogoUrl(null);
    }
  }

  // TanStack Query for entitlements
  const { data: entitlements = null } = useQuery({
    queryKey: ["org-entitlements", active?.id],
    queryFn: async () => {
      if (!active?.id) return resolveClientEntitlements([]);
      const subs = await listSubscriptions(active.id);
      return resolveClientEntitlements(subs);
    },
    enabled: !!active?.id,
  });

  // TanStack Query for organization slug availability check
  const { data: slugStatus = null } = useQuery({
    queryKey: ["org-slug-check", createSlug],
    queryFn: async () => {
      if (!createSlug.trim()) return null;
      const res = await checkSlugAvailable(createSlug);
      return res.available ? "Available" : (res.message ?? "Unavailable");
    },
    enabled: !!createSlug.trim(),
  });

  const myRole = memberState.data?.role ?? "";
  const canUpdate = myRole ? canUpdateOrganization(myRole) : false;
  const canDelete = myRole ? canDeleteOrganization(myRole) : false;
  const canUseR2 = entitlements ? clientHasFeature(entitlements, "r2") : false;

  const handleCreateNameChange = (name: string) => {
    setCreateName(name);
    if (!slugTouched && name.trim()) {
      setCreateSlug(slugifyOrgName(name));
    }
  };

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setBanner(null);
    try {
      await fn();
      setBanner({ type: "ok", text: ok });
    } catch (e) {
      setBanner({
        type: "err",
        text: unknownErrorMessage(e, "Something went wrong"),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create tenants, switch the active organization, and update profile details. Requires a
          verified email to create (Better Auth config).
        </p>
      </div>

      {banner ? (
        <Alert variant={banner.type === "err" ? "destructive" : "default"}>
          <AlertDescription>{banner.text}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Your organizations</CardTitle>
          <CardDescription>
            {listState.isPending
              ? "Loading…"
              : orgs.length === 0
                ? "No organizations yet — create one below."
                : `${orgs.length} organization${orgs.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {listState.error ? (
            <p className="text-sm text-destructive">
              {listState.error.message || "Failed to load organizations"}
            </p>
          ) : null}
          {orgs.map((org: { id: string; name: string; slug: string }) => {
            const isActive = active?.id === org.id;
            return (
              <div
                key={org.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div>
                    <p className="flex items-center gap-2 truncate font-medium">
                      {org.name}
                      {isActive ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Active
                        </Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">/{org.slug}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "secondary" : "outline"}
                  disabled={busy || isActive}
                  onClick={() =>
                    void run(async () => {
                      await setActiveOrganization(org.id);
                    }, `Switched to ${org.name}`)
                  }
                >
                  {isActive ? "Current" : "Switch"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Create organization</CardTitle>
          <CardDescription>
            You become the owner. A default team is created automatically (teams plugin). Limit: 5
            orgs / free plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="org-name">Name</FieldLabel>
              <Input
                id="org-name"
                value={createName}
                onChange={(e) => handleCreateNameChange(e.target.value)}
                placeholder="Acme Inc"
                autoComplete="organization"
              />
            </Field>
            <Field data-invalid={Boolean(slugStatus && slugStatus !== "Available")}>
              <FieldLabel htmlFor="org-slug">Slug</FieldLabel>
              <Input
                id="org-slug"
                value={createSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setCreateSlug(e.target.value);
                }}
                placeholder="acme-inc"
              />
              {slugStatus ? (
                slugStatus === "Available" ? (
                  <FieldDescription role="status" aria-live="polite">
                    Slug is available
                  </FieldDescription>
                ) : (
                  <FieldError role="alert" aria-live="assertive">
                    {slugStatus}
                  </FieldError>
                )
              ) : null}
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="keep-current-org"
                checked={keepCurrent}
                onCheckedChange={(checked) => setKeepCurrent(Boolean(checked))}
              />
              <FieldLabel htmlFor="keep-current-org" className="font-normal text-muted-foreground">
                Keep current organization active after create
              </FieldLabel>
            </Field>
            <div>
              <Button
                disabled={
                  busy ||
                  !createName.trim() ||
                  !createSlug.trim() ||
                  (slugStatus !== null && slugStatus !== "Available")
                }
                onClick={async () => {
                  setBusy(true);
                  setBanner(null);
                  try {
                    const check = await checkSlugAvailable(createSlug);
                    if (!check.available) {
                      throw new Error(check.message ?? "Slug unavailable");
                    }
                    await createOrganization({
                      name: createName.trim(),
                      slug: createSlug.trim(),
                      keepCurrentActiveOrganization: keepCurrent,
                      metadata: { plan: "free" },
                    });
                    setCreateName("");
                    setCreateSlug("");
                    setSlugTouched(false);
                    setBanner({ type: "ok", text: "Organization created" });
                  } catch (e) {
                    setBanner({
                      type: "err",
                      text: unknownErrorMessage(e, "Something went wrong"),
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create organization
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {active ? (
        <ActiveOrganizationCard
          active={active}
          myRole={myRole}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canUseR2={canUseR2}
          editName={editName}
          setEditName={setEditName}
          editSlug={editSlug}
          setEditSlug={setEditSlug}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          entitlements={entitlements}
          busy={busy}
          setBanner={setBanner}
          uploadLogo={uploadLogo}
          run={run}
        />
      ) : null}
    </div>
  );
}

function ActiveOrganizationCard({
  active,
  myRole,
  canUpdate,
  canDelete,
  canUseR2,
  editName,
  setEditName,
  editSlug,
  setEditSlug,
  logoUrl,
  setLogoUrl,
  entitlements,
  busy,
  setBanner,
  uploadLogo,
  run,
}: {
  active: { id: string; name: string; slug: string };
  myRole: string;
  canUpdate: boolean;
  canDelete: boolean;
  canUseR2: boolean;
  editName: string;
  setEditName: (s: string) => void;
  editSlug: string;
  setEditSlug: (s: string) => void;
  logoUrl: string | null;
  setLogoUrl: (s: string | null) => void;
  entitlements: ClientEntitlements | null;
  busy: boolean;
  setBanner: (b: { type: "ok" | "err"; text: string } | null) => void;
  uploadLogo: ReturnType<typeof useServerFn<typeof uploadOrgLogo>>;
  run: (fn: () => Promise<void>, ok: string) => Promise<void>;
}) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Active organization</CardTitle>
        <CardDescription>
          {active.name} · /{active.slug}
          {myRole ? ` · your role: ${myRole}` : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Name</Label>
          <Input
            id="edit-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={!canUpdate || busy}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-slug">Slug</Label>
          <Input
            id="edit-slug"
            value={editSlug}
            onChange={(e) => setEditSlug(e.target.value)}
            disabled={!canUpdate || busy}
          />
        </div>
        {canUpdate ? (
          <Button
            disabled={
              busy ||
              (!editName.trim() && !editSlug.trim()) ||
              (editName === active.name && editSlug === active.slug)
            }
            onClick={() =>
              void run(async () => {
                if (editSlug.trim() !== active.slug) {
                  const check = await checkSlugAvailable(editSlug);
                  if (!check.available) {
                    throw new Error(check.message ?? "Slug unavailable");
                  }
                }
                await updateOrganization({
                  organizationId: active.id,
                  name: editName.trim(),
                  slug: editSlug.trim(),
                });
              }, "Organization updated")
            }
          >
            Save changes
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            You need organization:update permission to rename this organization.
          </p>
        )}

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">Organization logo</p>
          {entitlements && !canUseR2 ? (
            <UpgradeGate
              featureLabel="Organization logos (R2 storage)"
              entitlements={entitlements}
            />
          ) : canUpdate ? (
            <ImageUploadField
              kind="org-logo"
              label="Logo"
              description="Pro+ plan. Uploaded to R2 and served from /api/media."
              currentUrl={logoUrl}
              disabled={busy}
              onUpload={async (payload) => {
                const result = await uploadLogo({
                  data: {
                    ...payload,
                    organizationId: active.id,
                  },
                });
                await updateOrganization({
                  organizationId: active.id,
                  logo: result.url,
                });
                setLogoUrl(result.url);
                setBanner({ type: "ok", text: "Logo updated" });
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Owners and admins can update the organization logo.
            </p>
          )}
        </div>

        <Separator />

        {canDelete ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Deleting removes the organization, members, invitations, and teams.
            </p>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                const ok = window.confirm(
                  `Delete organization “${active.name}”? This cannot be undone.`,
                );
                if (!ok) return;
                void run(async () => {
                  await deleteOrganization(active.id);
                }, "Organization deleted");
              }}
            >
              Delete organization
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
