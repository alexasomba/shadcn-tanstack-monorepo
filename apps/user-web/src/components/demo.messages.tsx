import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import { Message, MessageAvatar, MessageContent, MessageHeader } from "@workspace/ui/components/message";
import type { Message as MessageType } from "#/db-collections";

export default function Messages({ messages, user }: { messages: MessageType[]; user: string }) {
  return (
    <>
      {messages.map((msg: MessageType) => {
        const isSelf = msg.user === user;
        return (
          <Message key={msg.id} align={isSelf ? "end" : "start"}>
            <MessageAvatar>
              <Avatar className="size-8">
                <AvatarFallback className="text-xs font-semibold">
                  {msg.user.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </MessageAvatar>

            <MessageContent>
              {!isSelf && <MessageHeader>{msg.user}</MessageHeader>}
              <Bubble variant={isSelf ? "default" : "muted"} align={isSelf ? "end" : "start"}>
                <BubbleContent>{msg.text}</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        );
      })}
    </>
  );
}


