import { createNotify, createClient } from "@betternotify/core";
import { createMockTransport } from "@betternotify/core/transports";
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

export type NotifyEnv = {
  ONESIGNAL_APP_ID?: string;
  ONESIGNAL_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
  /** Force dry-run even when OneSignal is configured (tests). */
  NOTIFY_DRY_RUN?: string;
  NODE_ENV?: string;
  CF_PAGES?: string;
  VITEST?: string;
};

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

function isProductionLike(env: NotifyEnv): boolean {
  return env.NODE_ENV === "production" || env.CF_PAGES === "1";
}

/** True when OneSignal can accept real deliveries (no mock/dry-run). */
export function hasOnesignalCredentials(env: NotifyEnv): boolean {
  return Boolean(trim(env.ONESIGNAL_APP_ID) && trim(env.ONESIGNAL_API_KEY));
}

export type NotifyDeliveryMode = "onesignal" | "dry-run";

/**
 * Resolve delivery mode without allocating transports.
 * Prefer dry-run over fake OneSignal keys: zero outbound HTTP → lower CPU ms + no silent failures.
 */
export function resolveNotifyMode(env: NotifyEnv): NotifyDeliveryMode {
  if (trim(env.NOTIFY_DRY_RUN) === "1" || trim(env.NOTIFY_DRY_RUN) === "true") {
    return "dry-run";
  }
  if (trim(env.VITEST) === "true") {
    return "dry-run";
  }
  return hasOnesignalCredentials(env) ? "onesignal" : "dry-run";
}

/**
 * Typed notification client.
 *
 * **SaaS default:** OneSignal email + push when `ONESIGNAL_APP_ID` + `ONESIGNAL_API_KEY` are set.
 * Without credentials (or `NOTIFY_DRY_RUN=1`), uses mock transports so auth/signup never
 * burn Worker CPU on doomed provider calls.
 */
export function getNotifyClient(env: NotifyEnv = {}) {
  const mode = resolveNotifyMode(env);
  const appId = trim(env.ONESIGNAL_APP_ID);
  const apiKey = trim(env.ONESIGNAL_API_KEY);
  const discordUrl = trim(env.DISCORD_WEBHOOK_URL);

  if (mode === "dry-run") {
    if (isProductionLike(env) && !hasOnesignalCredentials(env)) {
      console.error(
        "[notify] ONESIGNAL_APP_ID/ONESIGNAL_API_KEY missing in production — transactional email is dry-run only",
      );
    } else {
      console.info(
        "[notify] dry-run mode (set ONESIGNAL_APP_ID + ONESIGNAL_API_KEY for live delivery)",
      );
    }
  }

  const mock = () =>
    createMockTransport({
      name: "dry-run",
      reply: () =>
        ({
          messageId: `dry-run-${Date.now()}`,
        }) as never,
    });

  return createClient({
    catalog: notificationCatalog,
    transportsByChannel: {
      email:
        mode === "onesignal" && appId && apiKey
          ? onesignalEmailTransport({ appId, apiKey })
          : mock(),
      push:
        mode === "onesignal" && appId && apiKey
          ? onesignalPushTransport({ appId, apiKey })
          : mock(),
      discord: discordUrl ? discordTransport({ webhookUrl: discordUrl }) : mock(),
    },
  });
}
