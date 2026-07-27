/**
 * Cloudflare Workflows for first-run user/org onboarding (M15).
 * Classes are registered on the data-service (and optional user-web) Worker.
 */
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createDatabase } from "../database/setup";
import { createMailerFromEnv } from "../email/mailer";
import { getNotifyClient, hasOnesignalCredentials } from "../notifications";
import {
  applyUserProfileDefaults,
  ensureFreeSubscription,
  ensureOrgFreePlanMetadata,
  getOrgForOnboarding,
  getUserEmailForOnboarding,
} from "../queries/billing-onboarding";
import { createInboxNotification } from "../queries/inbox";

export interface UserOnboardingParams {
  userId: string;
}

export interface OrgOnboardingParams {
  orgId: string;
}

/** Bindings available to onboarding workflow instances. */
export type OnboardingWorkflowEnv = {
  DATABASE: D1Database;
  ONESIGNAL_APP_ID?: string;
  ONESIGNAL_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  BETTER_AUTH_URL?: string;
};

function readProcessEnv(name: string): string | undefined {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const value = proc?.env?.[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

export class UserOnboardingWorkflow extends WorkflowEntrypoint<
  OnboardingWorkflowEnv,
  UserOnboardingParams
> {
  async run(event: WorkflowEvent<UserOnboardingParams>, step: WorkflowStep) {
    const { userId } = event.payload;
    const db = createDatabase(this.env.DATABASE);

    const profile = await step.do("create_user_profile", async () => {
      const defaults = await applyUserProfileDefaults(db, userId);
      const free = await ensureFreeSubscription(db, userId);
      return {
        userId,
        displayUsername: defaults.displayUsername,
        profileUpdated: defaults.updated,
        freeSubscription: free,
      };
    });

    await step.do("send_welcome_email", async () => {
      const contact = await getUserEmailForOnboarding(db, userId);
      if (!contact) {
        console.warn(`[UserOnboardingWorkflow] no email for user ${userId}; skip welcome`);
        return { sent: false as const };
      }

      const name = contact.name || profile.displayUsername || "there";
      const appUrl =
        this.env.BETTER_AUTH_URL ?? readProcessEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:8300";

      // In-app welcome first (single D1 write — cheap, always works without provider keys).
      try {
        await createInboxNotification(db, {
          userId,
          type: "onboarding.welcome",
          title: "Welcome aboard",
          body: "You're on the free plan. Open the dashboard to get started.",
          href: "/dashboard",
        });
      } catch (err) {
        console.warn("[UserOnboardingWorkflow] inbox welcome failed", err);
      }

      const notifyEnv = {
        ONESIGNAL_APP_ID: this.env.ONESIGNAL_APP_ID ?? readProcessEnv("ONESIGNAL_APP_ID"),
        ONESIGNAL_API_KEY: this.env.ONESIGNAL_API_KEY ?? readProcessEnv("ONESIGNAL_API_KEY"),
        DISCORD_WEBHOOK_URL: this.env.DISCORD_WEBHOOK_URL ?? readProcessEnv("DISCORD_WEBHOOK_URL"),
      };

      try {
        const notify = getNotifyClient(notifyEnv);
        await notify.welcome.send({
          to: contact.email,
          input: { name },
        });
        return {
          sent: true as const,
          via: hasOnesignalCredentials(notifyEnv) ? ("onesignal" as const) : ("dry-run" as const),
        };
      } catch (err) {
        // Optional Resend fallback only when OneSignal path errors (not when dry-run succeeds).
        console.warn("[UserOnboardingWorkflow] notify.welcome failed; falling back to mailer", err);
        const mailer = createMailerFromEnv({
          RESEND_API_KEY: this.env.RESEND_API_KEY ?? readProcessEnv("RESEND_API_KEY"),
          EMAIL_FROM: this.env.EMAIL_FROM ?? readProcessEnv("EMAIL_FROM"),
        });
        await mailer.send({
          to: contact.email,
          subject: `Welcome, ${name}!`,
          text: `Welcome, ${name}!\n\nYou're on the free plan. Open the dashboard: ${appUrl}/dashboard`,
          html: `<h1>Welcome, ${name}!</h1><p>You're on the free plan.</p><p><a href="${appUrl}/dashboard">Open dashboard</a></p>`,
        });
        return { sent: true as const, via: "mailer" as const };
      }
    });

    return profile;
  }
}

export class OrgOnboardingWorkflow extends WorkflowEntrypoint<
  OnboardingWorkflowEnv,
  OrgOnboardingParams
> {
  async run(event: WorkflowEvent<OrgOnboardingParams>, step: WorkflowStep) {
    const { orgId } = event.payload;
    const db = createDatabase(this.env.DATABASE);

    const workspace = await step.do("provision_org_workspace", async () => {
      const org = await getOrgForOnboarding(db, orgId);
      const meta = await ensureOrgFreePlanMetadata(db, orgId);
      return {
        orgId,
        name: org?.name ?? null,
        metadataUpdated: meta.updated,
      };
    });

    await step.do("initialize_billing", async () => {
      const free = await ensureFreeSubscription(db, orgId);
      console.info(
        `[OrgOnboardingWorkflow] billing for org ${orgId}: plan=${free.plan} created=${free.created} sub=${free.subscriptionId}`,
      );
      return free;
    });

    return workspace;
  }
}
