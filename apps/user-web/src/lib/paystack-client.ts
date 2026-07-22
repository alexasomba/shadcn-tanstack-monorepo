/**
 * Narrow paystack surface so we don't type the whole auth client as `any`.
 * paystackClient deep-types collapse Better Auth React client inference under TS.
 */
import type { PaystackClientActions } from "@alexasomba/better-auth-paystack/client";

import { authClient } from "#/lib/auth-client";

type BillingAuthClient = {
  paystack: PaystackClientActions;
  subscription: PaystackClientActions["subscription"];
  transaction: PaystackClientActions["transaction"];
};

/** Runtime client already has these plugins; cast avoids `any & T` lint. */
const billing = authClient as BillingAuthClient;

export const paystackActions = billing.paystack;
export const subscriptionActions = billing.subscription;
export const transactionActions = billing.transaction;
