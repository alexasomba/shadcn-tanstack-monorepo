# M14 — Entitlements & plan guards

**Status:** DONE (2026-07-16)  
**Depends on:** M13  
**Parent:** [PROJECT.md](../../PROJECT.md)

## Model

| Plan family | Seats | Teams | API keys | R2  | Domains | Todos |
| ----------- | ----- | ----- | -------- | --- | ------- | ----- |
| free        | 5     | 1     | 5        | no  | no      | yes   |
| pro\*       | 50    | 10    | 20       | yes | yes     | yes   |
| business\*  | 200   | 50    | 50       | yes | yes     | yes   |

\* Includes `_yearly` variants.

## Server

- `packages/data-ops/src/entitlements.ts` — `resolveEntitlements(db, referenceId)`, `entitlementsForPlan`, `hasFeature`
- Middleware: `requireFeature("domains" | "r2")` after `requireApiKey`
- Free routes: `/todos/*` (still gated by API key only)
- Paid routes: `/domains/*`, `/r2/*` → **402** with `upgradePath: "/pricing"`
- `GET /entitlements` (API key + active org) returns resolved plan features

## Client

- `lib/entitlements.ts` — map subscription list → plan features
- Billing settings shows entitlements grid
- `UpgradeGate` component for feature pages

## Tests

```bash
pnpm --filter data-service exec vitest run src/entitlements.test.ts
```
