import { createNotify, createClient } from "@betternotify/core";
import { discordChannel, discordTransport } from "@betternotify/discord";
import { emailChannel } from "@betternotify/email";
import { onesignalEmailTransport, onesignalPushTransport } from "@betternotify/onesignal";
import { pushChannel } from "@betternotify/push";
import { z } from "zod";

const email = emailChannel({
  defaults: { from: "App <noreply@example.com>" },
});
const push = pushChannel();
const discord = discordChannel();

const rpc = createNotify({
  channels: { email, push, discord },
});

export const notificationCatalog = rpc.catalog({
  welcome: rpc
    .email()
    .input(z.object({ name: z.string() }))
    .subject(({ input }) => `Welcome to our app, ${input.name}!`)
    .template({
      render: ({ input }) =>
        Promise.resolve({
          html: `<h1>Welcome, ${input.name}!</h1>`,
          text: `Welcome, ${input.name}!`,
        }),
    }),

  verifyEmail: rpc
    .email()
    .input(z.object({ name: z.string(), url: z.string() }))
    .subject(() => "Verify your email address")
    .template({
      render: ({ input }) =>
        Promise.resolve({
          html: `<p>Hi ${input.name},</p><p>Verify your email <a href="${input.url}">here</a>.</p>`,
          text: `Hi ${input.name}, verify your email here: ${input.url}`,
        }),
    }),

  resetPassword: rpc
    .email()
    .input(z.object({ name: z.string(), url: z.string() }))
    .subject(() => "Reset your password")
    .template({
      render: ({ input }) =>
        Promise.resolve({
          html: `<p>Hi ${input.name},</p><p>Reset your password <a href="${input.url}">here</a>.</p>`,
          text: `Hi ${input.name}, reset your password here: ${input.url}`,
        }),
    }),

  orgInvitation: rpc
    .email()
    .input(z.object({ inviterName: z.string(), organizationName: z.string(), url: z.string() }))
    .subject(({ input }) => `Join ${input.organizationName}`)
    .template({
      render: ({ input }) =>
        Promise.resolve({
          html: `<p>${input.inviterName} invited you to join ${input.organizationName}. <a href="${input.url}">Accept</a></p>`,
          text: `${input.inviterName} invited you to join ${input.organizationName}. Accept here: ${input.url}`,
        }),
    }),

  twoFactorOtp: rpc
    .email()
    .input(z.object({ otp: z.string() }))
    .subject(() => "Your verification code")
    .template({
      render: ({ input }) =>
        Promise.resolve({
          html: `<p>Your 2FA code is: <strong>${input.otp}</strong></p>`,
          text: `Your 2FA code is: ${input.otp}`,
        }),
    }),

  userPush: rpc
    .push()
    .input(z.object({ title: z.string(), body: z.string() }))
    .title(({ input }) => input.title)
    .body(({ input }) => input.body),

  platformAlert: rpc
    .discord()
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        level: z.enum(["info", "warn", "error"]),
      }),
    )
    .body(({ input }) => `**[${input.level.toUpperCase()}]** Platform Notification`)
    .embeds(({ input }) => [
      {
        title: input.title,
        description: input.description,
        color: input.level === "error" ? 0xe74c3c : input.level === "warn" ? 0xf1c40f : 0x3498db,
        timestamp: new Date().toISOString(),
      },
    ]),
});

export type NotificationCatalog = typeof notificationCatalog;

export function getNotifyClient(env: {
  ONESIGNAL_APP_ID?: string;
  ONESIGNAL_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
}) {
  return createClient({
    catalog: notificationCatalog,
    transportsByChannel: {
      email: onesignalEmailTransport({
        appId: env.ONESIGNAL_APP_ID || "mock-app-id",
        apiKey: env.ONESIGNAL_API_KEY || "mock-api-key",
      }),
      push: onesignalPushTransport({
        appId: env.ONESIGNAL_APP_ID || "mock-app-id",
        apiKey: env.ONESIGNAL_API_KEY || "mock-api-key",
      }),
      discord: discordTransport({
        webhookUrl: env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/mock",
      }),
    },
  });
}
