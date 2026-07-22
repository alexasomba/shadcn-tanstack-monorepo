# Phase 2: Adversarial Coverage Hardening (Tier 5) Gap Report

## Overview

This report details the code coverage gaps and untested edge cases identified during the white-box inspection of Milestone 7 features (Cloudflare R2 Uploads, Onboarding Workflows, and Database Seeding) in the `shadcn-tanstack-monorepo` codebase.

## Identified Gaps

### 1. Cloudflare R2 Uploads

- **Zero-Byte File Uploads**: The E2E tests only checked file uploads with dummy text data ("fake-image-bytes"). There were no tests asserting the behavior of the system (or the mock bucket) under zero-byte array buffers or empty strings.
- **Credential-Based URL Generation**: The helper functions `getPresignedPutUrl` and `getPresignedGetUrl` in `packages/data-ops/src/r2.ts` dynamically branch between custom S3/AWS credential-based URL signing and falling back to mock URLs. However, prior to Phase 2, there was no integration test validating that the AWS credential-based signing path actually executed without crashing when credentials were provided.
- **Bucket Operation Errors**: Existing tests assumed the R2 bucket was always fully functional. There was no coverage for bucket failures (e.g. read/write storage errors, timeout exception propagation) to ensure the `data-service` router gracefully handles them and responds with `500` status and appropriate error payload matching `ErrorSchema`.

### 2. Onboarding Workflows

- **Actual Workflows run method**: Prior tests only ran `MockWorkflow` simulations inside `e2e-tests` and `data-service` tests. The actual workflow logic in `packages/data-ops/src/workflows/onboarding.ts` (extending `WorkflowEntrypoint`) was never directly instantiated or run, leading to zero coverage for the real workflow run scripts.
- **Step Failure & Engine Retries**: The propagation of step errors and the subsequent retry behavior of the Cloudflare Workflows engine was only mocked out. We lacked validation that actual steps throw correctly and can succeed on a subsequent execution attempt (retrying).
- **Step Database Constraints / Conflicts**: There was no testing of how database constraint failures (such as unique key collisions) inside a step callback impact workflow execution.

### 3. Database Seeding

- **Active Foreign Key Constraints (PRAGMA foreign_keys = ON)**: SQLite by default does not enforce foreign keys. In typical tests, foreign keys were not active, leaving a major risk that seeding would violate foreign keys when run on a real D1/SQLite instance where foreign keys are enabled. Specifically, the topological deletion order during the idempotency reset phase is highly sensitive to constraints.
- **Duplicate Execution Verification**: Seeding was only run once per test run. We needed to ensure that invoking the seed script sequentially on an already populated database did not cause unique key/slug collisions or duplicate counts.

## Adversarial Test Implementation

To address these gaps, we created a comprehensive suite of Tier 5 adversarial tests located in:
`apps/e2e-tests/src/adversarial.test.ts`

These tests verify all of the above edge cases and have been successfully executed and validated using Vite+ (`vp run --filter e2e-tests test`).
