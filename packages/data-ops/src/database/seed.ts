import { sql } from "drizzle-orm";

import { user, organization } from "../drizzle/schema/auth";
import { todos, domains } from "../drizzle/schema/core";
import {
  crmContacts,
  crmCompanies,
  crmDeals,
  crmNotes,
  crmTickets,
  crmTasks,
} from "../drizzle/schema/crm";
import { parties, customers, orders } from "../drizzle/schema/ecommerce";
import type { SQLiteDb } from "./setup";

interface DBCheckInterface {
  get: (query: unknown) => Promise<unknown>;
  run: (
    query: unknown,
  ) => Promise<{ results?: Array<unknown>; rows?: Array<unknown> } & Record<string, unknown>>;
  select: (fields: unknown) => {
    from: (table: unknown) => {
      limit: (limit: number) => Promise<unknown>;
    };
  };
}

/**
 * Seeds the database with mock data utilizing drizzle-seed.
 * - Verifies that the 'user' table exists to ensure migrations are applied.
 * - Resets/truncates data from all seeded tables to guarantee idempotency.
 * - Seeds exact counts for all requested tables.
 *
 * @param db - The SQLite Drizzle database instance
 */
export async function seedDatabase(db: SQLiteDb): Promise<void> {
  // 1. Verify schema: check if the 'user' table exists in SQLite.
  const checkQuery = sql`SELECT name FROM sqlite_master WHERE type='table' AND name='user'`;
  let tableCheck: unknown;
  const dbCheck = db as unknown as DBCheckInterface;

  try {
    // For standard Drizzle SQLite/D1, db.get() fetches the first row.
    tableCheck = await dbCheck.get(checkQuery);
  } catch {
    try {
      const result = await dbCheck.run(checkQuery);
      tableCheck =
        result.results?.[0] || result.rows?.[0] || (result as unknown as Array<unknown>)[0];
    } catch {
      try {
        await dbCheck.select({ id: user.id }).from(user).limit(1);
        tableCheck = { name: "user" };
      } catch {
        throw new Error("Migrations not applied");
      }
    }
  }

  if (!tableCheck) {
    throw new Error("Migrations not applied");
  }

  // Break the circular dependency in the schema graph before seeding.
  // We remove the primaryContactId foreign key referencing crm_contacts.
  // The contactId in crm_contacts referencing crm_companies remains, breaking the cycle.
  const compKeys = (crmCompanies as unknown as Record<string | symbol, unknown>)[
    Symbol.for("drizzle:SQLiteInlineForeignKeys")
  ] as Array<{ reference: () => { foreignTable: Record<string | symbol, unknown> } }> | undefined;
  if (compKeys) {
    (crmCompanies as unknown as Record<string | symbol, unknown>)[
      Symbol.for("drizzle:SQLiteInlineForeignKeys")
    ] = compKeys.filter(
      (key: { reference: () => { foreignTable: Record<string | symbol, unknown> } }) => {
        const ref = key.reference();
        return ref.foreignTable[Symbol.for("drizzle:Name")] !== "crm_contacts";
      },
    );
  }

  // Dynamically import drizzle-seed to prevent top-level import crashes
  // due to export mismatch in pg-core/mysql-core in drizzle-orm@1.0.0-rc
  const { seed } = await import("drizzle-seed");

  // 2. Truncate/delete existing records from the tables to ensure idempotency.
  // We execute these manually to bypass topological sort recursion hangs.
  await db.delete(crmTasks).where(sql`1=1`);
  await db.delete(crmNotes).where(sql`1=1`);
  await db.delete(crmDeals).where(sql`1=1`);
  await db.delete(crmTickets).where(sql`1=1`);
  await db.delete(crmContacts).where(sql`1=1`);
  await db.delete(crmCompanies).where(sql`1=1`);
  await db.delete(orders).where(sql`1=1`);
  await db.delete(customers).where(sql`1=1`);
  await db.delete(parties).where(sql`1=1`);
  await db.delete(domains).where(sql`1=1`);
  await db.delete(todos).where(sql`1=1`);
  await db.delete(organization).where(sql`1=1`);
  await db.delete(user).where(sql`1=1`);

  // 3. Seed requested tables with exact counts.
  await seed(
    db,
    {
      user,
      organization,
      todos,
      domains,
      parties,
      customers,
      orders,
      crmContacts,
      crmCompanies,
      crmDeals,
      crmNotes,
      crmTickets,
      crmTasks,
    },
    { seed: 42 },
  ).refine((funcs) => ({
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
    domains: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        hostname: funcs.string({ isUnique: true }),
      },
    },
    parties: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        email: funcs.email(),
      },
    },
    customers: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        email: funcs.email(),
        abandonedCartCount: funcs.int({ minValue: 0, maxValue: 10 }),
        walletBalance: funcs.int({ minValue: 0, maxValue: 100000 }),
      },
    },
    orders: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        total: funcs.int({ minValue: 1000, maxValue: 500000 }),
      },
    },
    crmContacts: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        firstName: funcs.firstName(),
        lastName: funcs.lastName(),
        email: funcs.email(),
      },
    },
    crmCompanies: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        name: funcs.companyName(),
        email: funcs.email(),
        primaryContactId: funcs.valuesFromArray({ values: [undefined] }),
      },
    },
    crmDeals: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        title: funcs.loremIpsum({ sentencesCount: 1 }),
        value: funcs.int({ minValue: 1000, maxValue: 500000 }),
      },
    },
    crmNotes: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        body: funcs.loremIpsum({ sentencesCount: 2 }),
      },
    },
    crmTickets: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        subject: funcs.loremIpsum({ sentencesCount: 1 }),
      },
    },
    crmTasks: {
      count: 1,
      columns: {
        id: funcs.string({ isUnique: true }),
        title: funcs.loremIpsum({ sentencesCount: 1 }),
        relatedObjectKey: funcs.valuesFromArray({
          values: ["deal", "contact", "company", "ticket"],
        }),
        relatedRecordId: funcs.string(),
      },
    },
  }));
}
