import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Config } from "drizzle-kit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Local D1 state is owned by apps/user-web. All other apps and tooling
 * persist/read through apps/user-web/.wrangler/state so there is a single
 * local SQLite file for the shared app-db database.
 */
function getLocalD1Path() {
  const wranglerPath = path.resolve(
    __dirname,
    "../../apps/user-web/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );

  if (fs.existsSync(wranglerPath)) {
    const files = fs.readdirSync(wranglerPath, { recursive: true }) as Array<string>;
    const sqliteFiles = files
      .filter((f) => f.endsWith(".sqlite") && !f.includes("metadata.sqlite"))
      .map((f) => {
        const fullPath = path.join(wranglerPath, f);
        return {
          path: fullPath,
          mtime: fs.statSync(fullPath).mtime.getTime(),
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (sqliteFiles.length > 0) {
      return sqliteFiles[0].path;
    }
  }
  return null;
}

const localDbPath = getLocalD1Path();

const config: Config = {
  out: "./src/drizzle/migrations",
  schema: [
    "./src/drizzle/schema/core.ts",
    "./src/drizzle/schema/relations.ts",
    "./src/drizzle/schema/auth.ts",
    "./src/drizzle/schema/ecommerce.ts",
    "./src/drizzle/schema/crm.ts",
  ],
  dialect: "sqlite",
  // Prefer the local miniflare SQLite file when present; otherwise d1-http.
  ...(localDbPath
    ? {
        dbCredentials: {
          url: localDbPath,
        },
      }
    : {
        driver: "d1-http",
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
          databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
          token: process.env.CLOUDFLARE_D1_TOKEN!,
        },
      }),
  tablesFilter: ["*"],
};

export default config;
