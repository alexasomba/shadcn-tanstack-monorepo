# Scope: E2E Testing Track

## Architecture

- Monorepo containing `user-web`, `admin-web`, `data-service`, `agents`, `packages/data-ops`.
- E2E testing package `apps/e2e-tests` will test API endpoints of `data-service` and integrate with package methods from `packages/data-ops` and other components to verify requirements.
- Uses `vitest` as the runner, aligned with Vite+.

## Milestones

| #   | Name                               | Scope                                                                                                                                                                                                                                        | Dependencies | Status |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | Test Infra Setup                   | Create `apps/e2e-tests` workspace with package/config files. Setup core helpers: D1 db mocks, R2 mocks, Workflows triggers, mock environment bindings. Create `TEST_INFRA.md` in project root.                                               | None         | DONE   |
| 2   | Tier 1: Feature Coverage           | Implement >=5 test cases per feature for Paystack subscriptions, R2 uploads, tenant organization, developer API keys, durable workflows, mock seeding, and Sentry monitoring.                                                                | 1            | DONE   |
| 3   | Tier 2: Boundary & Corner Cases    | Implement boundary/corner case tests (empty bounds, extreme limits, invalid inputs, error states, and delay triggers).                                                                                                                       | 2            | DONE   |
| 4   | Tier 3: Cross-Feature Combinations | Implement tests for pairwise feature interactions (e.g., org creation + api-key + workflows; subscription status + API limits + R2 file uploads).                                                                                            | 3            | DONE   |
| 5   | Tier 4: Real-World Scenarios       | Implement real-world integration flows (e.g., complete user registration flow that triggers onboarding workflow, organization creation, subscription upgrade via Paystack, API key generation, and authenticated programmatic upload to R2). | 4            | DONE   |
| 6   | Verification & Publication         | Run E2E test suite via `vp test`, compile results, and publish `TEST_READY.md` in the project root.                                                                                                                                          | 5            | DONE   |

## Interface Contracts

### E2E Test Suite Execution

- Test package name: `e2e-tests` (under `apps/e2e-tests`).
- Invocation: `vp run --filter e2e-tests test` or `vp test` targeting `apps/e2e-tests`.
- Success condition: All tests pass with exit code 0.
