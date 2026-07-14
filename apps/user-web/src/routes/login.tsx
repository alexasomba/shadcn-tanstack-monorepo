import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async () => {
    const session = await getSession();
    if (session) {
      throw redirect({ to: "/account" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const afterAuth = async () => {
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      window.location.assign(redirectTo);
      return;
    }
    await navigate({ to: "/account" });
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
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSignUp ? "Create an account" : "Sign in"}
        </h1>
        <p className="text-sm text-neutral-500">
          {isSignUp ? "Email and password via Better Auth" : "Welcome back"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
        {isSignUp ? (
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              required
              autoComplete="name"
            />
          </div>
        ) : null}

        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            required
            autoComplete="email"
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            required
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        className="mt-4 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError("");
        }}
      >
        {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>

      <p className="mt-8 text-center text-xs text-neutral-500">
        Demo also available at{" "}
        <Link to="/demo/better-auth" className="underline">
          /demo/better-auth
        </Link>
      </p>
    </main>
  );
}
