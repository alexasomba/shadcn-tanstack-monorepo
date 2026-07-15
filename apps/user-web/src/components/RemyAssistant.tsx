import { PaperPlaneRight, X, ChefHat, Cookie } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";

import { useConferenceChat } from "#/lib/conference-ai-hook";
import type { ConferenceChatMessages } from "#/lib/conference-ai-hook";

function Messages({ messages }: { messages: ConferenceChatMessages }) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!messages.length) {
    return (
      <div className="text-cream/60 flex flex-1 flex-col items-center justify-center px-6 py-8 text-sm">
        <div className="relative mb-4">
          <ChefHat className="text-copper/60 h-12 w-12 animate-pulse" />
          <Cookie className="text-gold/60 absolute -right-1 -bottom-1 h-6 w-6" />
        </div>
        <p className="text-cream/80 font-display text-center text-lg font-medium">
          Bonjour! I'm Remy 👨‍🍳
        </p>
        <p className="text-cream/40 mt-2 max-w-[220px] text-center text-xs">
          Your culinary guide to Haute Pâtisserie 2026. Ask about speakers, sessions, or pastry
          techniques!
        </p>
      </div>
    );
  }

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
      {messages.map(({ id, role, parts }) => (
        <div
          key={id}
          className={`py-3 ${
            role === "assistant"
              ? "from-copper/5 via-gold/5 to-copper/5 bg-gradient-to-r"
              : "bg-transparent"
          }`}
        >
          {parts.map((part, index) => {
            if (part.type === "text" && part.content) {
              return (
                <div key={index} className="flex items-start gap-3 px-4">
                  {role === "assistant" ? (
                    <div className="from-copper via-copper-dark to-gold text-charcoal shadow-copper/20 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold shadow-lg">
                      👨‍🍳
                    </div>
                  ) : (
                    <div className="bg-charcoal-light text-cream flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border/50 text-xs font-medium">
                      You
                    </div>
                  )}
                  <div className="text-cream prose dark:prose-invert prose-sm prose-p:text-cream prose-headings:text-cream prose-strong:text-gold max-w-none min-w-0 flex-1">
                    <Streamdown>{part.content}</Streamdown>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
}

interface RemyAssistantProps {
  speakerSlug?: string;
  talkSlug?: string;
  contextTitle?: string;
}

// Export store for header control
export const showRemyAssistant = new Store(false);

export default function RemyAssistant({ speakerSlug, talkSlug, contextTitle }: RemyAssistantProps) {
  const isOpen = useStore(showRemyAssistant);
  const { messages, sendMessage, isLoading } = useConferenceChat(speakerSlug, talkSlug);
  const [input, setInput] = useState("");

  const handleToggle = () => {
    const newState = !isOpen;
    showRemyAssistant.setState(() => newState);
  };

  const handleSend = () => {
    if (input.trim()) {
      void sendMessage(input);
      setInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="border-copper/20 from-charcoal/98 via-charcoal/95 to-charcoal-light/98 fixed top-36 right-4 z-[100] flex h-[520px] w-[400px] flex-col overflow-hidden rounded-2xl border bg-gradient-to-b shadow-2xl backdrop-blur-xl">
      {/* Decorative top gradient */}
      <div className="from-copper/10 via-gold/5 pointer-events-none absolute top-0 right-0 left-0 h-32 bg-gradient-to-b to-transparent" />

      {/* Header */}
      <div className="border-copper/10 relative flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <div className="from-copper via-copper-dark to-gold shadow-copper/30 flex h-10 w-10 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform hover:rotate-0">
            <span className="text-lg">👨‍🍳</span>
          </div>
          <div>
            <h3 className="font-display text-cream text-base font-bold tracking-tight">Remy</h3>
            {contextTitle && (
              <p className="text-copper/70 max-w-[220px] truncate text-xs">🥐 {contextTitle}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleToggle}
          className="text-cream/50 hover:text-cream rounded-xl p-2 transition-colors hover:bg-white/5"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <Messages messages={messages} />

      {/* Loading indicator */}
      {isLoading && (
        <div className="border-copper/10 border-t px-4 py-3">
          <div className="text-copper/80 flex items-center gap-2 text-xs">
            <div className="flex gap-1">
              <span className="bg-copper h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]"></span>
              <span className="bg-gold h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]"></span>
              <span className="bg-copper-light h-2 w-2 animate-bounce rounded-full"></span>
            </div>
            <span className="font-medium">Crafting a response...</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-copper/10 bg-charcoal/50 relative border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about speakers, sessions, techniques..."
              disabled={isLoading}
              className="border-copper/20 bg-charcoal-light/50 text-cream placeholder-cream/30 focus:ring-copper/40 w-full resize-none overflow-hidden rounded-xl border py-3 pr-12 pl-4 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none disabled:opacity-50"
              rows={1}
              style={{ minHeight: "48px", maxHeight: "100px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 100) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && input.trim() && !isLoading) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="from-copper to-copper-dark text-charcoal hover:shadow-copper/20 absolute top-1/2 right-3 -translate-y-1/2 rounded-lg bg-gradient-to-r p-2 transition-all hover:shadow-lg disabled:bg-gray-600 disabled:from-gray-600 disabled:to-gray-600 disabled:opacity-30"
            >
              <PaperPlaneRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
