import { parsePaystackMetadata } from "@alexasomba/better-auth-paystack/client";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useEffect, useRef, useState } from "react";
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
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState("");
  const [successTitle, setSuccessTitle] = useState("Payment Successful!");
  const [successMessage, setSuccessMessage] = useState("Redirecting you to billing…");
  const processedRef = useRef(false);

  useEffect(() => {
    if (reference === undefined || reference === "" || processedRef.current) return;
    processedRef.current = true;

    const run = async () => {
      try {
        const result = (await verify({
          data: { reference },
        })) as VerifyCallbackResult;

        if (result.data.status !== "success") {
          throw new Error("Verification did not complete successfully");
        }

        const metadata = parsePaystackMetadata((result.data as { metadata?: unknown }).metadata);

        const isTrial = metadata.isTrial === true || metadata.isTrial === "true";
        const trialRequested =
          metadata.trialRequested === true || metadata.trialRequested === "true";
        const trialGranted = metadata.trialGranted === true || metadata.trialGranted === "true";
        const trialPlan =
          typeof metadata.plan === "string" && metadata.plan !== "" ? metadata.plan : null;
        const productName =
          typeof metadata.product === "string" && metadata.product !== "" ? metadata.product : null;
        const isProration = metadata.type === "proration";

        if (isTrial) {
          setSuccessTitle("Trial Started!");
          setSuccessMessage(
            trialPlan !== null
              ? `${trialPlan} is now in trial mode. Redirecting to billing…`
              : "Your trial is active. Redirecting to billing…",
          );
        } else if (isProration) {
          setSuccessTitle("Upgrade Successful!");
          setSuccessMessage("Your prorated upgrade payment has been confirmed.");
        } else if (trialRequested && trialGranted === false) {
          setSuccessTitle("Subscription Activated");
          setSuccessMessage(
            trialPlan !== null
              ? `Your ${trialPlan} trial was already used, so paid billing started immediately.`
              : "Your previous trial was already used, so paid billing started immediately.",
          );
        } else if (trialPlan !== null) {
          setSuccessTitle("Subscription Active!");
          setSuccessMessage(
            `Your ${trialPlan} subscription payment has been confirmed. Redirecting…`,
          );
        } else if (productName !== null) {
          setSuccessTitle("Purchase Successful!");
          setSuccessMessage(`${productName} has been paid for successfully. Redirecting…`);
        } else {
          setSuccessTitle("Payment Successful!");
          setSuccessMessage("Redirecting you to billing…");
        }

        setStatus("success");
        setTimeout(() => {
          void router.navigate({
            to: "/settings/billing",
            search: { checkout: "success", reference },
          });
        }, 1800);
      } catch (e: unknown) {
        setStatus("error");
        setError(unknownErrorMessage(e, "Verification failed"));
      }
    };

    void run();
  }, [reference, router, verify]);

  if (reference === undefined || reference === "") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/70 shadow-none">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No payment reference provided. Return to{" "}
            <a className="underline" href="/settings/billing">
              billing
            </a>
            .
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-center text-lg">
            {status === "verifying" && "Verifying payment…"}
            {status === "success" && successTitle}
            {status === "error" && "Verification failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          {status === "verifying" && <p>Please wait while we confirm your transaction.</p>}
          {status === "success" && <p>{successMessage}</p>}
          {status === "error" && (
            <div className="space-y-3">
              <p className="text-destructive">{error}</p>
              <a className="text-foreground underline" href="/settings/billing">
                Back to billing
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
