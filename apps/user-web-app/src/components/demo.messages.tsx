import type { Message } from "#/db-collections";

export const getAvatarColor = (username: string) => {
  const colors = [
    "bg-[var(--lagoon-deep)]",
    "bg-[var(--palm)]",
    "bg-[var(--sea-ink-soft)]",
    "bg-[var(--lagoon)]",
  ];
  const index = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

export default function Messages({ messages, user }: { messages: Message[]; user: string }) {
  return (
    <>
      {messages.map((msg: Message) => (
        <div key={msg.id} className={`flex ${msg.user === user ? "justify-end" : "justify-start"}`}>
          <div
            className={`flex max-w-xs items-start space-x-3 lg:max-w-md ${
              msg.user === user ? "flex-row-reverse space-x-reverse" : ""
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white ${getAvatarColor(
                msg.user,
              )}`}
            >
              {msg.user.charAt(0).toUpperCase()}
            </div>

            <div
              className={`rounded-2xl px-4 py-2 ${
                msg.user === user
                  ? "rounded-br-md bg-[var(--lagoon-deep)] text-white"
                  : "rounded-bl-md border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink)]"
              }`}
            >
              {msg.user !== user && (
                <p className="demo-muted mb-1 text-xs font-medium">{msg.user}</p>
              )}
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
