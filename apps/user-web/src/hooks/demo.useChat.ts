import { useLiveQuery } from "@tanstack/react-db";
import type { Collection } from "@tanstack/react-db";
import { useEffect, useRef } from "react";

import { messagesCollection } from "#/db-collections";
import type { Message } from "#/db-collections";

function useStreamConnection(url: string, collection: Collection<any, any, any>) {
  const loadedRef = useRef(false);

  // react-doctor-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const fetchData = async () => {
      if (loadedRef.current) return;
      loadedRef.current = true;

      const response = await fetch(url);
      const reader = response.body?.getReader();
      if (!reader) {
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const chunk of decoder
          .decode(value, { stream: true })
          .split("\n")
          .filter((chunk) => chunk.length > 0)) {
          collection.insert(JSON.parse(chunk));
        }
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run stream fetch once on mount
    // react-doctor-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useChat() {
  useStreamConnection("/demo/db-chat-api", messagesCollection);

  const sendMessage = (message: string, user: string) => {
    fetch("/demo/db-chat-api", {
      method: "POST",
      body: JSON.stringify({ text: message.trim(), user: user.trim() }),
    });
  };

  return { sendMessage };
}

export function useMessages() {
  const { data: messages } = useLiveQuery((q) =>
    q.from({ message: messagesCollection }).select(({ message }) => ({
      ...message,
    })),
  );

  return messages as Message[];
}
