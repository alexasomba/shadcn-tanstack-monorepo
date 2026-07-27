# Cloudflare Workflows Onboarding Sequences Design (Milestone 4 R3)

### Core Findings

Cloudflare Workflows are implemented by extending `WorkflowEntrypoint` with steps declared using the `step.do()` API. The designed workflows `UserOnboardingWorkflow` and `OrgOnboardingWorkflow` conform to the specific step names, parameters, and output types expected by the E2E test suite.

---

## 1. Cloudflare Workflows Mechanics & Templates

Based on the codebase analysis of `templates/workflows-starter-template/worker/workflow.ts` (lines 13-59):

- **Class Structure**: Workflows extend `WorkflowEntrypoint<Env, Params>` from `"cloudflare:workers"`.
- **Durable Executions**: All operations with side effects must be wrapped in `step.do(name, callback)` to ensure idempotency and prevent duplicate executions during retries.
- **Payload Access**: Parameters passed to the workflow are accessed via the `event.payload` object.
- **TypeScript Integration**: The second generic parameter of `WorkflowEntrypoint` defines the payload type.

---

## 2. Onboarding Workflow Design

The designed workflow file `packages/data-ops/src/workflows/onboarding.ts` conforms to the E2E test step requirements:

- **`UserOnboardingWorkflow`**:
  - Step 1: `"create_user_profile"` (returns `{ userId }`)
  - Step 2: `"send_welcome_email"` (returns `{ success: boolean }`)
- **`OrgOnboardingWorkflow`**:
  - Step 1: `"provision_org_workspace"` (returns `{ orgId }`)
  - Step 2: `"initialize_billing"` (returns `{ success: boolean }`)

The proposed code is stored in `.agents/explorer_m4_1/proposed_onboarding.ts`.

---

## 3. Proposed Package Exports & Integration

To integrate the workflows package-wide in the monorepo, we propose the following changes:

### A. Exposing exports in `packages/data-ops/package.json`

Add the `"./workflows"` subpath export mapping inside `exports` (lines 70-71):

```json
    "./workflows": {
      "types": "./src/workflows/onboarding.ts",
      "import": "./src/workflows/onboarding.ts",
      "default": "./src/workflows/onboarding.ts"
    }
```

### B. Adding bundle entry to `packages/data-ops/vite.config.ts`

Include the workflows entry point under `pack.entry` list (around line 28) to ensure it compiles correctly during `vp pack`:

```typescript
      "src/workflows/onboarding.ts",
```

### C. Re-exporting via `packages/data-ops/src/index.ts`

Append the following export to expose the workflows directly from the package root:

```typescript
// --- Cloudflare Workflows ---
export * from "./workflows/onboarding";
```

---

## 4. Verification Methods

The proposed implementation can be verified using the existing E2E test suite in `apps/e2e-tests`:

- Command: `vp test run` inside `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/apps/e2e-tests` or at workspace root.
- The test suite includes 84 passing assertions across 5 files, mocking workflows in `apps/e2e-tests/src/helpers.ts` (lines 279-315) and testing step execution matching the design.
