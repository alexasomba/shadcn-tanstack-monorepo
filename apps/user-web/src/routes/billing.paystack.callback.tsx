import { parsePaystackMetadata } from "@alexasomba/better-auth-paystack/client";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useRef } from "react";
import { z } from "zod";

import { verifyPaystackCallbackServerFn } from "#/lib/billing.functions";
import type { VerifyCallbackResult } from "#/lib/billing.functions";

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
  reference: z.string().optional(),
  trxref: z.string().optional(),
});

export const Route = createFileRoute("/billing/paystack/callback")({
  validateSearch: searchSchema,
  component: PaystackCallbackPage,
  head: () => ({
    meta: [{ title: "Confirming payment — Starter" }, { name: "robots", content: "noindex" }],
  }),
});

function PaystackCallbackPage() {
  const router = useRouter();
  const verify = useServerFn(verifyPaystackCallbackServerFn);
  const search = Route.useSearch();
  const reference = search.reference ?? search.trxref;
  const redirectedRef = useRef(false);

  const {
    data: verificationResult,
    isPending,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["paystack-verify-callback", reference],
    queryFn: async () => {
      if (!reference) throw new Error("No payment reference provided");
      const result = (await verify({
        data: { reference },
      })) as VerifyCallbackResult;
      if (result.data.status !== "success") {
        throw new Error("Verification did not complete successfully");
      }
      return result;
    },
    enabled: Boolean(reference),
    staleTime: Infinity,
  });

  if (verificationResult && !redirectedRef.current && typeof window !== "undefined") {
    redirectedRef.current = true;
    setTimeout(() => {
      void router.navigate({
        to: "/settings/billing",
        search: { checkout: "success", reference: reference ?? "" },
      });
    }, 1800);
  }

  const metadata = verificationResult
    ? parsePaystackMetadata((verificationResult.data as { metadata?: unknown }).metadata)
    : null;

  let successTitle = "Payment Successful!";
  let successMessage = "Redirecting you to billing…";

  if (metadata) {
    const isTrial = metadata.isTrial === true || metadata.isTrial === "true";
    const trialRequested = metadata.trialRequested === true || metadata.trialRequested === "true";
    const trialGranted = metadata.trialGranted === true || metadata.trialGranted === "true";
    const trialPlan =
      typeof metadata.plan === "string" && metadata.plan !== "" ? metadata.plan : null;
    const productName =
      typeof metadata.product === "string" && metadata.product !== "" ? metadata.product : null;
    const isProration = metadata.type === "proration";

    if (isTrial) {
      successTitle = "Trial Started!";
      successMessage =
        trialPlan !== null
          ? `${trialPlan} is now in trial mode. Redirecting to billing…`
          : "Your trial is active. Redirecting to billing…";
    } else if (isProration) {
      successTitle = "Upgrade Successful!";
      successMessage = "Your prorated upgrade payment has been confirmed.";
    } else if (trialRequested && trialGranted === false) {
      successTitle = "Subscription Activated";
      successMessage =
        trialPlan !== null
          ? `Your ${trialPlan} trial was already used, so paid billing started immediately.`
          : "Your previous trial was already used, so paid billing started immediately.";
    } else if (trialPlan !== null) {
      successTitle = "Subscription Active!";
      successMessage = `Your ${trialPlan} subscription payment has been confirmed. Redirecting…`;
    } else if (productName !== null) {
      successTitle = "Purchase Successful!";
      successMessage = `${productName} has been paid for successfully. Redirecting…`;
    }
  }

  if (reference === undefined || reference === "") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/70 shadow-none">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No payment reference provided. Return to{" "}
            <Link className="underline" to="/settings/billing">
              billing
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-border/70 shadow-none">
        <CardHeader role="status" aria-live="polite">
          <CardTitle className="text-center text-lg">
            {isPending && "Verifying payment…"}
            {Boolean(verificationResult) && successTitle}
            {isError && "Verification failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          {isPending && <p>Please wait while we confirm your transaction.</p>}
          {Boolean(verificationResult) && <p>{successMessage}</p>}
          {isError && (
            <div className="space-y-3">
              <p className="text-destructive">
                {unknownErrorMessage(queryError, "Verification failed")}
              </p>
              <Link className="text-foreground underline" to="/settings/billing">
                Back to billing
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
