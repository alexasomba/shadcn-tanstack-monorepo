# Project: shadcn-tanstack-monorepo SaaS Kit

## Architecture

- **Apps**:
  - `user-web` (TanStack Start, port 8300) — End-user app; **owns local D1** under `.wrangler/state`.
  - `admin-web` (TanStack Start, port 8301) — Staff/admin console.
  - `data-service` (Hono OpenAPI, port 8302) — Shared API, queues, cron, workflows.
  - `agents` (port 8303) — Agents SDK chat Worker.
- **Packages**:
  - `packages/data-ops` — Drizzle schema/migrations, auth, queries, R2, workflows, seed, mailer.
  - `packages/result` — `@workspace/result` thin wrapper on better-result.
  - `packages/ui` — shadcn primitives + Watermelon compositions + sidebar blocks.

## Code Layout

- `apps/user-web/src/` — User routes, server fns, auth client.
- `apps/admin-web/src/` — Admin routes, CRM, referrals stats.
- `apps/data-service/src/` — Hono endpoints, jobs, API-key middleware.
- `packages/data-ops/src/` — Shared schema, auth plugins, DAL.

## Priority legend

| Tag | Meaning |
| --- | ------- |
| **P0** | Ship-blocking for a credible SaaS kit |
| **P1** | High — productize existing platform paths |
| **P2** | Medium — polish, admin ops, docs |
| **P3** | Low / optional extras |

## Cut lines

| Cut line | Milestones | Outcome |
| -------- | ---------- | ------- |
| **Kit-ready** | M8–M15, M18, M22 | Shell, org, keys, security, billing loop, real onboarding, Sentry fix, marketing cleanup |
| **Strong B2B** | Kit-ready + M14, M16, M17, M19, M21 | Entitlements, R2 UX, jobs, admin impersonation, audit log |
| **Public package** | Strong B2B + M33 | Cold-start docs, clean release |

## Suggested DAG

```text
M8 ──┬── M9 ──┬── M15 ── M24
     │        └── M21
     ├── M10 ── M28
     ├── M11
     ├── M16
     └── M13 ← M12
              └── M14 ── M26
                   └── M31

M17, M18          (parallel anytime after Phase 0)
M19 ── M20
M22 ── M23, M25, M30
M27, M29, M32     (optional tracks)
M33               (when P0/P1 done)
```

---

## Phase 0 — Platform expansion (DONE)

Backend SaaS expansion completed and verified (E2E + data-service tests). Status below supersedes earlier “PLANNED” rows.

| # | Name | Scope | Status |
| - | ---- | ----- | ------ |
| 1 | Plan setup | Architecture + milestone design | **DONE** |
| 2 | R1: Paystack, org & API key plugins | Plugins, schema, `requireApiKey` | **DONE** |
| 3 | R2: Cloudflare R2 presigned uploads | `data-ops` helpers + data-service routes | **DONE** |
| 4 | R3: Cloudflare Workflows | User/Org onboarding workflow classes + triggers | **DONE** |
| 5 | R4: Database seeding | `drizzle-seed` in data-ops | **DONE** |
| 6 | R5: Sentry observability | SDKs + debug routes + job capture | **DONE** |
| 7 | Integration & E2E verification | Tiered E2E + adversarial coverage | **DONE** |

### Phase 0 interface contracts (still authoritative)

**API key auth (Hono)** — `Authorization: Bearer <api_key>` or `x-api-key`; verifies via Better Auth API Key plugin.

**R2 helpers (`packages/data-ops`)**

- `getPresignedPutUrl(bucket, key, contentType, expiresIn?)`
- `getPresignedGetUrl(bucket, key, expiresIn?)`

---

## Phase A — Product shell & core SaaS UX (P0)

