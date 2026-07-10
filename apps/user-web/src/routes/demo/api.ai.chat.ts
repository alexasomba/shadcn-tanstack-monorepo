import { chat, maxIterations, toServerSentEventsResponse } from "@tanstack/ai";
import { createWorkersAiChat } from "@cloudflare/tanstack-ai";
import { ollamaText } from "@tanstack/ai-ollama";
import { createFileRoute } from "@tanstack/react-router";

import { getGuitars, recommendGuitarToolDef } from "#/lib/demo-guitar-tools";

const SYSTEM_PROMPT = `You are a helpful assistant for a store that sells guitars.

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THIS EXACT WORKFLOW:

When a user asks for a guitar recommendation:
1. FIRST: Use the getGuitars tool (no parameters needed)
2. SECOND: Use the recommendGuitar tool with the ID of the guitar you want to recommend
3. NEVER write a recommendation directly - ALWAYS use the recommendGuitar tool

IMPORTANT:
- The recommendGuitar tool will display the guitar in a special, appealing format
- You MUST use recommendGuitar for ANY guitar recommendation
- ONLY recommend guitars from our inventory (use getGuitars first)
- The recommendGuitar tool has a buy button - this is how customers purchase
- Do NOT describe the guitar yourself - let the recommendGuitar tool do it
`;

export const Route = createFileRoute("/demo/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Capture request signal before reading body (it may be aborted after body is consumed)
        const requestSignal = request.signal;

        // If request is already aborted, return early
        if (requestSignal.aborted) {
          return new Response(null, { status: 499 }); // 499 = Client Closed Request
        }

        const abortController = new AbortController();

        try {
          const body = await request.json();
          const { messages } = body;

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

          const adapter = binding
            ? createWorkersAiChat("@cf/meta/llama-3-8b-instruct", {
                binding: binding as Extract<
                  Parameters<typeof createWorkersAiChat>[1],
                  { binding: { gateway: unknown } }
                >["binding"],
              })
            : ollamaText("mistral:7b");

          const stream = chat({
            adapter,
            tools: [
              getGuitars, // Server tool
              recommendGuitarToolDef, // No server execute - client will handle
            ],
            systemPrompts: [SYSTEM_PROMPT],
            agentLoopStrategy: maxIterations(5),
            messages,
            abortController,
          });

          return toServerSentEventsResponse(stream, { abortController });
        } catch (error: any) {
          // If request was aborted, return early (don't send error response)
          if (error.name === "AbortError" || abortController.signal.aborted) {
            return new Response(null, { status: 499 }); // 499 = Client Closed Request
          }
          return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
