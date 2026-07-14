import { createFileRoute } from "@tanstack/react-router";

import { getAiBinding } from "#/lib/cloudflare-env";

export const Route = createFileRoute("/demo/api/ai/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const { prompt } = body;

        if (!prompt || prompt.trim().length === 0) {
          return new Response(
            JSON.stringify({
              error: "Prompt is required",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        try {
          const binding = getAiBinding();

          if (!binding) {
            return new Response(
              JSON.stringify({
                error: "Cloudflare AI binding is not configured. Image generation is not available offline with Ollama.",
              }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Generate image bytes from Cloudflare Workers AI
          const response = await binding.run("@cf/lykon/dreamshaper-8-lcm", { prompt });

          const buffer = await response.arrayBuffer();
          const base64 = typeof Buffer !== "undefined"
            ? Buffer.from(buffer).toString("base64")
            : btoa(String.fromCharCode(...new Uint8Array(buffer)));
          const imageUrl = `data:image/jpeg;base64,${base64}`;

          return new Response(
            JSON.stringify({
              images: [imageUrl],
              model: "@cf/lykon/dreamshaper-8-lcm",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              error: error.message || "An error occurred",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
