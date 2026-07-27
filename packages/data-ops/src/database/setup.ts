import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import * as authSchema from "../drizzle/schema/auth";
import * as schema from "../drizzle/schema/core";
import * as crmSchema from "../drizzle/schema/crm";
import * as ecommerceSchema from "../drizzle/schema/ecommerce";
import { relations } from "../drizzle/schema/relations";

const { authRelations, ...authTables } = authSchema;

const fullSchema = {
  ...schema,
  ...authTables,
  ...ecommerceSchema,
  ...crmSchema,
  relations,
  authRelations,
};

const relationsMerged = { ...relations, ...authRelations };

export type DrizzleDb = DrizzleD1Database<typeof fullSchema, typeof relationsMerged>;
export type Database = DrizzleDb;
export type SQLiteDb = BaseSQLiteDatabase<
  "async" | "sync",
  unknown,
  typeof fullSchema,
  typeof relationsMerged
>;

const dbCache = new WeakMap<object, DrizzleDb>();

/**
 * Create a Drizzle client for a Cloudflare D1 binding.
 * Instances are cached per D1Database object (WeakMap) so repeated calls
 * in the same Worker isolate reuse the same client.
 */
export function createDatabase(d1: D1Database): DrizzleDb {
  const d1Obj = d1 as unknown;
  if (!d1Obj || typeof d1Obj !== "object") {
    return drizzle(d1, {
      schema: fullSchema,
      relations: { ...relations, ...authRelations },
    });
  }

  let db = dbCache.get(d1);
  if (!db) {
    db = drizzle(d1, {
      schema: fullSchema,
      relations: { ...relations, ...authRelations },
    });
    dbCache.set(d1, db);
  }
  return db;
}

function isUnsupportedD1TransactionError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message)
      : "";

  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? (error as { cause?: unknown }).cause
      : undefined;
  const causeMessage =
    cause && typeof cause === "object" && "message" in cause
      ? String((cause as { message?: unknown }).message)
      : "";

  return (
    message.includes("To execute a transaction, please use the state.storage.transaction()") ||
    causeMessage.includes("To execute a transaction, please use the state.storage.transaction()") ||
    message.includes("Transaction function cannot return a promise")
  );
}

/**
 * Run work in a Drizzle transaction when D1 supports it.
 * Falls back to non-transactional execution in environments that reject D1 txs.
 */
export async function runInTransaction<
  TReturn,
  TDatabase extends DrizzleDb | SQLiteDb = DrizzleDb | SQLiteDb,
>(db: TDatabase, fn: (tx: TDatabase) => Promise<TReturn>): Promise<TReturn> {
  if (typeof db.transaction === "function") {
    try {
      return await (
        db.transaction as unknown as (tx: (tx: TDatabase) => Promise<TReturn>) => Promise<TReturn>
      )(fn);
    } catch (error) {
      if (isUnsupportedD1TransactionError(error)) {
        return fn(db);
      }
      throw error;
    }
  }

  return fn(db);
}

/** @deprecated Prefer createDatabase — alias kept for starter demos */
export const getDB = createDatabase;
export const getDb = createDatabase;
