import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

export interface UserOnboardingParams {
  userId: string;
}

export class UserOnboardingWorkflow extends WorkflowEntrypoint<unknown, UserOnboardingParams> {
  async run(event: WorkflowEvent<UserOnboardingParams>, step: WorkflowStep) {
    const { userId } = event.payload;

    const profile = await step.do("create_user_profile", async () => {
      await Promise.resolve();
      return { userId };
    });

    await step.do("send_welcome_email", async () => {
      await Promise.resolve();
      console.log(`[UserOnboardingWorkflow] Welcome email sent to user ${userId}`);
    });

    return profile;
  }
}

export interface OrgOnboardingParams {
  orgId: string;
}

export class OrgOnboardingWorkflow extends WorkflowEntrypoint<unknown, OrgOnboardingParams> {
  async run(event: WorkflowEvent<OrgOnboardingParams>, step: WorkflowStep) {
    const { orgId } = event.payload;

    const workspace = await step.do("provision_org_workspace", async () => {
      await Promise.resolve();
      return { orgId };
    });

    await step.do("initialize_billing", async () => {
      await Promise.resolve();
      console.log(`[OrgOnboardingWorkflow] Billing initialized for org ${orgId}`);
    });

    return workspace;
  }
}
