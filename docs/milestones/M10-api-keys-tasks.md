# M10 — API keys product surface

**Priority:** P0  
**Status:** DONE (2026-07-16)  
**Depends on:** M8  
**Parent roadmap:** [PROJECT.md](../../PROJECT.md)

## Delivered

| Area          | Implementation                                  |
| ------------- | ----------------------------------------------- |
| Server plugin | Dual `apiKey` configs: `user` + `organization`  |
| Client plugin | `apiKeyClient()` on user-web / admin-web        |
| Create        | Name, expires, ownership; **secret shown once** |
| List          | BA `apiKey.list` with org/user filter           |
| Revoke        | BA `apiKey.delete`                              |
| Snippets      | Copy key + curl (`Bearer` / `x-api-key`)        |
| data-service  | Middleware distinguishes org vs user keys       |

## Server configs (`packages/data-ops/src/auth/plugins.ts`)

- **user**: prefix `sk_user_`, 1000 req/day, hashed keys, metadata on
- **organization**: prefix `sk_org_`, 5000 req/day, org-owned (`references: "organization"`)

## Key files

- `apps/user-web/src/lib/api-key.ts`
- `apps/user-web/src/lib/api-key.queries.ts`
- `apps/user-web/src/components/api-keys/api-keys-settings-panel.tsx`
- `apps/user-web/src/routes/_protected/settings.api-keys.tsx`
- `apps/data-service/src/middleware/api-key.ts`

## Manual smoke

1. Active org → Settings → API Keys → create org key → copy secret.
2. `curl -H "x-api-key: sk_org_…" http://127.0.0.1:8302/todos` (with data-service).
3. Revoke key → same request returns 401.
4. Create personal key when needed (user ownership).
