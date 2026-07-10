import { createFileRoute } from "@tanstack/react-router";

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
          let binding: any = undefined;
          try {
            // @ts-expect-error - vinxi/http is a platform-specific import that does not have type declarations in this package
            const { getEvent } = await import("vinxi/http");
            const event = getEvent();
            binding = event?.context?.cloudflare?.env?.AI;
          } catch {
            // Fallback
          }

          if (!binding) {
            binding =
              (process.env as Record<string, unknown>).AI ||
              (globalThis as Record<string, unknown>).AI;
          }

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
