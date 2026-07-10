import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/api/ai/transcription")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;
        const audioBase64 = formData.get("audioBase64") as string | null;

        if (!audioFile && !audioBase64) {
          return new Response(
            JSON.stringify({
              error: "Audio file or base64 data is required",
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
                error: "Cloudflare AI binding is not configured. Transcription is not available offline.",
              }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          let audioBuffer: ArrayBuffer;
          if (audioFile) {
            audioBuffer = await audioFile.arrayBuffer();
          } else if (audioBase64) {
            // @ts-expect-error - Node/Bun/Browser environment compatibility
            audioBuffer = typeof Buffer !== "undefined"
              ? Buffer.from(audioBase64, "base64")
              : Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0)).buffer;
          } else {
            throw new Error("No audio data provided");
          }

          const result = await binding.run("@cf/openai/whisper", {
            audio: [...new Uint8Array(audioBuffer)],
          });

          return new Response(
            JSON.stringify({
              text: result.text,
              model: "@cf/openai/whisper",
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
