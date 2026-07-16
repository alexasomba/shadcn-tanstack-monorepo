# M19 — Admin impersonation & user ops

**Status:** DONE  
**Depends on:** Better Auth `admin` plugin  
**Parent:** [PROJECT.md](../../PROJECT.md)  
**Official docs:** [Admin plugin](https://www.better-auth.com/docs/plugins/admin)

## Installation (already in kit)

| Layer  | Location                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Server | `packages/data-ops` → `admin({ defaultRole, adminRoles, adminUserIds, impersonationSessionDuration, defaultBanReason, bannedUserMessage })` |
| Client | `admin-web` → `adminClient()` in `auth-client.ts`                                                                                           |
| Schema | `user.role`, `user.banned`, `user.banReason`, `user.banExpires`, `session.impersonatedBy`                                                   |

Bootstrap admins: `role='admin'` **or** `BETTER_AUTH_ADMIN_USER_IDS`.

## API coverage (console)

| Docs endpoint                              | UI                                                    |
| ------------------------------------------ | ----------------------------------------------------- |
| `createUser`                               | `/users` create form                                  |
| `listUsers`                                | Directory + search (`email` \| `name`) + pagination   |
| `getUser`                                  | `/users/$userId` (filter fallback)                    |
| `setRole`                                  | List + detail                                         |
| `updateUser`                               | Detail — name                                         |
| `setUserPassword`                          | Detail — set password (not via updateUser)            |
| `banUser` / `unbanUser`                    | List + detail (reason + optional `banExpiresIn` days) |
| `listUserSessions`                         | Detail table                                          |
| `revokeUserSession` / `revokeUserSessions` | Detail                                                |
| `impersonateUser`                          | List + detail → `/dashboard`                          |
| `stopImpersonating`                        | Shell banner                                          |
| `removeUser`                               | Detail danger zone                                    |

Not exposed in kit UI (available via wrappers / future): custom AC roles, `hasPermission` server checks beyond default admin/user.

## Access control

Default roles `admin` / `user` (comma-separated multi-role supported).

`canAccessAdminConsole`:

- Admins (role or bootstrap IDs)
- **While impersonating** (`session.impersonatedBy`) so the operator can stop

Server plugin:

```ts
admin({
  defaultRole: "user",
  adminRoles: ["admin"],
  adminUserIds: readAdminUserIds(),
  impersonationSessionDuration: 60 * 60, // 1h
  defaultBanReason: "No reason",
  bannedUserMessage: "…",
});
```

Admins cannot impersonate other admins by default (plugin); grant `impersonate-admins` via custom AC if needed.

## Files

- `apps/admin-web/src/lib/admin.queries.ts` — typed client wrappers
- `apps/admin-web/src/lib/admin.ts` — console gate
- `apps/admin-web/src/components/admin/impersonation-banner.tsx`
- `apps/admin-web/src/routes/_protected/users.tsx`
- `apps/admin-web/src/routes/_protected/users.$userId.tsx`

## Tests

```bash
pnpm --filter admin-web-app exec vitest run src/lib/admin.test.ts
```
