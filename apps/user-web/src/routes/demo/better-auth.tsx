import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Spinner } from "@workspace/ui/components/spinner";
import { useState } from "react";

import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/demo/better-auth")({
  component: BetterAuthDemo,
});

function BetterAuthDemo() {
  const { data: session, isPending } = authClient.useSession();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isPending) {
    return (
      <main className="demo-page demo-center">
        <Spinner className="size-6" />
      </main>
    );
  }

  if (session?.user) {
    return (
      <main className="demo-page demo-center">
        <section className="demo-panel flex w-full max-w-md flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="island-kicker mb-2">Better Auth</p>
            <h1 className="demo-title">Welcome back</h1>
            <p className="demo-muted text-sm">You're signed in as {session.user.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? ""} />
              <AvatarFallback>
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.user.name}</p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {session.user.email}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              void authClient.signOut();
            }}
            className="w-full"
          >
            Sign out
          </Button>

          <p className="demo-muted text-center text-xs">
            Built with{" "}
            <a
              href="https://better-auth.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium"
            >
              BETTER-AUTH
            </a>
            .
          </p>
        </section>
      </main>
    );
  }

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
        });
        if (result.error) {
          setError(result.error.message || "Sign up failed");
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) {
          setError(result.error.message || "Sign in failed");
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="demo-page demo-center">
      <section className="demo-panel w-full max-w-md">
        <p className="island-kicker mb-2">Better Auth</p>
        <h1 className="demo-title">{isSignUp ? "Create an account" : "Sign in"}</h1>
        <p className="demo-muted mt-2 mb-6 text-sm">
          {isSignUp
            ? "Enter your information to create an account"
            : "Enter your email below to login to your account"}
        </p>

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
                  autoComplete="name"
                  required
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
                autoComplete="email"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                minLength={8}
              />
            </Field>
          </FieldGroup>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="size-4" />
                <span>Please wait</span>
              </span>
            ) : isSignUp ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </Button>
        </div>

        <p className="demo-muted mt-6 text-center text-xs">
          Built with{" "}
          <a
            href="https://better-auth.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium"
          >
            BETTER-AUTH
          </a>
          .
        </p>
      </section>
    </main>
  );
}

