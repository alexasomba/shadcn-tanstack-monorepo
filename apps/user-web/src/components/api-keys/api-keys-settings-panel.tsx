import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
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
import { useCallback, useEffect, useState } from "react";

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
  const activeOrg = useActiveOrganization();
  const org = activeOrg.data;

  const [scope, setScope] = useState<ApiKeyConfigId>("organization");
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("null");
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "curl" | null>(null);

  // Prefer org keys when an active org exists; fall back to personal.
  useEffect(() => {
    if (org?.id) {
      setScope("organization");
    } else {
      setScope("user");
    }
  }, [org?.id]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      if (scope === "organization" && !org?.id) {
        setKeys([]);
        setTotal(0);
        return;
      }
      const result = await listApiKeys({
        configId: scope,
        ...(scope === "organization" && org?.id ? { organizationId: org.id } : {}),
      });
      setKeys(result.apiKeys);
      setTotal(result.total);
    } catch (e) {
      setBanner({
        type: "err",
        text: unknownErrorMessage(e, "Failed to load API keys"),
      });
      setKeys([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [scope, org?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const copyText = async (text: string, which: "key" | "curl") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setBanner({ type: "err", text: "Could not copy to clipboard" });
    }
  };

  const onCreate = () => {
    void run(async () => {
      if (scope === "organization" && !org?.id) {
        throw new Error("Select or create an organization first");
      }
      const exp = expiresIn === "null" ? null : Number.parseInt(expiresIn, 10);
      const created = await createApiKey({
        name: name.trim(),
        configId: scope,
        ...(scope === "organization" && org?.id ? { organizationId: org.id } : {}),
        expiresIn: exp,
        metadata: { source: "user-web-settings" },
      });
      if (!created.key) {
        throw new Error("Key created but secret was not returned");
      }
      setCreatedSecret(created.key);
      setName("");
      await refresh();
    }, "API key created — copy the secret now; it will not be shown again");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Authenticate to data-service with <code className="text-xs">Authorization: Bearer …</code>{" "}
          or <code className="text-xs">x-api-key</code>. Secrets are shown only once at creation
          (Better Auth).
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
            disabled={busy || !name.trim() || (scope === "organization" && !org?.id)}
            onClick={onCreate}
          >
            Create API key
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Your keys</CardTitle>
          <CardDescription>
            {loading
              ? "Loading…"
              : `${total} key${total === 1 ? "" : "s"} (${API_KEY_CONFIG[scope].label.toLowerCase()})`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          ) : null}
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex flex-col gap-2 rounded-xl border border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{k.name || "Unnamed"}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {formatKeyPreview(k)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {formatExpires(k.expiresAt)}
                  {k.enabled === false ? " · disabled" : ""}
                  {typeof k.requestCount === "number" ? ` · ${k.requestCount} requests` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const ok = window.confirm(
                    `Revoke key “${k.name || k.id}”? Clients using it will fail immediately.`,
                  );
                  if (!ok) return;
                  void run(async () => {
                    const configId: ApiKeyConfigId =
                      k.configId === "user" || k.configId === "organization" ? k.configId : scope;
                    await deleteApiKey({
                      keyId: k.id,
                      configId,
                    });
                    setCreatedSecret(null);
                    await refresh();
                  }, "API key revoked");
                }}
              >
                Revoke
              </Button>
            </div>
          ))}
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
