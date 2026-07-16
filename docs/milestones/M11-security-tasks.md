# M11 — Security settings (2FA + passkeys)

**Priority:** P0  
**Status:** DONE (2026-07-16)  
**Depends on:** M8  
**Parent roadmap:** [PROJECT.md](../../PROJECT.md)

## Delivered

| Area           | Implementation                                                            |
| -------------- | ------------------------------------------------------------------------- |
| Server 2FA     | Issuer, 30d trust device, OTP send hook                                   |
| Server passkey | `rpName` + `rpID` from env URL                                            |
| Client         | `twoFactorClient({ twoFactorPage: "/two-factor" })`                       |
| Settings       | `/settings/security` — enable TOTP (QR), email OTP, backup codes, disable |
| Passkeys       | Register / list / remove                                                  |
| Challenge      | `/two-factor` — TOTP, email OTP, backup code + trust device               |
| Login          | Stashes redirect; handles `twoFactorRedirect`                             |

## Key files

- `packages/data-ops/src/auth/plugins.ts`
- `apps/user-web/src/lib/security.queries.ts`
- `apps/user-web/src/components/security/security-settings-panel.tsx`
- `apps/user-web/src/routes/two-factor.tsx`
- `apps/user-web/src/routes/_protected/settings.security.tsx`
- `apps/user-web/src/routes/login.tsx`

## Manual smoke

1. Account with password → Security → Enable authenticator → scan QR → verify code.
2. Sign out → sign in → land on `/two-factor` → enter TOTP (optionally trust device).
3. Regenerate backup codes; sign in with a backup code.
4. Add passkey; confirm it lists; remove it.
