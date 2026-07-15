// Re-export everything from the real drizzle-orm entry point using relative path
export * from "../../../../packages/data-ops/node_modules/drizzle-orm/index.js";

// Import and export the missing relational helpers that drizzle-seed expects
// but were removed from the root exports in drizzle-orm@1.0.0-rc
// @ts-ignore: Internal drizzle-orm relations path missing typings in mock
export {
  extractTablesRelationalConfig,
  createTableRelationsHelpers,
} from "../../../../packages/data-ops/node_modules/drizzle-orm/_relations.js";
