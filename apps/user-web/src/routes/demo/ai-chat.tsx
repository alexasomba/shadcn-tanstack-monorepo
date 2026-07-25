import { createFileRoute } from "@tanstack/react-router";
import {
  Microphone,
  MicrophoneSlash,
  PaperPlaneRight,
  SpeakerHigh,
  SpeakerSlash,
  Square,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import { Button } from "@workspace/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import { Message, MessageAvatar, MessageContent } from "@workspace/ui/components/message";
import { Spinner } from "@workspace/ui/components/spinner";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";

import GuitarRecommendation from "#/components/demo-GuitarRecommendation";
import { useAudioRecorder } from "#/hooks/demo-useAudioRecorder";
import { useTTS } from "#/hooks/demo-useTTS";
import type { ChatMessages } from "#/lib/demo-ai-hook";
import { useGuitarRecommendationChat } from "#/lib/demo-ai-hook";

import "./ai-chat.css";

function InitialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="mx-auto w-full max-w-3xl text-center">
        <h1 className="demo-title mb-4">TanStack Chat</h1>
        <p className="demo-muted mx-auto mb-6 max-w-2xl text-lg">
          You can ask me about anything, I might or might not have a good answer, but you can still
          ask.
        </p>
        {children}
      </div>
    </div>
  );
}

function ChattingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky right-0 bottom-0 left-0 z-10 border-t border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-sm">
      <div className="mx-auto w-full max-w-3xl px-4 py-3">{children}</div>
    </div>
  );
}

function Messages({
  messages,
  playingId,
  onSpeak,
  onStopSpeak,
}: {
  messages: ChatMessages;
  playingId: string | null;
  onSpeak: (text: string, id: string) => void;
  onStopSpeak: () => void;
}) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!messages.length) {
    return null;
  }

  // Extract text content from message parts
  const getTextContent = (parts: ChatMessages[number]["parts"]): string | null => {
    for (const part of parts) {
      if (part.type === "text" && part.content) {
        return part.content;
      }
    }
    return null;
  };

  return (
    <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto pb-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
        {messages.map((message) => {
          const textContent = getTextContent(message.parts);
          const isPlaying = playingId === message.id;
          const isAssistant = message.role === "assistant";

          return (
            <Message key={message.id} align={isAssistant ? "start" : "end"}>
              <MessageAvatar>
                <Avatar className="size-8">
                  <AvatarFallback
                    className={
                      isAssistant
                        ? "bg-[var(--lagoon-deep)] text-white"
                        : "bg-[var(--sea-ink-soft)] text-white"
                    }
                  >
                    {isAssistant ? "AI" : "Y"}
                  </AvatarFallback>
                </Avatar>
              </MessageAvatar>

              <MessageContent>
                {message.parts.map((part) => {
                  if (part.type === "text" && part.content) {
                    return (
                      <Bubble
                        key={part.content}
                        variant={isAssistant ? "muted" : "default"}
                        align={isAssistant ? "start" : "end"}
                      >
                        <BubbleContent>
                          <div className="prose prose-sm max-w-none min-w-0">
                            <Streamdown>{part.content}</Streamdown>
                          </div>
                        </BubbleContent>
                      </Bubble>
                    );
                  }
                  // Guitar recommendation card
                  if (
                    part.type === "tool-call" &&
                    part.name === "recommendGuitar" &&
                    part.output
                  ) {
                    return (
                      <div key={part.id} className="mx-auto max-w-[80%]">
                        <GuitarRecommendation id={String(part.output?.id)} />
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>

              {/* TTS button for assistant messages */}
              {isAssistant && textContent ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => (isPlaying ? onStopSpeak() : onSpeak(textContent, message.id))}
                  title={isPlaying ? "Stop speaking" : "Read aloud"}
                >
                  {isPlaying ? <SpeakerSlash className="size-4" /> : <SpeakerHigh className="size-4" />}
                </Button>
              ) : null}
            </Message>
          );
        })}
      </div>
    </div>
  );
}


function ChatPage() {
  const [input, setInput] = useState("");

  const { isRecording, isTranscribing, startRecording, stopRecording } = useAudioRecorder();
  const { playingId, speak, stop: stopTTS } = useTTS();

  const { messages, sendMessage, isLoading, stop } = useGuitarRecommendationChat();

  const handleMicClick = async () => {
    if (isRecording) {
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setInput((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
      }
    } else {
      await startRecording();
    }
  };

  const Layout = messages.length ? ChattingLayout : InitialLayout;

  return (
    <div className="relative flex h-[calc(100vh-12rem)] min-h-[32rem]">
      <div className="flex min-h-0 flex-1 flex-col">
        <Messages messages={messages} playingId={playingId} onSpeak={speak} onStopSpeak={stopTTS} />

        <Layout>
          <div className="flex flex-col gap-3">
            {isLoading && (
              <div className="flex items-center justify-center">
                <Button variant="destructive" size="sm" onClick={stop}>
                  <Square className="size-4 fill-current" />
                  Stop
                </Button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formEl = e.currentTarget;
                if (!formEl.checkValidity()) {
                  formEl.reportValidity();
                  return;
                }
                if (input.trim() && !isLoading) {
                  sendMessage(input);
                  setInput("");
                }
              }}
            >
              <div className="mx-auto flex max-w-xl items-center gap-2">
                <Button
                  type="button"
                  onClick={handleMicClick}
                  disabled={isLoading || isTranscribing}
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  className={isRecording ? "animate-pulse" : ""}
                  title={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isTranscribing ? (
                    <Spinner className="size-4" />
                  ) : isRecording ? (
                    <MicrophoneSlash className="size-4" />
                  ) : (
                    <Microphone className="size-4" />
                  )}
                </Button>

                <InputGroup className="flex-1">
                  <InputGroupTextarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type something clever..."
                    aria-label="Chat message input"
                    required
                    minLength={1}
                    rows={1}
                    style={{ minHeight: "44px", maxHeight: "200px" }}
                    disabled={isLoading}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 200) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                        e.preventDefault();
                        sendMessage(input);
                        setInput("");
                      }
                    }}
                  />
                  <InputGroupAddon align="end">
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      aria-label="Send message"
                      disabled={!input.trim() || isLoading}
                    >
                      <PaperPlaneRight className="size-4" />
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </form>
          </div>
        </Layout>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/demo/ai-chat")({
  component: ChatPage,
});

