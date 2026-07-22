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
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";

import { authClient } from "#/lib/auth-client";
import type { PasskeyRecord } from "#/lib/security.queries";
import {
  addPasskey,
  deletePasskey,
  disableTwoFactor,
  enableOtpMethod,
  enableTotp,
  generateBackupCodes,
  listPasskeys,
  verifyTotpSetup,
} from "#/lib/security.queries";

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

export function SecuritySettingsPanel() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = session?.user;
  const twoFactorEnabled = Boolean(user && "twoFactorEnabled" in user && user.twoFactorEnabled);

  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [passkeyName, setPasskeyName] = useState("");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshPasskeys = useCallback(async () => {
    try {
      setPasskeys(await listPasskeys());
    } catch {
      setPasskeys([]);
    }
  }, []);

  useEffect(() => {
    void refreshPasskeys();
  }, [refreshPasskeys, user?.id]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setBanner(null);
    try {
      await fn();
      setBanner({ type: "ok", text: ok });
      await refetch();
    } catch (e) {
      setBanner({
        type: "err",
        text: unknownErrorMessage(e, "Something went wrong"),
      });
    } finally {
      setBusy(false);
    }
  };

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">Loading security settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Two-factor authentication (TOTP / email OTP), backup codes, and passkeys via Better Auth.
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
          <CardTitle className="text-base">Two-factor authentication</CardTitle>
          <CardDescription>
            Status:{" "}
            <span className="font-medium text-foreground">
              {twoFactorEnabled ? "Enabled" : "Disabled"}
            </span>
            . Password required for credential accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sec-password">Current password</Label>
            <Input
              id="sec-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Required to enable/disable or regenerate codes"
            />
          </div>

          {!twoFactorEnabled && !totpURI ? (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy || !password}
                onClick={() =>
                  void run(async () => {
                    const data = (await enableTotp(password)) as {
                      totpURI?: string;
                      backupCodes?: Array<string>;
                    } | null;
                    if (data?.totpURI) {
                      setTotpURI(data.totpURI);
                    }
                    if (Array.isArray(data?.backupCodes)) {
                      setBackupCodes(data.backupCodes);
                    }
                  }, "Scan the QR code, then verify a code to finish enabling TOTP")
                }
              >
                Enable authenticator (TOTP)
              </Button>
              <Button
                variant="outline"
                disabled={busy || !password}
                onClick={() =>
                  void run(async () => {
                    await enableOtpMethod(password);
                    setTotpURI(null);
                    setBackupCodes(null);
                  }, "Email OTP 2FA enabled — codes are sent on sign-in")
                }
              >
                Enable email OTP only
              </Button>
            </div>
          ) : null}

          {totpURI ? (
            <div className="space-y-3 rounded-xl border border-border/70 p-4">
              <p className="text-sm font-medium">Scan with your authenticator app</p>
              <div className="flex justify-center rounded-xl bg-white p-4">
                <QRCodeSVG value={totpURI} size={180} />
              </div>
              <p className="font-mono text-xs break-all text-muted-foreground">{totpURI}</p>
              <div className="space-y-2">
                <Label htmlFor="totp-verify">Enter 6-digit code to confirm</Label>
                <Input
                  id="totp-verify"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="font-mono tracking-widest"
                />
              </div>
              <Button
                disabled={busy || totpCode.length < 6}
                onClick={() =>
                  void run(async () => {
                    await verifyTotpSetup(totpCode);
                    setTotpCode("");
                    setTotpURI(null);
                  }, "2FA is now active")
                }
              >
                Verify and activate
              </Button>
            </div>
          ) : null}

          {backupCodes && backupCodes.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="text-sm font-medium">Backup codes (store offline)</p>
              <p className="text-xs text-muted-foreground">
                Each code works once. They will not be shown again unless you regenerate.
              </p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
                {backupCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Button size="sm" variant="outline" onClick={() => setBackupCodes(null)}>
                I saved them
              </Button>
            </div>
          ) : null}

          {twoFactorEnabled ? (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={busy || !password}
                  onClick={() =>
                    void run(async () => {
                      const data = (await generateBackupCodes(password)) as {
                        backupCodes?: Array<string>;
                      } | null;
                      const codes = Array.isArray(data?.backupCodes) ? data.backupCodes : null;
                      setBackupCodes(codes);
                    }, "New backup codes generated — old codes are invalid")
                  }
                >
                  Regenerate backup codes
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy || !password}
                  onClick={() => {
                    const ok = window.confirm("Disable two-factor authentication?");
                    if (!ok) return;
                    void run(async () => {
                      await disableTwoFactor(password);
                      setTotpURI(null);
                      setBackupCodes(null);
                    }, "2FA disabled");
                  }}
                >
                  Disable 2FA
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Passkeys</CardTitle>
          <CardDescription>
            Passwordless sign-in with platform authenticators (Touch ID, Face ID, security keys).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {passkeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No passkeys registered.</p>
            ) : (
              passkeys.map((pk) => (
                <div
                  key={pk.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{pk.name || "Passkey"}</p>
                    <p className="text-xs text-muted-foreground">
                      {pk.deviceType ?? "authenticator"}
                      {pk.createdAt ? ` · ${new Date(pk.createdAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await deletePasskey(pk.id);
                        await refreshPasskeys();
                      }, "Passkey removed")
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1 space-y-2">
              <Label htmlFor="pk-name">Name (optional)</Label>
              <Input
                id="pk-name"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                placeholder="MacBook · iPhone"
              />
            </div>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await addPasskey(passkeyName.trim() || undefined);
                  setPasskeyName("");
                  await refreshPasskeys();
                }, "Passkey registered")
              }
            >
              Add passkey
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Trusted devices</CardTitle>
          <CardDescription>
            When you check “Trust this device” on the 2FA challenge page, Better Auth stores a
            signed cookie (30 days by default) so you can skip 2FA on that browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Clear site cookies or use a private window to force a new 2FA challenge.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
