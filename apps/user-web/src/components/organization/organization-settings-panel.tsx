import { useServerFn } from "@tanstack/react-start";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { useEffect, useState } from "react";

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
  const [slugStatus, setSlugStatus] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<ClientEntitlements | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const orgs = listState.data ?? [];
  const active = activeState.data;
  const myRole = memberState.data?.role ?? "";
  const canUpdate = myRole ? canUpdateOrganization(myRole) : false;
  const canDelete = myRole ? canDeleteOrganization(myRole) : false;
  const canUseR2 = entitlements ? clientHasFeature(entitlements, "r2") : false;

  useEffect(() => {
    if (active) {
      setEditName(active.name);
      setEditSlug(active.slug);
      setLogoUrl(typeof active.logo === "string" ? active.logo : null);
    } else {
      setEditName("");
      setEditSlug("");
      setLogoUrl(null);
      setEntitlements(null);
    }
    // active object identity changes often; key fields are enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync form from active org fields
  }, [active?.id, active?.name, active?.slug, active?.logo]);

  useEffect(() => {
    if (!active?.id) return;
    void listSubscriptions(active.id)
      .then((subs) => setEntitlements(resolveClientEntitlements(subs)))
      .catch(() => setEntitlements(resolveClientEntitlements([])));
  }, [active?.id]);

  useEffect(() => {
    if (!slugTouched) {
      setCreateSlug(slugifyOrgName(createName));
    }
  }, [createName, slugTouched]);

  useEffect(() => {
    if (!createSlug.trim()) {
      setSlugStatus(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void checkSlugAvailable(createSlug).then((r) => {
        setSlugStatus(r.available ? "Available" : (r.message ?? "Unavailable"));
      });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [createSlug]);

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create tenants, switch the active organization, and update profile details. Requires a
          verified email to create (Better Auth config).
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
          <CardTitle className="text-base">Your organizations</CardTitle>
          <CardDescription>
            {listState.isPending
              ? "Loading…"
              : orgs.length === 0
                ? "No organizations yet — create one below."
                : `${orgs.length} organization${orgs.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
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
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {org.name}
                    {isActive ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">Active</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">/{org.slug}</p>
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Acme Inc"
              autoComplete="organization"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
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
              <p
                className={
                  slugStatus === "Available"
                    ? "text-xs text-muted-foreground"
                    : "text-xs text-destructive"
                }
              >
                {slugStatus === "Available" ? "Slug is available" : slugStatus}
              </p>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={keepCurrent}
              onChange={(e) => setKeepCurrent(e.target.checked)}
              className="size-4 rounded border"
            />
            Keep current organization active after create
          </label>
          <Button
            disabled={
              busy ||
              !createName.trim() ||
              !createSlug.trim() ||
              (slugStatus !== null && slugStatus !== "Available")
            }
            onClick={() =>
              void run(async () => {
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
                setKeepCurrent(false);
              }, "Organization created")
            }
          >
            Create
          </Button>
        </CardContent>
      </Card>

      {active ? (
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
      ) : null}
    </div>
  );
}
