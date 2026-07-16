import { paystack } from "@alexasomba/better-auth-paystack";
import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { betterAuthReferral } from "@marinedotsh/better-auth-referral";
import type { BetterAuthPlugin } from "better-auth";
import {
  admin,
  username,
  phoneNumber,
  emailOTP,
  lastLoginMethod,
  testUtils,
} from "better-auth/plugins";
import { organization } from "better-auth/plugins/organization";
import { twoFactor } from "better-auth/plugins/two-factor";
import { inbox } from "better-inbox";

import { getPaystackSubscriptionPlans } from "./paystack-plans";

export type AuthPluginsOptions = {
  sendInvitationEmail?: (data: {
    email: string;
    organization: { name: string };
    inviter: { user: { name: string } };
    invitation: { id: string };
  }) => Promise<void>;
  sendOTP?: (data: { user: { email: string }; otp: string }) => Promise<void>;
  sendPhoneOTP?: (data: { phoneNumber: string; code: string }) => Promise<void>;
  sendVerificationOTP?: (data: {
    email: string;
    otp: string;
    type: "sign-in" | "email-verification" | "forget-password" | "change-email";
  }) => Promise<void>;
  onOrgCreate?: (org: { id: string; name: string; [key: string]: unknown }) => Promise<void> | void;
  onOrgJoin?: (member: {
    organizationId: string;
    userId: string;
    [key: string]: unknown;
  }) => Promise<void> | void;
  /**
   * Fired after a referred signup is recorded (referral plugin).
   * Keep this cheap (D1 inbox write) — runs on the signup request path.
   */
  onReferralSuccess?: (
    referrerUser: { id: string; name?: string | null; email?: string | null },
    referredUser: { id: string; name?: string | null; email?: string | null },
  ) => Promise<void> | void;
};

