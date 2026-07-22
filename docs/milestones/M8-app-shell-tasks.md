# M8 — App shell & settings layout

**Priority:** P0  
**Status:** DONE (2026-07-16)  
**Depends on:** Existing `_protected` auth (`apps/user-web/src/routes/_protected.tsx`)  
**Parent roadmap:** [PROJECT.md](../../PROJECT.md)

## Goal

Replace portfolio-as-product chrome with a multi-tenant SaaS app shell: sidebar, settings sections, org switcher placeholder, and stable routes for M9–M13 to fill in.

Out of scope for M8: full org CRUD (M9), API key APIs UI (M10), 2FA flows (M11), real billing (M13). Those pages may ship as **stubs** with clear empty states.

---

## Acceptance criteria

- [x] Authenticated user lands on shell overview (default protected home).
- [x] Layout: sidebar (desktop) + collapsible mobile nav; content `Outlet`.
- [x] Nav items: Overview, Organization, Members, Billing, API Keys, Security, Account.
- [x] Active organization name visible (list orgs from session/client; “Create org” can deep-link stub until M9).
- [x] Existing `/_protected/account` content moved/integrated under Account section.
- [x] Portfolio dashboard either moved under Overview as a card **or** demoted to `/demo/portfolio` — product home is shell overview.
- [x] Marketing (`/`, `/pricing`, etc.) and `/demo/*` unchanged in role (no shell wrapper).
- [x] Lint clean on M8 files; route tree regenerated.

---

## File-level checklist

### 1. Route structure

- [ ] Extend protected layout so shell wraps all product routes:
  - Prefer nested pathless layout or `_protected` component that renders shell + `<Outlet />`.
  - **Touch:** `apps/user-web/src/routes/_protected.tsx`
- [ ] Add route tree under `_protected/`:

| Route                        | File                                                                    | M8 content                               |
| ---------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| `/dashboard` or `/app`       | Keep or rename overview                                                 | Shell overview (metrics placeholders OK) |
| `/settings` or section roots | see below                                                               | —                                        |
| `/settings/organization`     | `_protected/settings.organization.tsx` (or `settings/organization.tsx`) | Stub + “coming in M9” / minimal list     |
| `/settings/members`          | `settings/members.tsx`                                                  | Stub                                     |
| `/settings/billing`          | `settings/billing.tsx`                                                  | Stub (link to `/pricing`)                |
| `/settings/api-keys`         | `settings/api-keys.tsx`                                                 | Stub                                     |
| `/settings/security`         | `settings/security.tsx`                                                 | Stub                                     |
| `/account`                   | existing `account.tsx`                                                  | Keep referrals/inbox; fit shell          |

**TanStack file routing note:** Match existing conventions (`_protected/account.tsx`). Prefer:

```text
apps/user-web/src/routes/_protected.tsx          # layout: shell + Outlet
apps/user-web/src/routes/_protected/dashboard.tsx
apps/user-web/src/routes/_protected/account.tsx
apps/user-web/src/routes/_protected/settings/
  organization.tsx
  members.tsx
  billing.tsx
  api-keys.tsx
  security.tsx
```

If flat files are preferred, use `_protected/settings.organization.tsx` etc.

- [ ] Regenerate route tree (TanStack Router plugin on dev/build).
- [ ] Update post-login redirect in `login.tsx` if default path changes.
- [ ] Update any `Link`/`ButtonLink` targets (header, account page).

### 2. Shell components (user-web)

- [ ] `apps/user-web/src/components/app-shell/app-shell.tsx` — SidebarProvider + sidebar + inset + header.
- [ ] `apps/user-web/src/components/app-shell/app-sidebar.tsx` — Nav items + org switcher slot + user menu.
- [ ] `apps/user-web/src/components/app-shell/nav-main.tsx` — Typed `Link` items to settings routes.
- [ ] `apps/user-web/src/components/app-shell/org-switcher.tsx` — Wire Better Auth org list/active org when easy; else static + TODO for M9.
- [ ] `apps/user-web/src/components/app-shell/nav-user.tsx` — Account link, sign out (reuse patterns from account page).
- [ ] `apps/user-web/src/lib/app-nav.ts` — Single source of nav config (`to`, `label`, `icon`).

**UI reuse (prefer compose, don’t fork heavy demo data):**

- Blocks: `packages/ui/src/blocks/sidebar-07/components/` (`TeamSwitcher`, `NavUser`, `AppSidebar` as reference).
- Primitives: `@workspace/ui/components/sidebar`, `dropdown-menu`, `button`, `separator`.
- Icons: `@phosphor-icons/react` only (project convention).

### 3. Auth / session context

- [ ] Ensure shell can read `user` from route context (`_protected` already returns `{ user, session }`).
- [ ] Optional: server fn or client call to list organizations for switcher:
  - `authClient.organization.list()` / `setActive` if available.
  - Do **not** block M8 if org list is empty — show “No organization” CTA.
- [ ] Do not add new Better Auth plugins in M8.

### 4. Dashboard / overview

- [ ] Rewrite `_protected/dashboard.tsx` (or overview route):
  - Remove full-screen portfolio-only layout as the only product chrome.
  - Show welcome + quick links into settings sections.
  - Optionally embed a slim portfolio summary card if still useful.
- [ ] If portfolio UI retained for demos: add `routes/demo/portfolio.tsx` (or keep under demo) and link from overview as “Demo”.

### 5. Account page

- [ ] Wrap account content in shell (automatic if under `_protected` layout).
- [ ] Remove duplicate marketing header/footer if shell provides chrome (`SiteHeader`/`SiteFooter` on account currently).
- [ ] Keep `ReferralCard`, `AuthInboxButton`, sign-out.

### 6. Stub settings pages

Each stub page:

- [ ] Title + short description of future milestone.
- [ ] Empty state card.
- [ ] No fake write APIs.

### 7. Discovery / nav / SEO (light)

- [ ] `apps/user-web/src/lib/nav.ts` — marketing nav only; do not put settings there.
- [ ] Skip sitemap private routes (already private).
- [ ] Page `head` titles: `Overview — App`, `Billing — Settings`, etc.

### 8. Tests & verification

- [ ] Manual: `vpr dev:user` → login → click every settings nav item.
- [ ] Optional e2e (if cheap): `apps/e2e-tests` smoke — login → `/dashboard` → `/settings/organization` 200.
- [ ] `vp check` (or filter user-web) clean.
- [ ] No regression: unauthenticated hit to `/dashboard` redirects to `/login`.

### 9. Docs touch

- [ ] Mark M8 **DONE** in `PROJECT.md` master table when complete.
- [ ] One-line note in root `README.md` under architecture: protected app shell at `/dashboard` + `/settings/*` (only if README already documents app routes).

---

## Suggested implementation order

1. Nav config + shell components (static orgs OK).
2. Wire `_protected.tsx` layout to shell.
3. Add settings route stubs.
4. Refit dashboard + account.
5. Org switcher read-only list if org client works in one pass.
6. Check / smoke / update PROJECT.md status.

---

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] File checklist complete.
- [ ] `PROJECT.md` M8 status → **DONE**.
- [ ] Handoff ready for **M9** (org pages fill stubs) without layout churn.

## Out of scope (explicit)

| Item                              | Milestone          |
| --------------------------------- | ------------------ |
| Invite members, roles, delete org | M9                 |
| Create/revoke API keys            | M10                |
| 2FA / passkey enroll UI           | M11                |
| Paystack checkout                 | M12–M13            |
| Admin-web shell parity            | M19 (or follow-up) |
| Marketing redesign                | M22                |
