/**
 * Demo NDJSON chat API (TanStack DB local-only collection).
 *
 * Workers note: this is isolate-scoped demo state only — not multi-tenant, not durable.
 * Message ids use crypto.randomUUID() (not Math.random / module counters).
 * Do not copy this pattern for production rooms (use Durable Objects / D1).
 */
import { createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { z } from "zod";

const IncomingMessageSchema = z.object({
  user: z.string(),
  text: z.string(),
});

const MessageSchema = IncomingMessageSchema.extend({
  id: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

type DemoChatRoom = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- demo room; TanStack DB generic is heavy
  collection: ReturnType<typeof createCollection<any, any, any, any, any>>;
  seeded: boolean;
};

const ROOM_KEY = "__userWebDemoDbChatRoom";

function getDemoChatRoom(): DemoChatRoom {
  const g = globalThis as typeof globalThis & { [ROOM_KEY]?: DemoChatRoom };
  if (!g[ROOM_KEY]) {
    const collection = createCollection(
      localOnlyCollectionOptions({
        getKey: (message) => message.id,
        schema: MessageSchema,
      }),
    );
    g[ROOM_KEY] = { collection, seeded: false };
  }
  const room = g[ROOM_KEY];
  if (!room.seeded) {
    room.collection.insert({
      id: crypto.randomUUID(),
      user: "Alice",
      text: "Hello, how are you?",
    });
    room.collection.insert({
      id: crypto.randomUUID(),
      user: "Bob",
      text: "I'm fine, thank you!",
    });
    room.seeded = true;
  }
  return room;
}

function sendMessage(message: { user: string; text: string }) {
  getDemoChatRoom().collection.insert({
    id: crypto.randomUUID(),
    user: message.user,
    text: message.text,
  });
}

export const Route = createFileRoute("/demo/db-chat-api")({
  server: {
    handlers: {
      GET: () => {
        const { collection } = getDemoChatRoom();
        const stream = new ReadableStream({
          start(controller) {
            for (const [_id, message] of collection.state) {
              controller.enqueue(`${JSON.stringify(message)}\n`);
            }
            collection.subscribeChanges((changes) => {
              for (const change of changes) {
                if (change.type === "insert") {
                  controller.enqueue(`${JSON.stringify(change.value)}\n`);
                }
              }
            });
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson",
          },
        });
      },
      POST: async ({ request }) => {
        const message = IncomingMessageSchema.safeParse(await request.json());
        if (!message.success) {
          return new Response(message.error.message, { status: 400 });
        }
        sendMessage(message.data);
        return json(message.data);
      },
    },
  },
});
