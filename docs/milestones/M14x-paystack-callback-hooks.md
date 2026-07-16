# M14.x — Paystack callback, typing & lifecycle hooks

**Status:** DONE  
**Depends on:** M13–M14  
**Parent:** [PROJECT.md](../../PROJECT.md)

## Goals

Close production gaps in the paid loop before M15 onboarding, using patterns from
[`better-auth-paystack` TanStack example](https://github.com/alexasomba/better-auth-paystack/tree/main/examples/tanstack).

## Delivered

### Callback + server verify

- Route: `/billing/paystack/callback` (`apps/user-web/src/routes/billing.paystack.callback.tsx`)
- Accepts `reference` and `trxref` search params
- Server fn: `verifyPaystackCallbackServerFn` with short retries for “reference not found”
- Trial / proration / product messaging via `parsePaystackMetadata`
- Redirect → `/settings/billing?checkout=success&reference=…`
- All checkout `callbackURL`s use `paystackCallbackURL()`

### Typed Paystack surface

- Root `authClient` stays `any` (paystackClient still collapses multi-plugin inference)
- `lib/paystack-client.ts` exports a **narrow** cast:
  `paystackActions` / `subscriptionActions` / `transactionActions` via `PaystackClientActions`
- Billing wrappers use that surface; rest of the app keeps working

### Lifecycle hooks (data-ops)

- `onSubscriptionCreated` / `onSubscriptionCancel` (structured logs)
- `organization.onCustomerCreate` / top-level `onCustomerCreate`
- Free plan **not** assigned here — M15 onboarding workflows own that

## Deferred (not this milestone)

- BillingTargetSelector / seats UI
- Schedule / prorate upgrades
- Catalog sync + manual renewal (admin)
- `createPaystack` SDK retries
