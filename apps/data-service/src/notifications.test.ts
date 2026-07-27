import { createClient } from "@betternotify/core";
import { mockDiscordTransport } from "@betternotify/discord";
import { mockTransport } from "@betternotify/email";
import { mockPushTransport } from "@betternotify/push";
import { notificationCatalog } from "data-ops";
import { describe, expect, it } from "vite-plus/test";

describe("Notifications System", () => {
  it("sends welcome email correctly through mock transport", async () => {
    const emailMock = mockTransport();
    const client = createClient({
      catalog: notificationCatalog,
      transportsByChannel: {
        email: emailMock,
        push: mockPushTransport(),
        discord: mockDiscordTransport(),
      },
    });

    await client.welcome.send({
      to: "test@example.com",
      input: { name: "Alice" },
    });

    expect(emailMock.sent.length).toBe(1);
    expect(emailMock.sent[0].to).toContain("test@example.com");
    expect(emailMock.sent[0].subject).toBe("Welcome to our app, Alice!");
    expect(emailMock.sent[0].html).toContain("Welcome, Alice!");
  });

  it("sends verifyEmail correctly through mock transport", async () => {
    const emailMock = mockTransport();
    const client = createClient({
      catalog: notificationCatalog,
      transportsByChannel: {
        email: emailMock,
        push: mockPushTransport(),
        discord: mockDiscordTransport(),
      },
    });

    await client.verifyEmail.send({
      to: "test@example.com",
      input: { name: "Alice", url: "https://example.com/verify?token=123" },
    });

    expect(emailMock.sent.length).toBe(1);
    expect(emailMock.sent[0].to).toContain("test@example.com");
    expect(emailMock.sent[0].subject).toBe("Verify your email address");
    expect(emailMock.sent[0].html).toContain("https://example.com/verify?token=123");
  });

  it("sends resetPassword correctly through mock transport", async () => {
    const emailMock = mockTransport();
    const client = createClient({
      catalog: notificationCatalog,
      transportsByChannel: {
        email: emailMock,
        push: mockPushTransport(),
        discord: mockDiscordTransport(),
      },
    });

    await client.resetPassword.send({
      to: "test@example.com",
      input: { name: "Alice", url: "https://example.com/reset?token=123" },
    });

    expect(emailMock.sent.length).toBe(1);
    expect(emailMock.sent[0].to).toContain("test@example.com");
    expect(emailMock.sent[0].subject).toBe("Reset your password");
    expect(emailMock.sent[0].html).toContain("https://example.com/reset?token=123");
  });

  it("sends orgInvitation correctly through mock transport", async () => {
    const emailMock = mockTransport();
    const client = createClient({
      catalog: notificationCatalog,
      transportsByChannel: {
        email: emailMock,
        push: mockPushTransport(),
        discord: mockDiscordTransport(),
      },
    });

    await client.orgInvitation.send({
      to: "invited@example.com",
      input: {
        inviterName: "Alice",
        organizationName: "ACME Corp",
        url: "https://example.com/invite/123",
      },
    });

    expect(emailMock.sent.length).toBe(1);
    expect(emailMock.sent[0].to).toContain("invited@example.com");
    expect(emailMock.sent[0].subject).toBe("Join ACME Corp");
    expect(emailMock.sent[0].html).toContain("https://example.com/invite/123");
  });

  it("sends twoFactorOtp correctly through mock transport", async () => {
    const emailMock = mockTransport();
    const client = createClient({
      catalog: notificationCatalog,
      transportsByChannel: {
        email: emailMock,
        push: mockPushTransport(),
        discord: mockDiscordTransport(),
      },
    });

    await client.twoFactorOtp.send({
      to: "test@example.com",
      input: { otp: "987654" },
    });

    expect(emailMock.sent.length).toBe(1);
    expect(emailMock.sent[0].to).toContain("test@example.com");
    expect(emailMock.sent[0].subject).toBe("Your verification code");
    expect(emailMock.sent[0].html).toContain("987654");
  });

  it("sends userPush correctly through mock transport", async () => {
    const pushMock = mockPushTransport();
    const client = createClient({
      catalog: notificationCatalog,
      transportsByChannel: {
        email: mockTransport(),
        push: pushMock,
        discord: mockDiscordTransport(),
      },
    });

    await client.userPush.send({
      to: "push-token-123",
      input: { title: "Hello", body: "World" },
    });

    expect(pushMock.messages.length).toBe(1);
    expect((pushMock.messages[0] as unknown as Record<string, unknown>).to).toEqual(
      "push-token-123",
    );
    expect((pushMock.messages[0] as unknown as Record<string, unknown>).title).toBe("Hello");
    expect((pushMock.messages[0] as unknown as Record<string, unknown>).body).toBe("World");
  });

  it("sends platformAlert correctly through mock transport", async () => {
    const discordMock = mockDiscordTransport();
    const client = createClient({
      catalog: notificationCatalog,
      transportsByChannel: {
        email: mockTransport(),
        push: mockPushTransport(),
        discord: discordMock,
      },
    });

    await client.platformAlert.send({
      input: { title: "Drizzle Migration Successful", description: "Completed", level: "info" },
    });

    expect(discordMock.messages.length).toBe(1);
    expect(discordMock.messages[0].body).toBe("**[INFO]** Platform Notification");
    expect(discordMock.messages[0].embeds?.[0].title).toBe("Drizzle Migration Successful");
  });
});
