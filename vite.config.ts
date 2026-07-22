import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*.{js,ts,tsx,md,css,html,json,jsonc,yaml,yml}": "vp check --fix",
  },
  lint: {
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "@stylistic", specifier: "@stylistic/eslint-plugin" },
      { name: "sonarjs", specifier: "eslint-plugin-sonarjs" },
      { name: "no-instanceof", specifier: "eslint-plugin-no-instanceof" },
      { name: "@tanstack/router", specifier: "@tanstack/eslint-plugin-router" },
      { name: "@tanstack/query", specifier: "@tanstack/eslint-plugin-query" },
      { name: "drizzle", specifier: "eslint-plugin-drizzle" },
      { name: "zod", specifier: "eslint-plugin-zod" },
      { name: "zod-openapi", specifier: "eslint-plugin-zod-openapi" },
    ],
    plugins: ["oxc", "typescript", "unicorn", "react", "import", "eslint", "jsx-a11y", "vitest"],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "no-array-constructor": "error",
      "no-unused-expressions": "error",
      "no-unused-vars": "error",
      "typescript/ban-ts-comment": "error",
      "typescript/no-duplicate-enum-values": "error",
      "typescript/no-empty-object-type": "off",
      "typescript/no-explicit-any": "error",
      "typescript/no-redundant-type-constituents": "error",
      "typescript/no-misused-spread": "error",
      "typescript/no-extra-non-null-assertion": "error",
      "typescript/no-misused-new": "error",
      "typescript/no-namespace": "error",
      "typescript/no-non-null-asserted-optional-chain": "error",
      "typescript/no-require-imports": "error",
      "typescript/no-this-alias": "error",
      "typescript/no-unnecessary-type-constraint": "error",
      "typescript/no-unsafe-declaration-merging": "error",
      "typescript/no-unsafe-function-type": "error",
      "typescript/no-wrapper-object-types": "error",
      "typescript/prefer-as-const": "error",
      "typescript/prefer-namespace-keyword": "error",
      "typescript/triple-slash-reference": "error",
      "drizzle/enforce-delete-with-where": [
        "error",
        {
          drizzleObjectName: ["db", "tx", "drizzleDb"],
        },
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        {
          drizzleObjectName: ["db", "tx", "drizzleDb"],
        },
      ],
      "zod/prefer-enum-over-literal-union": "warn",
      "sonarjs/cognitive-complexity": ["error", 15],
      // "zod-openapi/require-meta": "off",
    },
    options: { typeAware: true, typeCheck: true },
    env: {
      builtin: true,
    },
    categories: {
      correctness: "error",
    },
    ignorePatterns: [
      "**/.nx/**",
      "**/.svelte-kit/**",
      "**/build/**",
      "**/coverage/**",
      "**/dist/**",
      "**/snap/**",
      "**/vite.config.*.timestamp-*.*",
      "eslint.config.js",
      "legacy/**",
      ".specify/**",
      ".agents/**",
      ".agent/**",
      ".github/**",
      // Cloudflare starter templates are reference copies, not monorepo product code.
      "templates/**",
      "**/routeTree.gen.ts",
      "**/worker-configuration.d.ts",
      "**/demo*",
      "**/demo*/**",
    ],
    overrides: [
      {
        files: ["**/*.{js,ts,tsx}"],
        rules: {
          "sonarjs/cognitive-complexity": ["warn", 15],
          "no-instanceof/no-instanceof": "error",
          "unicorn/no-array-reduce": "error",
          "for-direction": "error",
          "no-async-promise-executor": "error",
          "no-case-declarations": "error",
          "no-class-assign": "error",
          "no-compare-neg-zero": "error",
          "no-cond-assign": "error",
          "no-constant-binary-expression": "error",
          "no-constant-condition": "error",
          "no-control-regex": "error",
          "no-debugger": "error",
          "no-delete-var": "error",
          "no-dupe-else-if": "error",
          "no-duplicate-case": "error",
          "no-empty-character-class": "error",
          "no-empty-pattern": "error",
          "no-empty-static-block": "error",
          "no-ex-assign": "error",
          "no-extra-boolean-cast": "error",
          "no-fallthrough": "error",
          "no-global-assign": "error",
          "no-invalid-regexp": "error",
          "no-irregular-whitespace": "error",
          "no-loss-of-precision": "error",
          "no-misleading-character-class": "error",
          "no-nonoctal-decimal-escape": "error",
          "no-regex-spaces": "error",
          "no-self-assign": "error",
          "no-shadow": "warn",
          "no-shadow-restricted-names": "error",
          "no-sparse-arrays": "error",
          "no-unsafe-finally": "error",
          "no-unsafe-optional-chaining": "error",
          "no-unused-labels": "error",
          "no-unused-private-class-members": "error",
          "no-useless-backreference": "error",
          "no-useless-catch": "error",
          "no-useless-escape": "error",
          "no-var": "error",
          "no-with": "error",
          "prefer-const": "error",
          "require-yield": "error",
          "use-isnan": "error",
          "valid-typeof": "error",
          "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
          "import/first": "error",
          "import/newline-after-import": "error",
          "import/no-commonjs": "error",
          "import/no-duplicates": "error",
          "@stylistic/spaced-comment": "error",
          "typescript/array-type": [
            "error",
            {
              default: "generic",
              readonly: "generic",
            },
          ],
          "typescript/ban-ts-comment": [
            "error",
            {
              "ts-expect-error": false,
              "ts-ignore": "allow-with-description",
            },
          ],
          "typescript/consistent-type-imports": [
            "error",
            {
              prefer: "type-imports",
            },
          ],
          "typescript/method-signature-style": ["error", "property"],
          "typescript/no-duplicate-enum-values": "error",
          "typescript/no-extra-non-null-assertion": "error",
          "typescript/no-for-in-array": "error",
          "typescript/no-inferrable-types": [
            "error",
            {
              ignoreParameters: true,
            },
          ],
          "typescript/no-misused-new": "error",
          "typescript/no-namespace": "error",
          "typescript/no-non-null-asserted-optional-chain": "error",
          "typescript/no-unnecessary-condition": "error",
          "typescript/unbound-method": "off",
          "typescript/no-floating-promises": "error",
          "typescript/no-base-to-string": "warn",
          "typescript/no-unnecessary-type-assertion": "error",
          "typescript/no-unsafe-function-type": "error",
          "typescript/no-wrapper-object-types": "error",
          "typescript/prefer-as-const": "error",
          "typescript/prefer-for-of": "warn",
          "typescript/require-await": "warn",
          "typescript/triple-slash-reference": "error",
        },
        jsPlugins: [],
        env: {
          es2020: true,
          browser: false,
        },
      },
      // 1. Shared React & UI Layout Layer (Applies to Apps and the Shadcn UI Package)
      {
        files: [
          "apps/user-web/src/**/*.{js,ts,tsx}",
          "apps/admin-web/src/**/*.{js,ts,tsx}",
          "apps/agents/src/**/*.{js,ts,tsx}",
          "packages/ui/src/**/*.{js,ts,tsx}",
        ],
        rules: {
          "react/rules-of-hooks": "error",
          "react/exhaustive-deps": "error",
          "jsx-a11y/anchor-has-content": "off",
          "jsx-a11y/anchor-is-valid": "off",
          "jsx-a11y/control-has-associated-label": "off",
          "jsx-a11y/no-autofocus": "off",
          "jsx-a11y/prefer-tag-over-role": "off",
          "typescript/array-type": "off",
          "typescript/require-await": "off",
          "sonarjs/cognitive-complexity": "off",
        },
        env: {
          browser: true,
        },
      },
      {
        files: ["packages/ui/src/**/*.{js,ts,tsx}"],
        rules: {
          "no-shadow": "off",
          "jsx-a11y/label-has-associated-control": "off",
          "jsx-a11y/no-noninteractive-element-interactions": "off",
          "jsx-a11y/click-events-have-key-events": "off",
          "typescript/no-unnecessary-condition": "off",
          "typescript/restrict-template-expressions": "off",
          "import/newline-after-import": "off",
          "import/first": "off",
          "no-unused-vars": "off",
          "jsx-a11y/no-static-element-interactions": "off",
          "typescript/no-useless-default-assignment": "off",
          "react/no-children-prop": "warn",
          "unicorn/no-array-reduce": "off",
          "jsx-a11y/img-redundant-alt": "off",
          "import/no-duplicates": "warn",
          "import/consistent-type-specifier-style": "warn",
          "typescript/no-floating-promises": "off",
          // Large presentational demos (inline-edit / split-to-edit particles).
          "sonarjs/cognitive-complexity": "off",
        },
      },
      {
        files: ["apps/agents/src/**/*.{js,ts,tsx}"],
        rules: {
          "no-unused-expressions": "off",
        },
      },
      // 2. TanStack Ecosystem Layer (Strictly scoped to Frontend Applications)
      {
        files: ["apps/user-web/src/**/*.{js,ts,tsx}", "apps/admin-web/src/**/*.{js,ts,tsx}"],
        rules: {
          "@tanstack/router/create-route-property-order": "error",
          "@tanstack/router/route-param-names": "error",
          "@tanstack/query/exhaustive-deps": "error",
          "@tanstack/query/stable-query-client": "error",
          "@tanstack/query/no-unstable-deps": "error",
          "@tanstack/query/infinite-query-property-order": "error",
          "@tanstack/query/no-void-query-fn": "error",
          "@tanstack/query/mutation-property-order": "error",
        },
      },
      {
        files: ["apps/data-service/**/*.{js,mjs,cjs,ts,tsx}"],
        rules: {
          "typescript/no-floating-promises": "error",
          // "zod-openapi/require-meta": "error",
          // "zod-openapi/require-comment": "warn",
        },
        env: {
          browser: false,
          node: false,
          worker: true,
        },
      },
      {
        files: [
          "**/*.test.{js,mjs,cjs,ts,tsx}",
          "**/*.spec.{js,mjs,cjs,ts,tsx}",
          "**/tests/**/*.{js,mjs,cjs,ts,tsx}",
        ],
        rules: {
          "jsx-a11y/anchor-has-content": "off",
          "jsx-a11y/anchor-is-valid": "off",
          "jsx-a11y/control-has-associated-label": "off",
          "jsx-a11y/prefer-tag-over-role": "off",
          "typescript/no-unnecessary-type-assertion": "off",
          "typescript/require-await": "off",
          "vitest/expect-expect": "off",
          "vitest/no-conditional-expect": "off",
          "vitest/require-mock-type-parameters": "off",
          "vitest/require-to-throw-message": "off",
        },
        env: {
          node: true,
          vitest: true,
        },
      },
      {
        files: ["apps/e2e-tests/**/*.{js,mjs,cjs,ts,tsx}"],
        rules: {
          "typescript/no-explicit-any": "off",
          "no-instanceof/no-instanceof": "off",
          "typescript/no-redundant-type-constituents": "off",
          "typescript/no-unnecessary-condition": "off",
          "typescript/require-await": "off",
          "sonarjs/cognitive-complexity": "off",
        },
      },
    ],
  },
  fmt: {
    endOfLine: "lf",
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    useTabs: false,
    trailingComma: "all",
    printWidth: 100,
    bracketSpacing: true,
    arrowParens: "always",
    insertFinalNewline: true,
    sortImports: true,
    sortTailwindcss: {
      stylesheet: "packages/ui/src/styles/globals.css",
      functions: ["cn", "cva"],
    },
    sortPackageJson: true,
    ignorePatterns: [
      "dist/",
      "node_modules/",
      ".turbo/",
      ".output/",
      ".nitro/",
      ".tanstack/",
      ".vinxi/",
      "coverage/",
      "pnpm-lock.yaml",
      ".pnpm-store/",
      "routeTree.gen.ts",
      "**/worker-configuration.d.ts",
      "**/demo*",
      "**/demo*/**",
      "templates/**",
    ],
  },
  /**
   * Vite Task monorepo runner (`vp run` / `vpr`).
   * @see node_modules/vite-plus/docs/guide/run.md
   * @see node_modules/vite-plus/docs/guide/monorepo.md
   *
   * Rules:
   * - Task names live in either `run.tasks` OR package.json scripts, never both
   *   (root only defines tasks here; packages keep their own scripts).
   * - Nested `vp run` is inlined; root `build` → `-r build` self-ref is pruned.
   * - Workspace package order follows package.json dependency graph.
   */
  run: {
    // Cache package.json scripts as well as vite.config tasks (default: scripts off).
    cache: {
      scripts: true,
      tasks: true,
    },
    tasks: {
      // Build all apps + packages that define `build` (workspace dep order).
      // Note: `--filter` and `--recursive` cannot be combined (Vite Task CLI).
      // Packages without `build` (e.g. @workspace/ui) are skipped.
      // Usage: `vpr build` | `vp run build`
      build: {
        command: 'vp run --filter "./apps/*" --filter "./packages/*" --fail-if-no-match build',
      },

      // All app `dev` scripts concurrently (no dependsOn ordering).
      // Usage: `vpr dev` | `vp run dev`
      dev: {
        command: 'vp run --filter "./apps/*" --parallel --fail-if-no-match dev',
        cache: false,
      },

      // Cached wrappers for CI (`vp check` / `vp test` built-ins are not task-cached;
      // only `vp run` / `vpr` uses Vite Task cache). Prefer these in workflows.
      // Local agents can still call `vp check` / `vp test` directly.
      "ci:check": "vp check",
      "ci:test": "vp test",

      "deploy:dry-run": {
        command: 'vp run --filter "./apps/*" --fail-if-no-match deploy --dry-run --temporary',
      },

      // Per-app shortcuts (strict ports: user 8300, admin 8301, data-service 8302, agents 8303)
      "dev:user": {
        command: "vp run --filter user-web-app --fail-if-no-match dev",
        cache: false,
      },
      "dev:admin": {
        command: "vp run --filter admin-web-app --fail-if-no-match dev",
        cache: false,
      },
      "dev:data-service": {
        command: "vp run --filter data-service --fail-if-no-match dev",
        cache: false,
      },
      "dev:agents": {
        command: "vp run --filter agents --fail-if-no-match dev",
        cache: false,
      },

      "user-web:build": "vp run --filter user-web-app --fail-if-no-match build",
      "user-web:deploy": "vp run --filter user-web-app --fail-if-no-match deploy",
      "user-web:deploy:preview": "vp run --filter user-web-app --fail-if-no-match deploy:preview",

      "admin-web:build": "vp run --filter admin-web-app --fail-if-no-match build",
      "admin-web:deploy": "vp run --filter admin-web-app --fail-if-no-match deploy",
      "admin-web:deploy:preview": "vp run --filter admin-web-app --fail-if-no-match deploy:preview",

      "agents:build": "vp run --filter agents --fail-if-no-match build",
      "agents:deploy": "vp run --filter agents --fail-if-no-match deploy",
      "agents:deploy:preview": "vp run --filter agents --fail-if-no-match deploy:preview",

      "data-service:build": "vp run --filter data-service --fail-if-no-match build",
      "data-service:deploy": "vp run --filter data-service --fail-if-no-match deploy",
      "data-service:deploy:preview":
        "vp run --filter data-service --fail-if-no-match deploy:preview",

      // Better Auth CLI (Drizzle schema regenerate / diagnostics / secret)
      // After auth:generate → db:generate → db:migrate:local
      "auth:generate": {
        command: "vp run --filter data-ops --fail-if-no-match auth:generate",
        cache: false,
      },
      "auth:info": {
        command: "vp run --filter data-ops --fail-if-no-match auth:info",
        cache: false,
      },
      "auth:secret": {
        command: "vp run --filter data-ops --fail-if-no-match auth:secret",
        cache: false,
      },

      // data-ops D1 tooling (not cached — mutates DB / interactive)
      "db:generate": {
        command: "vp run --filter data-ops --fail-if-no-match db:generate",
        cache: false,
      },
      "db:migrate:local": {
        command: "vp run --filter data-ops --fail-if-no-match db:migrate:local",
        cache: false,
      },
      "db:migrate:remote": {
        command: "vp run --filter data-ops --fail-if-no-match db:migrate:remote",
        cache: false,
      },
      "db:studio": {
        command: "vp run --filter data-ops --fail-if-no-match db:studio",
        cache: false,
      },
    },
  },

  // Vitest at monorepo root (package apps keep their own vitest via package configs).
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.agent/**",
      "**/.agents/**",
      "**/cypress/**",
      "legacy/**",
      ".specify/**",
      ".agents/**",
      ".agent/**",
      ".github/**",
      "**/.epub/**",
      "**/.next/**",
      "**/templates/**",
    ],
    environment: "node",
    include: ["cli/**/*.test.ts"],
    // Root currently has no cli tests; apps run vitest via package scripts.
    passWithNoTests: true,
  },
});
