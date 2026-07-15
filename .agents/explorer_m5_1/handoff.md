# Handoff Report — Database Seeding with drizzle-seed

This report provides the analysis, design, and next steps for implementing the database seeding utility in `packages/data-ops` under Milestone 5 (R4).

---

## 1. Observation

- **Dependency Availability**:
  - `packages/data-ops/package.json` on line 115 specifies:
    ```json
    "drizzle-seed": "^0.3.1"
    ```
- **API Typings (`node_modules/.pnpm/node_modules/drizzle-seed/index.d.ts`)**:
  - `seed(...)` (lines 281-287):
    ```typescript
    export declare function seed<
      DB extends
        | PgDatabase<any, any>
        | MySqlDatabase<any, any, any, any>
        | BaseSQLiteDatabase<any, any>,
      SCHEMA extends {
        [key: string]:
          | PgTable
          | PgSchema
          | MySqlTable
          | MySqlSchema
          | SQLiteTable
          | Relations
          | any;
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
  - `reset(...)` (lines 328-330):
    ```typescript
    export declare function reset<
      DB extends
        | PgDatabase<any, any>
        | MySqlDatabase<any, any, any, any>
        | BaseSQLiteDatabase<any, any>,
      SCHEMA extends {
        [key: string]: PgTable | PgSchema | MySqlTable | MySqlSchema | SQLiteTable | any;
      },
    >(db: DB, schema: SCHEMA): Promise<void>;
    ```
- **Drizzle Table Exports**:
  - `packages/data-ops/src/drizzle/schema/auth.ts`: Exports `user` (line 4) and `organization` (line 102) tables.
  - `packages/data-ops/src/drizzle/schema/core.ts`: Exports `todos` (line 8) table.

---

## 2. Logic Chain

- **Step 1**: Since `drizzle-seed` is declared as a dependency, we can import `seed` and `reset` into `packages/data-ops/src/database/seed.ts`.
- **Step 2**: The `reset` function temporarily disables SQLite foreign keys (`PRAGMA foreign_keys = OFF`), truncates the specified tables, and then re-enables them. This enables safe, idempotent cleanup of the target tables before seeding.
- **Step 3**: The database parameter `db: any` passed to `seedDatabase` can be checked for existence of critical tables like `user` by querying the SQLite system table `sqlite_master`.
- **Step 4**: By defining a custom `seedDatabase(db: any)` function and calling `seed(db, { user, organization, todos }, { seed: 42 }).refine(...)`, we configure exact counts (2 users, 1 organization, 1 todo) and deterministic values using generators.
- **Step 5**: Exposing `seedDatabase` from `packages/data-ops/src/index.ts` and updating `package.json` exports enables downstream packages to run the seed script directly.

---

## 3. Caveats

- **Orphaned Row Cascading**: Since `reset(...)` runs with `PRAGMA foreign_keys = OFF`, cascading deletes on tables referencing `user` or `organization` (like `member`, `session`) do not fire during truncation. This could leave orphaned child rows. If this causes unique constraint or runtime errors, the referencing child tables must also be truncated.
- **Read-Only Scope**: The changes have not been written to the actual project files. Proposed changes are written to `.agents/explorer_m5_1/proposed_seed.ts` and `.agents/explorer_m5_1/exports.patch` respectively.

---

## 4. Conclusion

The seeding script can be safely implemented using the design specified in `proposed_seed.ts`, and exported from the package as specified in `exports.patch`.

---

## 5. Verification Method

1. **Apply Changes**: Copy `proposed_seed.ts` to `packages/data-ops/src/database/seed.ts` and apply `exports.patch`.
2. **Build package**: Run `vp run --filter data-ops build` to verify typescript compilation.
3. **Execute test/run**: Invoke `seedDatabase(db)` against a local test database and verify that `user`, `organization`, and `todos` are truncated and exactly 2 users, 1 organization, and 1 todo are inserted.
