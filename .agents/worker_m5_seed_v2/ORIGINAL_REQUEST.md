## 2026-07-15T11:10:05Z

Objective:
Implement database seeding configurations using drizzle-seed in `packages/data-ops` and register the `/database/seed` and `/database/seed/verify` endpoints in `apps/data-service` to satisfy Milestone 5 (R4).

Details of implementation:

1. Create `packages/data-ops/src/database/seed.ts` implementing `seedDatabase(db: any)`:
   - Query `sqlite_master` to verify if table `user` exists. If not, throw an error ("Migrations not applied").
   - Use `reset` from `drizzle-seed` to reset/truncate tables `user`, `organization`, and `todos`.
   - Use `seed(db, { user, organization, todos }, { seed: 42 }).refine(...)` to seed exactly:
     - 2 users (with `funcs.fullName()` and `funcs.email()`)
     - 1 organization (with `funcs.companyName()` and unique slug)
     - 1 todo (with single-sentence title)
2. Expose the seeding utility in `packages/data-ops`:
   - Add `"./database/seed"` to the `exports` block in `packages/data-ops/package.json`.
   - Re-export `seedDatabase` from `packages/data-ops/src/index.ts`.
3. Rebuild `packages/data-ops`: `pnpm --filter data-ops build`.
4. Create Hono route endpoints in `apps/data-service/src/endpoints/database/`:
   - `schemas.ts` defining OpenAPI schemas for seed and verify.
   - `seed.ts` implementing `POST /seed` (calling `seedDatabase(db)` and catching SQLite table errors to return 500 status with message "Migrations not applied").
   - `verify.ts` implementing `GET /seed/verify` (counting users, organizations, and todos using mapWith(Number) and returning them).
   - `router.ts` mounting these endpoints.
5. Register the database app subrouter under `/database` in `apps/data-service/src/index.ts`.
6. Implement `apps/data-service/src/seed.test.ts` to test these seeding endpoints.
7. Verify by running formatting, type checks, linting, and tests:
   - `vp check`
   - `vp test` (or `vp run --filter data-service test` / `vp test run apps/data-service/src/seed.test.ts`)
8. Write a detailed handoff report to `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m5_seed_v2/handoff.md`.