| ID | Name | Priority | Depends | Scope | Status |
| -- | ---- | -------- | ------- | ----- | ------ |
| **M8** | App shell & settings layout | P0 | — | Multi-tenant SaaS shell; settings nav; org switcher; demos stay under `/demo/*` | **PLANNED** |
| **M9** | Organization management UI | P0 | M8 | Create/switch/invite/roles/leave/delete org | PLANNED |
| **M10** | API keys product surface | P0 | M8 | `apiKeyClient` + create/list/revoke UI; copy-once secret | PLANNED |
| **M11** | Security settings | P0 | M8 | 2FA TOTP, backup codes, passkeys, login challenge | PLANNED |

### M8 acceptance

- Signed-in user lands on shell (not bare portfolio-only chrome).
- Nav: Overview, Organization, Members, Billing, API Keys, Security, Account.
- Active organization visible (switcher can be stubbed until M9 wires full org APIs).
- Mobile usable; marketing routes unchanged.

**Implementable checklist:** [docs/milestones/M8-app-shell-tasks.md](docs/milestones/M8-app-shell-tasks.md)

### M9–M11 acceptance (summary)

| ID | Acceptance |
| -- | ---------- |
| M9 | Two users: invite, accept, role denial; cross-org data isolation |
| M10 | Create key → call data-service with key → revoke → 401 |
| M11 | Enroll 2FA → next login requires challenge |

---

## Phase B — Billing product loop (P0–P1)

| ID | Name | Priority | Depends | Scope | Status |
| -- | ---- | -------- | ------- | ----- | ------ |
| **M12** | Paystack plans & catalog | P0 | Phase 0 | Fill `plans: []`; plan codes/env; seed plans | PLANNED |
| **M13** | Checkout, portal & subscription status | P0 | M12, M8 | Wire pricing CTAs; billing settings; real webhooks | PLANNED |
| **M14** | Entitlements & plan guards | P1 | M13 | Plan → limits; middleware; UI upgrade prompts | PLANNED |

### Notes

- Plugin already has `subscription: { enabled: true }` in `packages/data-ops/src/auth/plugins.ts`.
- Gap: empty `plans`, demo pricing copy, no app checkout/portal.

---

## Phase C — Make platform paths real (P1)

| ID | Name | Priority | Depends | Scope | Status |
| -- | ---- | -------- | ------- | ----- | ------ |
| **M15** | Real onboarding workflows | P1 | mailer; M12 optional | Replace no-op steps with email, defaults, free plan | PLANNED |
| **M16** | R2 product UX | P1 | M8 + R2 APIs | Avatar + org logo upload | PLANNED |
| **M17** | Jobs & product queue handlers | P1 | queue stubs | Typed job catalog beyond outbox/ping | PLANNED |
| **M18** | Sentry Result-boundary capture | P1 | Phase 0 Sentry | Capture `Result` errors before HTTP 500 | PLANNED |

---

## Phase D — Admin kit completeness (P1–P2)

| ID | Name | Priority | Depends | Scope | Status |
| -- | ---- | -------- | ------- | ----- | ------ |
| **M19** | Admin impersonation & user ops | P1 | admin plugin | Impersonate, ban, user detail | PLANNED |
| **M20** | Admin billing & referrals ops | P2 | M13 | Subscription list; expand referrals | PLANNED |
| **M21** | Audit log foundation | P2 | M9, M19 | Write + admin table for key actions | PLANNED |

---

## Phase E — Template polish (P2)

| ID | Name | Priority | Depends | Scope | Status |
| -- | ---- | -------- | ------- | ----- | ------ |
| **M22** | Marketing / demo cleanup | P2 | M8 preferred | Generic SaaS landing; isolate demos | PLANNED |
| **M23** | Auth client & docs parity | P2 | M10, M11, M13 | Client plugins match server; docs table | PLANNED |
| **M24** | First-run onboarding wizard | P2 | M9, M15 | Post-signup guided path | PLANNED |
| **M25** | Email templates polish | P2 | mailer | Verify/reset/invite/welcome/OTP templates | PLANNED |

