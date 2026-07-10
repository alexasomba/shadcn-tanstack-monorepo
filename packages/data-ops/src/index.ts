import { drizzle } from "drizzle-orm/d1";

import * as authSchema from "./auth-schema";
import * as schema from "./schema";

export * from "./schema";
export * from "./auth-schema";
export * from "drizzle-orm";

declare global {
  interface D1Database {
    prepare: (query: string) => unknown;
    dump: () => Promise<ArrayBuffer>;
    batch: (statements: Array<unknown>) => Promise<Array<unknown>>;
    exec: (query: string) => Promise<unknown>;
  }
}

export const getDB = (d1: D1Database) => {
  return drizzle(d1, { schema: { ...schema, ...authSchema } });
};

export type DB = ReturnType<typeof getDB>;
