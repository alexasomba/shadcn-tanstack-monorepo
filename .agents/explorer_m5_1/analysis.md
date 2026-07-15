# Analysis — Database Seeding with drizzle-seed in packages/data-ops

This document details the analysis and design for implementing the database seeding script utilizing `drizzle-seed` in `packages/data-ops` to satisfy Milestone 5 (R4).

---

## 1. Analysis of `drizzle-seed` API & SQLite Interaction

The `@drizzle/seed` (imported as `drizzle-seed`) package provides high-level utilities for seeding relational databases by analyzing the Drizzle ORM schema definitions.

### Core APIs

1. **`seed(db, schema, options)`**:
   - Analyzes the schema and automatically generates mock data matching column data types, nullability, unique constraints, and foreign key relationships.
   - **Options**:
     - `count` (number): Default rows to generate per table.
     - `seed` (number): A seed value to ensure deterministic generation. If the seed value and schema are unchanged, the generated output remains identical across runtimes.
     - `version` ('1' | '2'): API version, with `'2'` being the default and representing the latest generators func version.
   - **`.refine(callback)`**:
     - Allows customization of row count and column generators on a per-table basis.
     - Automatically passes a list of predefined generator functions (`funcs`): e.g. `fullName()`, `email()`, `companyName()`, `string({ isUnique: true })`, `loremIpsum()`, etc.

2. **`reset(db, schema)`**:
   - Performs a complete data reset/truncation of the tables specified in the `schema` object.
   - For SQLite, it executes:
     ```sql
     PRAGMA foreign_keys = OFF;
     DELETE FROM tableName1;
     DELETE FROM tableName2;
     ...
     PRAGMA foreign_keys = ON;
     ```
   - Temporarily disabling foreign key checks prevents dependency-ordering errors during deletion, making the operation idempotent and safe.

### SQLite Dialect Constraints & Foreign Keys

SQLite enforces foreign key checks at runtime if configured. During deletion, foreign keys can prevent deletion of parent records. The `drizzle-seed` `reset` function handles this natively by turning off `foreign_keys` during truncation.
Since `user` and `organization` tables in `packages/data-ops/src/drizzle/schema/auth.ts` are referenced by other tables (like `member`, `session`, etc.), a subset reset will leave orphaned child records unless those child tables are also truncated or cascaded. However, because foreign key checks are re-enabled afterwards, we must ensure child relations are either deleted or cascade correctly. In our schema:

- `session.userId` references `user.id` with `onDelete: "cascade"`.
- `member.organizationId` and `member.userId` reference parent tables with `onDelete: "cascade"`.
- `domains.organizationId` references `organization.id` with `onDelete: "cascade"`.

---

## 2. Design of `seedDatabase(db: any)` Utility

The utility function is designed to be placed at `packages/data-ops/src/database/seed.ts`.

### Logic Steps:

1. **Schema Check**: To avoid attempting to seed an unmigrated database, it checks for the existence of the critical `user` table in SQLite by querying `sqlite_master`.
2. **Idempotency**: It truncates/deletes records in `user`, `organization`, and `todos` using the `reset` utility.
3. **Deterministic Seeding**: It generates exactly:
   - **2 users** (with realistic full names and emails).
   - **1 organization** (with a realistic company name and unique slug).
   - **1 todo** (with a single-sentence title).

### Implementation Draft (`packages/data-ops/src/database/seed.ts`):

```typescript
import { sql } from "drizzle-orm";
import { reset, seed } from "drizzle-seed";
import { user, organization } from "../drizzle/schema/auth";
import { todos } from "../drizzle/schema/core";

/**
 * Seeds the database with mock data utilizing drizzle-seed.
 * - Verifies that the 'user' table exists to ensure migrations are applied.
 * - Resets/truncates data from 'user', 'organization', and 'todos' to guarantee idempotency.
 * - Seeds exactly 2 users, 1 organization, and 1 todo.
 *
 * @param db - The SQLite Drizzle database instance
 */
export async function seedDatabase(db: any): Promise<void> {
  if (!db) {
    throw new Error("A valid database instance must be provided to seedDatabase.");
  }

  // 1. Verify schema: check if the 'user' table exists in SQLite.
  const checkQuery = sql`SELECT name FROM sqlite_master WHERE type='table' AND name='user'`;
  let tableCheck: any;
  try {
    tableCheck = await db.get(checkQuery);
  } catch (error) {
    try {
      const result = await db.run(checkQuery);
      tableCheck = result?.results?.[0] || result?.rows?.[0] || result?.[0];
    } catch (innerError) {
      try {
        await db.select({ id: user.id }).from(user).limit(1);
        tableCheck = { name: "user" };
      } catch (selectError) {
        throw new Error(
          `Failed to verify table existence: ${(selectError as Error).message}. Ensure migrations are applied.`,
        );
      }
    }
  }

  if (!tableCheck) {
    throw new Error(
      "Critical table 'user' does not exist. Ensure migrations are applied before seeding.",
    );
  }

  // 2. Truncate/delete existing records to ensure idempotency.
  await reset(db, { user, organization, todos });

  // 3. Seed exactly 2 users, 1 organization, and 1 todo.
  await seed(db, { user, organization, todos }, { seed: 42 }).refine((funcs) => ({
    user: {
      count: 2,
      columns: {
        name: funcs.fullName(),
        email: funcs.email(),
      },
    },
    organization: {
      count: 1,
      columns: {
        name: funcs.companyName(),
        slug: funcs.string({ isUnique: true }),
      },
    },
    todos: {
      count: 1,
      columns: {
        title: funcs.loremIpsum({ sentencesCount: 1 }),
      },
    },
  }));
}
```

---

## 3. Proposed Package Exports

To allow other applications (like `user-web`, `admin-web`, `data-service`, or separate scripts) to run the seed routine, we expose it through the `packages/data-ops` entry points.

### Export 1: Entry Point `exports` in `packages/data-ops/package.json`

Add the `./database/seed` export path mapping to `package.json`:

```json
    "./database/seed": {
      "types": "./src/database/seed.ts",
      "import": "./src/database/seed.ts",
      "default": "./src/database/seed.ts"
    }
```

### Export 2: Export from main index in `packages/data-ops/src/index.ts`

Re-export the seed routine from the package root:

```typescript
export { seedDatabase } from "./database/seed";
```
