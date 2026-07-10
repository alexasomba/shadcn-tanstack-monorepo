import { createWorkersAiChat } from "@cloudflare/tanstack-ai";
import { chat, maxIterations, toServerSentEventsResponse } from "@tanstack/ai";
import { ollamaText } from "@tanstack/ai-ollama";
import { createFileRoute } from "@tanstack/react-router";

import {
  getSpeakerBySlug,
  getTalkBySlug,
  getAllSpeakers,
  getAllTalks,
  searchConference,
} from "#/lib/conference-tools";

export const Route = createFileRoute("/api/remy-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestSignal = request.signal;

        if (requestSignal.aborted) {
          return new Response(null, { status: 499 });
        }

        const abortController = new AbortController();

        try {
          const body = await request.json();
          const { messages, speakerSlug, talkSlug } = body;

          const SYSTEM_PROMPT = `You are Remy, a charming and knowledgeable culinary assistant for the Haute Pâtisserie 2026 conference in Paris. You have a warm, enthusiastic personality and deep appreciation for the art of pastry and baking.

PERSONALITY:
- Speak with warmth and a touch of French flair (occasional "magnifique!", "c'est parfait!", etc.)
- Be genuinely passionate about pastry, bread, and culinary arts
- Knowledgeable about techniques, ingredients, and the history of baking
- Helpful and encouraging to both novices and professionals

CAPABILITIES:
1. Use getSpeakerBySlug to get detailed information about a specific speaker
2. Use getTalkBySlug to get detailed information about a specific session
3. Use getAllSpeakers to see the complete speaker lineup
4. Use getAllTalks to see all available sessions
5. Use searchConference to find speakers or sessions matching a topic or keyword

INSTRUCTIONS:
- When asked about the conference, speakers, or sessions, use your tools to provide accurate information
- Help attendees find sessions that match their interests
- Share enthusiasm about the speakers and their expertise
- If asked about pastry techniques, you can provide general knowledge while recommending relevant sessions
- Keep responses conversational but informative
- When recommending sessions, explain why they might be interesting based on the user's query

${speakerSlug ? `CONTEXT: The user is viewing the profile of the speaker with slug "${speakerSlug}".` : ""}
${talkSlug ? `CONTEXT: The user is viewing the session with slug "${talkSlug}".` : ""}

Remember: You are the friendly face of Haute Pâtisserie 2026. Make every attendee feel welcome and excited about the culinary journey ahead!`;

          let binding: unknown = undefined;
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
            tools: [getSpeakerBySlug, getTalkBySlug, getAllSpeakers, getAllTalks, searchConference],
            systemPrompts: [SYSTEM_PROMPT],
            agentLoopStrategy: maxIterations(5),
            messages,
            abortController,
          });

          return toServerSentEventsResponse(stream, { abortController });
        } catch (error: unknown) {
          console.error("Remy chat error:", error);
          const isObjectWithError = error && typeof error === "object" && "message" in error;
          const errName =
            isObjectWithError && "name" in error
              ? String((error as Record<string, unknown>).name)
              : "";
          const errMessage = isObjectWithError
            ? String((error as Record<string, unknown>).message)
            : String(error);
          if (errName === "AbortError" || abortController.signal.aborted) {
            return new Response(null, { status: 499 });
          }
          return new Response(
            JSON.stringify({
              error: "Failed to process chat request",
              message: errMessage,
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
