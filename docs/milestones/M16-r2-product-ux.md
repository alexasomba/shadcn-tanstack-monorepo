# M16 — R2 product UX

**Status:** DONE  
**Depends on:** M8, R2 APIs (Phase 0), M14 entitlements  
**Parent:** [PROJECT.md](../../PROJECT.md)

## Goals

Product surfaces for Cloudflare R2 media:

| Surface           | Who            | Plan                    |
| ----------------- | -------------- | ----------------------- |
| User avatar       | Signed-in user | **All plans**           |
| Organization logo | Owner/admin    | **Pro+** (`r2` feature) |

## Flow

1. Client picks image → base64 data URL (size-capped)
2. `createServerFn` validates type/size, `R2_BUCKET.put(key, bytes)`
3. Profile updated:
   - Avatar → Better Auth `updateUser({ image })`
   - Logo → `organization.update({ logo })`
4. Public path `/api/media/{key}` streams the object from R2

## Keys

- `avatars/{userId}/{uuid}.ext`
- `orgs/{orgId}/logo-{uuid}.ext`

Only these prefixes are served (`isAllowedMediaKey`).

## Files

| Path                                                                        | Role                     |
| --------------------------------------------------------------------------- | ------------------------ |
| `apps/user-web/src/lib/media.ts`                                            | Keys, limits, validation |
| `apps/user-web/src/lib/media.functions.ts`                                  | Upload server fns        |
| `apps/user-web/src/routes/api.media.$.ts`                                   | GET stream               |
| `apps/user-web/src/components/media/image-upload-field.tsx`                 | Shared picker UI         |
| `apps/user-web/src/routes/_protected/account.tsx`                           | Avatar                   |
| `apps/user-web/src/components/organization/organization-settings-panel.tsx` | Logo + UpgradeGate       |

## Developer API (unchanged)

data-service `/r2/*` still requires API key + `requireFeature("r2")` for programmatic access.

## Tests

```bash
pnpm --filter user-web-app exec vitest run src/lib/media.test.ts
```

## Local

user-web wrangler binds `R2_BUCKET` (`app-bucket`). Without credentials, Miniflare R2 still accepts `put`/`get` for local UX.
