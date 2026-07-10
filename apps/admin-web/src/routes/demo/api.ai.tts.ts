import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/api/ai/tts")({
  server: {
    handlers: {
      POST: async () => {
        return new Response(
          JSON.stringify({
            error: "Text-to-Speech is not supported on the configured Cloudflare Workers AI / Ollama backend.",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
