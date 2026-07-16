# M15 — Real onboarding workflows

**Status:** DONE  
**Depends on:** mailer / notify; M14.x hooks optional  
**Parent:** [PROJECT.md](../../PROJECT.md)

## Goals

Replace no-op Cloudflare Workflow steps with real first-run behavior:

| Workflow | Step                      | Behavior                                                                                            |
| -------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| User     | `create_user_profile`     | Profile defaults (display username / username from email) + **free plan** subscription for `userId` |
| User     | `send_welcome_email`      | `notify.welcome` (OneSignal) with **mailer fallback**                                               |
| Org      | `provision_org_workspace` | Tag `organization.metadata.plan = free` when unset                                                  |
| Org      | `initialize_billing`      | **Free plan** subscription for `orgId`                                                              |

## Code

- Helpers: `packages/data-ops/src/queries/billing-onboarding.ts`
  - `ensureFreeSubscription` (idempotent, local `sub_local_free_*` codes)
  - `applyUserProfileDefaults`
  - `ensureOrgFreePlanMetadata`
- Workflows: `packages/data-ops/src/workflows/onboarding.ts`
- Exported from data-service Worker entry for Wrangler `class_name`
- Triggers unchanged: `onUserSignup` / `onOrgCreate` in user-web + data-service auth

## Free plan model

- Row in `subscription` with `plan=free`, `status=active`, `referenceId` = user or org id
- Entitlements already treat “no row” as free; explicit row makes billing UI / lists honest
- Paid upgrades still go through Paystack checkout + callback verify (M14.x)

## Tests

```bash
pnpm --filter data-service exec vitest run src/onboarding.test.ts
```

## Follow-ups

- M24 first-run wizard UI
- M25 richer email templates
- Outbox events from paystack lifecycle hooks
