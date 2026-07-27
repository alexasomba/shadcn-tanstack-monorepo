import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";
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
import { Separator } from "@workspace/ui/components/separator";
import { useState } from "react";
import { toast } from "sonner";

import type { ApiKeyConfigId, ApiKeyRecord } from "#/lib/api-key";
import {
  API_KEY_CONFIG,
  curlExample,
  EXPIRES_OPTIONS,
  formatExpires,
  formatKeyPreview,
} from "#/lib/api-key";
import { createApiKey, deleteApiKey, listApiKeys } from "#/lib/api-key.queries";
import { useActiveOrganization } from "#/lib/organization.queries";

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

export function ApiKeysSettingsPanel() {
  const queryClient = useQueryClient();
  const activeOrg = useActiveOrganization();
  const org = activeOrg.data;

  const [userScopeOverride, setUserScopeOverride] = useState<ApiKeyConfigId | null>(null);
  const scope: ApiKeyConfigId = userScopeOverride ?? (org?.id ? "organization" : "user");
  const setScope = (newScope: ApiKeyConfigId) => setUserScopeOverride(newScope);
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("null");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "curl" | null>(null);

  const apiKeysQuery = useQuery({
    queryKey: ["api-keys", scope, scope === "organization" ? org?.id : null],
    queryFn: async () => {
      if (scope === "organization" && !org?.id) {
        return [];
      }
      const res = await listApiKeys({
        configId: scope,
        ...(scope === "organization" && org?.id ? { organizationId: org.id } : {}),
      });
      return res.apiKeys;
    },
    enabled: scope === "user" || Boolean(org?.id),
  });

  const keys = apiKeysQuery.data ?? [];
  const total = keys.length;

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: async (created) => {
      if (!created.key) {
        throw new Error("Key created but secret was not returned");
      }
      setCreatedSecret(created.key);
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created — copy the secret now; it will not be shown again");
    },
    onError: (e) => {
      toast.error(unknownErrorMessage(e, "Something went wrong"));
    },
  });

  const copyText = async (text: string, which: "key" | "curl") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleCreate = () => {
    if (scope === "organization" && !org?.id) {
      toast.error("Select or create an organization first");
      return;
    }
    const exp = expiresIn === "null" ? null : Number.parseInt(expiresIn, 10);
    createMutation.mutate({
      name: name.trim(),
      configId: scope,
      ...(scope === "organization" && org?.id ? { organizationId: org.id } : {}),
      expiresIn: exp,
      metadata: { source: "user-web-settings" },
    });
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Authenticate to data-service with <code className="text-xs">Authorization: Bearer …</code>{" "}
          or <code className="text-xs">x-api-key</code>. Secrets are shown only once at creation
          (Better Auth).
        </p>
      </div>

      {createdSecret ? (
        <Card className="border-primary/40 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Copy your secret key</CardTitle>
            <CardDescription>
              This is the only time the full key is available. Store it in a password manager or
              secrets vault.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-3 font-mono text-xs break-all whitespace-pre-wrap">
              {createdSecret}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void copyText(createdSecret, "key")}>
                {copied === "key" ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
                Copy key
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void copyText(curlExample(createdSecret), "curl")}
              >
                {copied === "curl" ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
                Copy curl snippet
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreatedSecret(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Create key</CardTitle>
          <CardDescription>
            Dual configs: personal (<code className="text-xs">sk_user_</code>) and organization (
            <code className="text-xs">sk_org_</code>). Rate limits and hashing are enabled
            server-side.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="key-scope">Ownership</Label>
              <NativeSelect
                id="key-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as ApiKeyConfigId)}
              >
                <NativeSelectOption value="organization">
                  {API_KEY_CONFIG.organization.label}
                  {org ? ` (${org.name})` : " — select org first"}
                </NativeSelectOption>
                <NativeSelectOption value="user">{API_KEY_CONFIG.user.label}</NativeSelectOption>
              </NativeSelect>
              <p className="text-xs text-muted-foreground">{API_KEY_CONFIG[scope].description}</p>
            </div>

            {scope === "organization" && !org ? (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm">
                <p className="text-muted-foreground">No active organization.</p>
                <ButtonLink to="/settings/organization" size="sm" className="mt-2">
                  Manage organizations
                </ButtonLink>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CI / local dev / mobile"
                maxLength={32}
                required
                minLength={1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-expires">Expires</Label>
              <NativeSelect
                id="key-expires"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
              >
                {EXPIRES_OPTIONS.map((opt) => (
                  <NativeSelectOption
                    key={opt.label}
                    value={opt.seconds === null ? "null" : String(opt.seconds)}
                  >
                    {opt.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <Button
              type="submit"
              disabled={
                createMutation.isPending || !name.trim() || (scope === "organization" && !org?.id)
              }
            >
              {createMutation.isPending ? "Creating…" : "Create API key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Your keys</CardTitle>
          <CardDescription>
            {apiKeysQuery.isPending
              ? "Loading…"
              : `${total} key${total === 1 ? "" : "s"} (${API_KEY_CONFIG[scope].label.toLowerCase()})`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {keys.length === 0 && !apiKeysQuery.isPending ? (
            <Empty className="py-6">
              <EmptyHeader>
                <EmptyTitle>No API keys found</EmptyTitle>
                <EmptyDescription>
                  Create an API key above to get started with data-service access.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            keys.map((k) => (
              <ApiKeyItem key={k.id} apiKey={k} scope={scope} setCreatedSecret={setCreatedSecret} />
            ))
          )}
          <Separator />
          <p className="text-xs text-muted-foreground">
            data-service accepts keys on <code className="text-xs">/todos</code>,{" "}
            <code className="text-xs">/domains</code>, and{" "}
            <code className="text-xs">/notifications</code>. Prefer organization keys for tenant
            isolation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiKeyItem({
  apiKey,
  scope,
  setCreatedSecret,
}: {
  apiKey: ApiKeyRecord;
  scope: ApiKeyConfigId;
  setCreatedSecret: (s: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const k = apiKey;

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: async () => {
      setCreatedSecret(null);
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    },
    onError: (e) => {
      toast.error(unknownErrorMessage(e, "Something went wrong"));
    },
  });

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">{k.name || "Unnamed"}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{formatKeyPreview(k)}</p>
        <p className="text-xs text-muted-foreground">
          Expires {formatExpires(k.expiresAt)}
          {k.enabled === false ? " · disabled" : ""}
          {typeof k.requestCount === "number" ? ` · ${k.requestCount} requests` : ""}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={deleteMutation.isPending}
        onClick={() => {
          const ok = window.confirm(
            `Revoke key “${k.name || k.id}”? Clients using it will fail immediately.`,
          );
          if (!ok) return;
          const configId: ApiKeyConfigId =
            k.configId === "user" || k.configId === "organization" ? k.configId : scope;
          deleteMutation.mutate({
            keyId: k.id,
            configId,
          });
        }}
      >
        {deleteMutation.isPending ? "Revoking…" : "Revoke"}
      </Button>
    </div>
  );
}
