import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
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
import { useState } from "react";
import { z } from "zod";

import SiteFooter from "#/components/marketing/SiteFooter";
import SiteHeader from "#/components/marketing/SiteHeader";
import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";
import { stashAuthRedirect } from "#/lib/security.queries";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  /** Referral code (8 uppercase alnum). Also accepts lowercase and normalizes. */
  ref: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async () => {
    const session = await getSession();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
  head: ({ match }) => {
    const tenant = match.context.tenant;
    const brand = tenant?.organizationName ?? "Starter";
    return {
      meta: [{ title: `Sign in — ${brand}` }],
    };
  },
});

function normalizeReferralCode(value: string) {
  return value.trim().toUpperCase();
}

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect: redirectTo, ref: refFromSearch } = Route.useSearch();
  const { tenant } = Route.useRouteContext();
  const [isSignUp, setIsSignUp] = useState(Boolean(refFromSearch));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState(
    refFromSearch ? normalizeReferralCode(refFromSearch) : "",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const afterAuth = async () => {
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      // Preserve deep-link redirect without full page reload when possible.
      router.history.push(redirectTo);
      return;
    }
    await navigate({ to: "/dashboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const code = normalizeReferralCode(referralCode);
        const result = await authClient.signUp.email(
          {
            email,
            password,
            name,
            callbackURL: typeof window !== "undefined" ? window.location.origin : undefined,
          },
          code
            ? {
                headers: {
                  "x-referral-code": code,
                },
              }
            : undefined,
        );
        if (result.error) {
          setError(result.error.message || "Sign up failed");
          return;
        }
      } else {
        stashAuthRedirect(redirectTo);
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        if (result.error) {
          setError(result.error.message || "Sign in failed");
          return;
        }
        // BA twoFactorClient may hard-redirect via twoFactorPage; also handle inline.
        const data = result.data as { twoFactorRedirect?: boolean } | null | undefined;
        if (data && data.twoFactorRedirect) {
          await navigate({
            to: "/two-factor",
            search: redirectTo ? { redirect: redirectTo } : {},
          });
          return;
        }
      }
      await afterAuth();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:py-24">
        <Card className="border-border/70 shadow-xl shadow-primary/5">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="text-2xl tracking-tight">
              {isSignUp ? "Create an account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Email and password via Better Auth. Optional referral code on signup."
                : tenant
                  ? `Sign in to ${tenant.organizationName}`
                  : "Sign in to open your portfolio dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              {isSignUp ? (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
              </div>

              {isSignUp ? (
                <div className="grid gap-2">
                  <Label htmlFor="referral">Referral code (optional)</Label>
                  <Input
                    id="referral"
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(normalizeReferralCode(e.target.value))}
                    maxLength={8}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="ABCD1234"
                    className="font-mono tracking-wider uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    8 characters. Share links like{" "}
                    <span className="font-mono">/login?ref=CODE</span>.
                  </p>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
              </Button>
            </form>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
            >
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Link to="/" preload="intent" className="underline-offset-4 hover:underline">
                Back to home
              </Link>
              {" · "}
              <Link
                to="/demo/better-auth"
                preload="intent"
                className="underline-offset-4 hover:underline"
              >
                Auth demo
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <ButtonLink to="/dashboard" variant="ghost" size="sm">
            Continue to dashboard
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
