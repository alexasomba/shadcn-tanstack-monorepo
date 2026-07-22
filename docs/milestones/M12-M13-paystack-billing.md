# M12–M13 — Paystack plans + checkout

**Status:** DONE (2026-07-16)  
**Parent:** [PROJECT.md](../../PROJECT.md)

## Server (`packages/data-ops`)

- Plan catalog: `src/auth/paystack-plans.ts` (`free`, `pro`, `pro_yearly`, `business`, `business_yearly`)
- `paystack({ subscription.plans, organization.enabled, webhook.secret, createCustomerOnSignUp })`
- Org column `paystackCustomerCode` via auth generate + D1 migration
- Env overrides: `PAYSTACK_PLAN_PRO`, etc.

## Client

- `paystackClient({ subscription: true })` on user-web / admin-web
- Wrappers: `lib/billing.queries.ts` → `subscription.create/list/cancel/restore/billingPortal`

## UI

| Route                        | Role                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `/pricing`                   | Kit plan tiers + checkout CTA (org `referenceId` when active) |
| `/billing/paystack/callback` | Server-verify return path (M14.x) → billing success banner    |
| `/settings/billing`          | Status, upgrade, cancel at period end, portal, transactions   |

## Env

```bash
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_WEBHOOK_SECRET=sk_test_...
# optional native plan codes
PAYSTACK_PLAN_PRO=PLN_xxx
```

Webhook path: `POST /api/auth/paystack/webhook`

## Note

`paystackClient` deep types collapse Better Auth React client inference; `authClient` is widened with `any` so core methods remain usable (runtime plugins intact).