---

## Phase F — Optional extras (P3)

| ID | Name | Priority | Depends | Scope | Status |
| -- | ---- | -------- | ------- | ----- | ------ |
| **M26** | Feature flags | P3 | M14 helpful | Runtime toggles + admin UI | PLANNED |
| **M27** | Dual billing (Stripe) | P3 | M13 stable | Only if multi-PSP needed | PLANNED |
| **M28** | Advanced developer portal | P3 | M10 | Usage, webhooks, OpenAPI try-it | PLANNED |
| **M29** | Multi-locale product UI | P3 | Paraglide | Shell/settings i18n | PLANNED |
| **M30** | Compliance & trust pages | P3 | M22 | Privacy/Terms/Security stubs | PLANNED |
| **M31** | Hardened multi-tenant defaults | P3↑P1 if B2B | M9, M14 | Org-scoped DAL + CI isolation gate | PLANNED |
| **M32** | Agents productization | P3 | agents app | In-shell chat + plan limits | PLANNED |
| **M33** | Template packaging & release | P3 | M8–M15+ | Cold-start guide, kit-ready tag | PLANNED |

---

## Master tracking table

| ID | Milestone | Priority | Phase | Status |
| -- | --------- | -------- | ----- | ------ |
| 1–7 | Platform expansion (R1–R5 + E2E) | — | 0 | **DONE** |
| M8 | App shell & settings layout | P0 | A | **PLANNED** ← next |
| M9 | Organization management UI | P0 | A | PLANNED |
| M10 | API keys product surface | P0 | A | PLANNED |
| M11 | Security settings (2FA/passkeys) | P0 | A | PLANNED |
| M12 | Paystack plans & catalog | P0 | B | PLANNED |
| M13 | Checkout, portal & subscription status | P0 | B | PLANNED |
| M14 | Entitlements & plan guards | P1 | B | PLANNED |
| M15 | Real onboarding workflows | P1 | C | PLANNED |
| M16 | R2 product UX | P1 | C | PLANNED |
| M17 | Jobs & product queue handlers | P1 | C | PLANNED |
| M18 | Sentry Result-boundary capture | P1 | C | PLANNED |
| M19 | Admin impersonation & user ops | P1 | D | PLANNED |
| M20 | Admin billing & referrals ops | P2 | D | PLANNED |
| M21 | Audit log foundation | P2 | D | PLANNED |
| M22 | Marketing / demo cleanup | P2 | E | PLANNED |
| M23 | Auth client & docs parity | P2 | E | PLANNED |
| M24 | First-run onboarding wizard | P2 | E | PLANNED |
| M25 | Email templates polish | P2 | E | PLANNED |
| M26 | Feature flags | P3 | F | PLANNED |
| M27 | Dual billing (Stripe) | P3 | F | PLANNED |
| M28 | Advanced developer portal | P3 | F | PLANNED |
| M29 | Multi-locale product UI | P3 | F | PLANNED |
| M30 | Compliance & trust pages | P3 | F | PLANNED |
| M31 | Hardened multi-tenant defaults | P3 | F | PLANNED |
| M32 | Agents productization | P3 | F | PLANNED |
| M33 | Template packaging & release | P3 | F | PLANNED |

---

## Known gaps (carry into milestones)

| Gap | Milestone |
| --- | --------- |
| Product UI missing for org / keys / billing / 2FA | M8–M13, M11 |
| `paystack` `plans: []` empty | M12 |
| Pricing page is demo copy | M13, M22 |
| Onboarding workflows are no-op steps | M15 |
| Queue handlers only outbox + ping | M17 |
| `Result.tryPromise` 500s skip Sentry | M18 |
| No `apiKeyClient` / paystack client on user-web | M10, M13, M23 |
| Portfolio/Web3 dashboards as “product” home | M8 |
| Conference/demo marketing residue | M22 |
