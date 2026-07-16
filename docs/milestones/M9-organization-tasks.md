# M9 — Organization management UI (+ Better Auth best practices)

**Priority:** P0  
**Status:** DONE (2026-07-16)  
**Depends on:** M8  
**Parent roadmap:** [PROJECT.md](../../PROJECT.md)

## Delivered

| Area             | Implementation                                                              |
| ---------------- | --------------------------------------------------------------------------- |
| Create org       | name + slug + `checkSlug` + `keepCurrentActiveOrganization` + metadata plan |
| List / switch    | **BA hooks** `useListOrganizations` / `useActiveOrganization`               |
| Permissions      | **BA** `checkRolePermission` (not hand-rolled owner checks)                 |
| Update / delete  | AC-gated (`organization:update` / `delete`)                                 |
| Invite           | 7-day expiry, cancel on re-invite, **requireEmailVerificationOnInvitation** |
| Members          | invite / roles / remove / leave                                             |
| Teams            | `teams.enabled` + `/settings/teams` (default team on create)                |
| Accept deep link | `getInvitation` preview + accept/reject                                     |
| Plan stub        | `metadata.plan: "free"` + membershipLimit by plan                           |

## Server plugin highlights (`packages/data-ops/src/auth/plugins.ts`)

- `allowUserToCreateOrganization` → verified email only
- `teams: { enabled: true, maximumTeams: 20, … }`
- Invitation security options as above
- `beforeCreateOrganization` sets default `metadata.plan`

## Manual smoke

1. Verify email (or use verified user) → create org → default team appears under Teams.
2. `checkSlug` shows Available / taken.
3. Invite → open `/accept-invite?id=` → org name shown via `getInvitation`.
4. Unverified email cannot accept (plugin setting).
5. Member without AC cannot manage teams/members UI.
