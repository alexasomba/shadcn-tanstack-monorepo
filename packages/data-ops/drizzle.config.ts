import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ["../../apps/user-web/.env.local", "../../apps/user-web/.env", ".env"] });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
