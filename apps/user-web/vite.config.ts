import { cloudflare } from "@cloudflare/vite-plugin";
import contentCollections from "@content-collections/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";

/**
 * `lazyPlugins` skips plugin factories during vp check/lint/fmt metadata loads.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    host: "127.0.0.1",
    port: 8300,
    strictPort: true,
  },
  plugins: lazyPlugins(() => [
    devtools(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["url", "baseLocale"],
    }),
    // user-web owns local Miniflare/D1; data-service is auxiliary for service bindings.
    !process.env.VITEST &&
      cloudflare({
        inspectorPort: false,
        persistState: {
          path: ".wrangler/state",
        },
        remoteBindings: false,
        auxiliaryWorkers: [{ configPath: "../data-service/wrangler.jsonc" }],
        viteEnvironment: { name: "ssr" },
      }),
    contentCollections(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ]),
  build: {
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      external: ["vinxi/http"],
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](?:react|react-dom|scheduler)/,
              priority: 30,
            },
            {
              name: "vendor",
              test: /node_modules/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
});
