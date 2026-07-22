import path from "path";

import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "cloudflare:workers",
        replacement: path.resolve(__dirname, "src/mocks/cloudflare-workers.ts"),
      },
      { find: /^drizzle-orm$/, replacement: path.resolve(__dirname, "src/mocks/drizzle-orm.ts") },
      { find: "drizzle-orm/pg-core", replacement: path.resolve(__dirname, "src/mocks/pg-core.ts") },
      {
        find: "drizzle-orm/mysql-core",
        replacement: path.resolve(__dirname, "src/mocks/mysql-core.ts"),
      },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
    server: {
      deps: {
        inline: ["drizzle-seed", "drizzle-orm"],
      },
    },
  },
});
