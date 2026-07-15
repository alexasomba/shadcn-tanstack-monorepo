import { defineConfig } from "vite-plus";

/**
 * Library package: `vp pack` (tsdown) → dist/.
 * @see node_modules/vite-plus/docs/guide/pack.md
 */
export default defineConfig({
  pack: {
    entry: [
      "src/index.ts",
      "src/drizzle/schema/schema.ts",
      "src/drizzle/schema/auth.ts",
      "src/database/setup.ts",
      "src/auth/create-auth.ts",
      "src/auth/plugins.ts",
      "src/auth/client-plugins.ts",
      "src/auth/roles.ts",
      "src/auth/auth.ts",
      "src/email/mailer.ts",
      "src/queries/todos.ts",
      "src/queries/referrals.ts",
      "src/queries/outbox.ts",
      "src/zod/schema/todos.ts",
      "src/zod/schema/domains.ts",
      "src/zod/schema/crm-platform.ts",
      "src/seo/discovery.ts",
    ],
    dts: true,
    format: ["esm"],
    outDir: "dist",
    // Keep peer runtime deps external (apps bundle them).
    deps: {
      neverBundle: [
        "better-auth",
        "better-auth/plugins/organization",
        "better-auth/client/plugins",
        "better-auth/tanstack-start",
        "@better-auth/drizzle-adapter",
        "@marinedotsh/better-auth-referral",
        "better-inbox",
        "better-inbox/client",
        "drizzle-orm",
        "drizzle-orm/d1",
        "drizzle-orm/sqlite-core",
        "zod",
        "better-result",
        "@workspace/result",
        "cloudflare:workers",
      ],
    },
  },
});
