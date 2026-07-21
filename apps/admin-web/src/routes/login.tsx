import { SquaresFourIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useState } from "react";
import { z } from "zod";

import { canAccessAdminConsole } from "#/lib/admin";
import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async () => {
    const session = await getSession();
    if (session && canAccessAdminConsole(session.user, session.session)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Admin sign in" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect: redirectTo, error: searchError } = Route.useSearch();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(
    searchError === "admin_required"
      ? "This account is signed in but is not an admin. Promote with role=admin or BETTER_AUTH_ADMIN_USER_IDS."
      : "",
  );
  const [loading, setLoading] = useState(false);

  const afterAuth = async () => {
    const session = await getSession();
    if (session && !canAccessAdminConsole(session.user, session.session)) {
      setError(
        "Signed in, but this user is not an admin. Set role to admin (D1) or add the user id to BETTER_AUTH_ADMIN_USER_IDS, then sign in again.",
      );
      return;
    }
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
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
        const result = await authClient.signUp.email({
          email,
          password,
          name,
          callbackURL: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        if (result.error) {
          setError(result.error.message || "Sign up failed");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        if (result.error) {
          setError(result.error.message || "Sign in failed");
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <SquaresFourIcon className="size-5" />
          </span>
          <p className="text-sm font-medium text-muted-foreground">Admin console</p>
        </div>

        <Card className="border-border/70 shadow-xl shadow-primary/5">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="text-2xl tracking-tight">
              {isSignUp ? "Create account" : "Operator sign in"}
            </CardTitle>
            <CardDescription>
              Internal operators only. Admin role required for the console.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                {isSignUp ? (
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </Field>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                </Field>
              </FieldGroup>

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
              Bootstrap:{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                UPDATE user SET role=&apos;admin&apos; WHERE email=&apos;…&apos;
              </code>
            </p>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              <Link
                to="/demo/better-auth"
                preload="intent"
                className="underline-offset-4 hover:underline"
              >
                Auth demo route
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
