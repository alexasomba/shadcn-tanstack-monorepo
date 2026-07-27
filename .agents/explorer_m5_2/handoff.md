# Handoff Report - Milestone 5 (R4) - Database Seeding and Verification Design

## 1. Observation

- **Programmatic Seeding Library**: Located inside `packages/data-ops/node_modules/drizzle-seed/index.d.ts` (lines 281-287):
  ```typescript
  export declare function seed<
    DB extends
      PgDatabase<any, any> | MySqlDatabase<any, any, any, any> | BaseSQLiteDatabase<any, any>,
    SCHEMA extends {
      [key: string]: PgTable | PgSchema | MySqlTable | MySqlSchema | SQLiteTable | Relations | any;
    },
    VERSION extends "2" | "1" | undefined,
  >(
    db: DB,
    schema: SCHEMA,
    options?: {
      count?: number;
      seed?: number;
      version?: VERSION;
    },
  ): SeedPromise<DB, SCHEMA, VERSION>;
  ```
- **Monorepo Error Schema & Result Wrapper**: Observed in `apps/data-service/src/endpoints/todos/schemas.ts` (lines 24-32):
  ```typescript
  export const ErrorSchema = z
    .object({
      success: z.literal(false),
      error: z.object({
        code: z.string(),
        message: z.string(),
      }),
    })
    .openapi("Error");
  ```
- **Existing Route Mounting Pattern**: Observed in `apps/data-service/src/index.ts` (lines 126-131):
  ```typescript
  app.openapi(healthRoute, healthHandler);
  app.route("/todos", todosApp);
  app.route("/notifications", notificationsApp);
  app.route("/domains", domainsApp);
  app.route("/r2", r2App);
  app.route("/workflows", workflowsApp);
  ```
- **Consistent Drizzle SQLite Count Helper**: Observed in `packages/data-ops/src/queries/referrals.ts` (line 92):
  ```typescript
  .select({ count: sql<number>`count(*)`.mapWith(Number) })
  ```

---

## 2. Logic Chain

1. Based on the observation of `drizzle-seed`'s programmatic API, calling `seed(db, schema)` is sufficient to seed all tables defined in `schema`.
2. Because `data-ops` exports all core, CRM, auth, and ecommerce tables, we can query `val instanceof Table` from `data-ops` exports to dynamically construct the schema object without manually listing tables.
3. If D1 migrations are not applied, SQLite/D1 operations throw errors with messages indicating `no such table`, `SQLITE_ERROR`, or `D1_ERROR`.
4. Therefore, catching these errors in the `/database/seed` and `/database/seed/verify` routes and responding with HTTP status code `500` and error code `MIGRATIONS_NOT_APPLIED` meets the requirements.
5. In line with the router mounting pattern in `index.ts`, creating `databaseApp = new OpenAPIHono()` and mounting it under `app.route("/database", databaseApp)` integrates these routes cleanly under the `/database` prefix.

---

## 3. Caveats

- Seeding everything via the auto-generated `drizzle-seed` utility generates randomized mock data. If specific seed values or credentials are required for E2E tests, custom refinements (using `.refine(...)` or manual inserts) would need to be added.
- The `no such table` check depends on parsing error messages. This works consistently in local SQLite/Miniflare D1 environments but should be verified in production Cloudflare D1 environment logs.

---

## 4. Conclusion

We have completed the design for R4 database seeding and verification.
The designed files are written in the agent workspace as reference replacement files:

- `proposed_schemas.ts` -> designed schemas for seed & verify endpoints.
- `proposed_seed.ts` -> designed route and handler for `POST /database/seed`.
- `proposed_verify.ts` -> designed route and handler for `GET /database/seed/verify`.
- `proposed_router.ts` -> designed router compilation.

We also designed the diffs to mount `/database` router in `apps/data-service/src/index.ts`.

---

## 5. Verification Method

After implementation, verify using:

1. **Local Build Check**:
   ```bash
   vp check
   ```
2. **Local Integration test**:
   - Run the data-service development server.
   - Run a HTTP request to `POST /database/seed` when no migrations are applied: confirm it yields a `500` status with `"Migrations not applied"`.
   - Apply migrations: `vp run db:migrate:local`.
   - Run `POST /database/seed` again: confirm it yields a `200` status with `{ success: true }`.
   - Run `GET /database/seed/verify`: confirm it yields a `200` status with counts corresponding to populated tables.