function readEnv(name: string): string | undefined {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const value = proc?.env?.[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Comma-separated user IDs that always have full admin powers (see Better Auth admin plugin). */
export function readAdminUserIds(): Array<string> {
  const raw = readEnv("BETTER_AUTH_ADMIN_USER_IDS") ?? readEnv("ADMIN_USER_IDS");
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Server plugins shared by all Workers (web apps append tanstackStartCookies last).
 * Re-run `vpr auth:generate` after changing plugins.
 *
 * | Plugin   | Primary UI        |
 * |----------|-------------------|
 * | org      | both apps         |
 * | referral | user-web (admin has read-only stats) |
 * | admin    | admin-web         |
 * | inbox    | both apps         |
 */
export function createBaseAuthPlugins(options: AuthPluginsOptions = {}): Array<BetterAuthPlugin> {
  return [
    organization({
      // Verified email required to create orgs (kit best practice; tighten further in M14).
      allowUserToCreateOrganization: async (user) => Boolean(user.emailVerified),
      // Free tier default; plan-based limits belong in M14 entitlements.
      organizationLimit: 5,
      membershipLimit: async (_user, org) => {
        const plan =
          org.metadata &&
          typeof org.metadata === "object" &&
          "plan" in org.metadata &&
          typeof (org.metadata as { plan?: unknown }).plan === "string"
            ? (org.metadata as { plan: string }).plan
            : "free";
        if (plan === "enterprise") return 1000;
        if (plan === "pro") return 100;
        return 50;
      },
      creatorRole: "owner",
      // Invitation security: IDs are shown in-app (pending lists) → require verified email on accept/reject/get.
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      invitationLimit: 50,
      cancelPendingInvitationsOnReInvite: true,
      requireEmailVerificationOnInvitation: true,
      teams: {
        enabled: true,
        maximumTeams: 20,
        maximumMembersPerTeam: 50,
        allowRemovingAllTeams: false,
        // defaultTeam creates a team named after the org on create (BA built-in).
      },
      ...(options.sendInvitationEmail ? { sendInvitationEmail: options.sendInvitationEmail } : {}),
      organizationHooks: {
        beforeCreateOrganization: async ({ organization: org }) => {
          // Default plan metadata for membershipLimit + future billing (M12–M14).
          const prevMeta = org.metadata && typeof org.metadata === "object" ? org.metadata : {};
          return {
            data: {
              ...org,
              metadata: {
                ...prevMeta,
                plan: (prevMeta as { plan?: string }).plan ?? "free",
              },
            },
          };
        },
        afterCreateOrganization: async ({ organization: createdOrg }) => {
          if (options.onOrgCreate) {
            await options.onOrgCreate(createdOrg);
          }
        },
        afterAddMember: async ({ member }) => {
          if (options.onOrgJoin) {
            await options.onOrgJoin(member);
          }
        },
      },
    }),
    twoFactor({
      // Issuer shown in authenticator apps (override per-request via enable issuer).
      issuer: readEnv("BETTER_AUTH_APP_NAME") ?? "Starter",
      // Trust device cookie refresh window (30 days).
      trustDeviceMaxAge: 60 * 60 * 24 * 30,
      otpOptions: {
        async sendOTP({ user, otp }) {
          if (options.sendOTP) {
            await options.sendOTP({ user, otp });
          } else {
            console.log(`[auth:otp] to=${user.email} code=${otp}`);
          }
        },
      },
    }),
    betterAuthReferral({
      maskReferredUserEmail: true,
      afterSuccessfulSignUp: async (referrerUser, referredUser) => {
        if (options.onReferralSuccess) {
          try {
            await options.onReferralSuccess(referrerUser, referredUser);
          } catch (err) {
            // Plugin contract: referral callback must never fail signup.
            console.error("[auth:referral] onReferralSuccess failed", err);
          }
        }
      },
    }),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      adminUserIds: readAdminUserIds(),
      impersonationSessionDuration: 60 * 60,
      defaultBanReason: "No reason",
      bannedUserMessage:
        "You have been banned from this application. Please contact support if you believe this is an error.",
    }),
    inbox(),
    username(),
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }) => {
        if (options.sendPhoneOTP) {
          await options.sendPhoneOTP({ phoneNumber: phone, code });
        } else {
          console.log(`[auth:phone-otp] to=${phone} code=${code}`);
        }
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (options.sendVerificationOTP) {
          await options.sendVerificationOTP({ email, otp, type });
        } else {
          console.log(`[auth:email-otp] to=${email} code=${otp} type=${type}`);
        }
      },
    }),
    passkey({
      rpName: readEnv("BETTER_AUTH_APP_NAME") ?? "Starter",
      // rpID/origin derived from BETTER_AUTH_URL hostname when unset (localhost OK for dev).
      rpID: (() => {
        const url = readEnv("BETTER_AUTH_URL");
        if (!url) return "localhost";
        try {
          return new URL(url).hostname;
        } catch {
          return "localhost";
        }
      })(),
    }),
    lastLoginMethod({
      storeInDatabase: true,
    }),
    ...(readEnv("NODE_ENV") === "test" || readEnv("VITEST") === "true"
      ? [testUtils({ captureOTP: true })]
      : []),
    paystack({
      secretKey: readEnv("PAYSTACK_SECRET_KEY") ?? "",
      webhook: {
        secret: readEnv("PAYSTACK_WEBHOOK_SECRET") ?? readEnv("PAYSTACK_SECRET_KEY") ?? "",
      },
      createCustomerOnSignUp: Boolean(readEnv("PAYSTACK_SECRET_KEY")),
      subscription: {
        enabled: true,
        // Prefer card for subscriptions (Paystack skill / docs).
        allowedPaymentChannels: ["card"],
        plans: getPaystackSubscriptionPlans(),
        // Lifecycle hooks (kit observability + future jobs/outbox). Free plan is
        // provisioned by onboarding workflows (M15), not here.
        onSubscriptionCreated: async ({ subscription: sub, plan }) => {
          console.info(
            `[paystack] subscription.created plan=${plan.name} ref=${sub.referenceId} status=${sub.status} id=${sub.id}`,
          );
        },
        onSubscriptionCancel: async ({ subscription: sub }) => {
          console.info(
            `[paystack] subscription.cancelled plan=${sub.plan} ref=${sub.referenceId} id=${sub.id}`,
          );
        },
      },
      // Org-scoped billing (pairs with organization plugin above).
      organization: {
        enabled: true,
        billingRoles: ["owner", "admin"],
        onCustomerCreate: ({ organization: org, paystackCustomer }) => {
          const orgRec = org as { id?: string; name?: string };
          const rec = paystackCustomer as { customer_code?: string; id?: string };
          const code =
            typeof rec.customer_code === "string"
              ? rec.customer_code
              : typeof rec.id === "string"
                ? rec.id
                : "";
          console.info(
            `[paystack] org.customer.created org=${orgRec.id ?? "?"} name=${orgRec.name ?? "?"} customer=${code}`,
          );
          return Promise.resolve();
        },
      },
      onCustomerCreate: ({ user: u, paystackCustomer }) => {
        const userRec = u as { id?: string; email?: string };
        const rec = paystackCustomer as { customer_code?: string; id?: string };
        const code =
          typeof rec.customer_code === "string"
            ? rec.customer_code
            : typeof rec.id === "string"
              ? rec.id
              : "";
        console.info(
          `[paystack] user.customer.created user=${userRec.id ?? "?"} email=${userRec.email ?? "?"} customer=${code}`,
        );
        return Promise.resolve();
      },
    }),
    // Dual configs: personal user keys + org-scoped developer keys (multi-tenant API).
    // Re-run `pnpm --filter data-ops auth:generate` if config schema changes.
    apiKey([
      {
        configId: "user",
        defaultPrefix: "sk_user_",
        references: "user",
        requireName: true,
        enableMetadata: true,
        defaultKeyLength: 32,
        rateLimit: {
          enabled: true,
          timeWindow: 1000 * 60 * 60 * 24,
          maxRequests: 1000,
        },
        keyExpiration: {
          defaultExpiresIn: null,
          minExpiresIn: 1,
          maxExpiresIn: 365,
        },
        startingCharactersConfig: {
          shouldStore: true,
          charactersLength: 12,
        },
        apiKeyHeaders: ["x-api-key"],
      },
      {
        configId: "organization",
        defaultPrefix: "sk_org_",
        references: "organization",
        requireName: true,
        enableMetadata: true,
        defaultKeyLength: 32,
        rateLimit: {
          enabled: true,
          timeWindow: 1000 * 60 * 60 * 24,
          maxRequests: 5000,
        },
        keyExpiration: {
          defaultExpiresIn: null,
          minExpiresIn: 1,
          maxExpiresIn: 365,
        },
        startingCharactersConfig: {
          shouldStore: true,
          charactersLength: 12,
        },
        apiKeyHeaders: ["x-api-key"],
      },
    ]),
  ];
}
