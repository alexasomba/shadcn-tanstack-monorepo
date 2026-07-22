import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import agents from "agents/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 8303,
    strictPort: true,
  },
  plugins: [
    agents(),
    react(),
    cloudflare({
      persistState: {
        // Agents may share local platform state with user-web when needed.
        path: "../user-web/.wrangler/state",
      },
    }),
    tailwindcss(),
  ],
});
