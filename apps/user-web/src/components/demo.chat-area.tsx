import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group";

import { useChat, useMessages } from "#/hooks/demo.useChat";
import Messages from "./demo.messages";

export default function ChatArea() {
  const { sendMessage } = useChat();
  const messages = useMessages();

  const [message, setMessage] = useState("");
  const [user, setUser] = useState("Alice");

  const postMessage = () => {
    if (message.trim().length) {
      sendMessage(message, user);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      postMessage();
    }
  };

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {messages.length} message{messages.length === 1 ? "" : "s"} in conversation
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 py-6">
        <Messages messages={messages} user={user} />
      </div>

      <div className="border-t border-border/70 bg-muted/30 px-4 py-4">
        <div className="flex items-center gap-3">
          <NativeSelect
            value={user}
            onChange={(e) => setUser(e.target.value)}
            aria-label="Select user"
          >
            <NativeSelectOption value="Alice">Alice</NativeSelectOption>
            <NativeSelectOption value="Bob">Bob</NativeSelectOption>
          </NativeSelect>

          <InputGroup className="flex-1">
            <InputGroupInput
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              aria-label="Type a message"
            />
            <InputGroupAddon align="inline-end">
              <Button
                type="button"
                onClick={postMessage}
                disabled={message.trim() === ""}
                size="sm"
              >
                Send
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </>
  );
}

