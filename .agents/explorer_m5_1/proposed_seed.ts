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
 * @param db - The SQLite Drizzle database instance (any, since D1/SQLite db formats vary slightly)
 */
export async function seedDatabase(db: any): Promise<void> {
  if (!db) {
    throw new Error("A valid database instance must be provided to seedDatabase.");
  }

  // 1. Verify schema: check if the 'user' table exists in SQLite.
  // We query sqlite_master to verify migration application status.
  const checkQuery = sql`SELECT name FROM sqlite_master WHERE type='table' AND name='user'`;
  let tableCheck: any;
  try {
    // For standard Drizzle SQLite/D1, db.get() fetches the first row.
    tableCheck = await db.get(checkQuery);
  } catch (error) {
    // Fallback if .get() is not supported (e.g. mock wrapper or testing adapter)
    try {
      const result = await db.run(checkQuery);
      tableCheck = result?.results?.[0] || result?.rows?.[0] || result?.[0];
    } catch (innerError) {
      // Final fallback: try raw select to verify table existence
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

  // 2. Truncate/delete existing records from user, organization, and todos to ensure idempotency.
  // Using reset from drizzle-seed disables foreign keys and deletes data from the specified tables.
  await reset(db, { user, organization, todos });

  // 3. Seed exactly 2 users, 1 organization, and 1 todo.
  // We refine the seed generation to ensure counts are exact and values are meaningful.
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
