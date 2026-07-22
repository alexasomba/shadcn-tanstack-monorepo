# Handoff Report: Cloudflare Workflows Onboarding Sequences Design (Milestone 4 R3)

## 1. Observation

- **Workflows Implementation Template**:
  In `templates/workflows-starter-template/worker/workflow.ts` (lines 13-14):

  ```typescript
  export class MyWorkflow extends WorkflowEntrypoint<Env, Record<string, unknown>> {
    async run(event: WorkflowEvent<Record<string, unknown>>, step: WorkflowStep) {
  ```

  And inside, actions use:

  ```typescript
  const result = await step.do("process data", async () => { ... });
  ```

- **E2E Test Specifications**:
  In `apps/e2e-tests/src/helpers.ts` (lines 279-293):

  ```typescript
  if (this.workflowName === "UserOnboardingWorkflow") {
    instance.stepsRun.push({
      name: "create_user_profile",
      status: "success",
      output: { userId: options?.params?.userId },
    });
    instance.stepsRun.push({ name: "send_welcome_email", status: "success" });
  } else if (this.workflowName === "OrgOnboardingWorkflow") {
    instance.stepsRun.push({
      name: "provision_org_workspace",
      status: "success",
      output: { orgId: options?.params?.orgId },
    });
    instance.stepsRun.push({ name: "initialize_billing", status: "success" });
  }
  ```

- **Vite Plus Pack Configuration**:
  In `packages/data-ops/vite.config.ts` (lines 9-28):

  ```typescript
      entry: [
        "src/index.ts",
        ...
        "src/r2.ts",
      ],
  ```

- **Current package.json Exports**:
  In `packages/data-ops/package.json` (lines 14-71):
  ```json
    "exports": {
      ".": {
        "types": "./src/index.ts",
        "import": "./src/index.ts",
        "default": "./src/index.ts"
      },
      ...
  ```

---

## 2. Logic Chain

1. Cloudflare Workflows in the project must be declared as a class extending `WorkflowEntrypoint` with steps run inside `step.do` callbacks (from _Workflows Implementation Template_).
2. The E2E tests expect specific steps to run during user and organization onboarding. In particular, `UserOnboardingWorkflow` expects `create_user_profile` step with returning payload output `{ userId }` and `send_welcome_email` step. `OrgOnboardingWorkflow` expects `provision_org_workspace` with returning payload output `{ orgId }` and `initialize_billing` step (from _E2E Test Specifications_).
3. To package and export the workflows properly via the `data-ops` library, we need to add the new workflows file `src/workflows/onboarding.ts` to `packages/data-ops/vite.config.ts` entrypoints, add `./workflows` mapping inside `package.json` exports, and export the workflows in `src/index.ts` (from _Vite Plus Pack Configuration_ & _Current package.json Exports_).
4. Combining these points, we successfully designed the workflows in `.agents/explorer_m4_1/proposed_onboarding.ts` and specified the integration steps in `analysis.md`.

---

## 3. Caveats

- We assumed `DATABASE` and `RESEND_API_KEY` / `EMAIL_FROM` are the only bindings/env variables the workflows will need. Any additional bindings will need to be added to the typescript types `OnboardingEnv` in the implementation.

---

## 4. Conclusion

The designed onboarding workflows `UserOnboardingWorkflow` and `OrgOnboardingWorkflow` are ready to be integrated into `packages/data-ops/src/workflows/onboarding.ts` with correct exports added in `package.json`, `vite.config.ts`, and `index.ts`. This design satisfies Milestone 4 (R3) requirements.

---

## 5. Verification Method

To verify the integration after the implementer applies the changes:

1. Run the build command:
   ```bash
   vp run --filter data-ops build
   ```
2. Run the E2E tests:
   ```bash
   vp test run
   ```
   All tests in `apps/e2e-tests` should pass (currently 84/84 tests pass with mock implementations).
