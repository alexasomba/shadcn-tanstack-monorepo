import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
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
import { useState } from "react";
import { z } from "zod";

import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";
import { getSession } from "#/lib/auth.functions";
import {
  sendTwoFactorOtp,
  takeAuthRedirect,
  verifyBackupCode,
  verifyTotpChallenge,
  verifyTwoFactorOtp,
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

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/two-factor")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    // If already fully signed in, skip challenge.
    const session = await getSession();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: TwoFactorChallengePage,
  head: () => ({
    meta: [{ title: "Two-factor authentication — Starter" }],
  }),
});

type Mode = "totp" | "otp" | "backup";

function TwoFactorChallengePage() {
  const navigate = useNavigate();
  const { redirect: redirectSearch } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const finish = async () => {
    const dest =
      redirectSearch && redirectSearch.startsWith("/") && !redirectSearch.startsWith("//")
        ? redirectSearch
        : takeAuthRedirect("/dashboard");
    await navigate({ to: dest });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "totp") {
        await verifyTotpChallenge(code, trustDevice);
      } else if (mode === "otp") {
        await verifyTwoFactorOtp(code, trustDevice);
      } else {
        await verifyBackupCode(code, trustDevice);
      }
      await finish();
    } catch (err) {
      setError(unknownErrorMessage(err, "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await sendTwoFactorOtp();
      setOtpSent(true);
      setMode("otp");
    } catch (err) {
      setError(unknownErrorMessage(err, "Could not send code"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:py-24">
        <Card className="border-border/70 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl tracking-tight">Two-factor verification</CardTitle>
            <CardDescription>
              Enter a code from your authenticator app, email OTP, or a backup code to finish
              signing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["totp", "Authenticator"],
                  ["otp", "Email OTP"],
                  ["backup", "Backup code"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={mode === id ? "default" : "outline"}
                  onClick={() => {
                    setMode(id);
                    setCode("");
                    setError("");
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>

            <form onSubmit={submit} className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="2fa-code">
                  {mode === "backup" ? "Backup code" : "Verification code"}
                </Label>
                <Input
                  id="2fa-code"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      mode === "backup"
                        ? e.target.value.trim()
                        : e.target.value.replace(/\D/g, "").slice(0, 8),
                    )
                  }
                  autoComplete="one-time-code"
                  inputMode={mode === "backup" ? "text" : "numeric"}
                  className="font-mono tracking-wider"
                  placeholder={mode === "backup" ? "xxxx-xxxx" : "000000"}
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="size-4 rounded border"
                />
                Trust this device for 30 days
              </label>

              {mode === "otp" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void sendOtp()}
                >
                  {otpSent ? "Resend email code" : "Send email code"}
                </Button>
              ) : null}

              {error ? (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" disabled={loading || !code} className="w-full">
                {loading ? "Verifying…" : "Verify and continue"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              <Link to="/login" preload="intent" className="underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
