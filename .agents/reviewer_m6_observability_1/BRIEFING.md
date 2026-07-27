# BRIEFING — 2026-07-15T12:32:20Z

## Mission

Review the Sentry observability implementation and integration tests.

## 🔒 My Identity

- Archetype: reviewer and adversarial critic
- Roles: reviewer, critic
- Working directory: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/reviewer_m6_observability_1
- Original parent: 55c66572-2999-4e5c-8c77-3154fe79b752
- Milestone: m6_observability
- Instance: 1 of 1

## 🔒 Key Constraints

- Review-only — do NOT modify implementation code

## Current Parent

- Conversation ID: 55c66572-2999-4e5c-8c77-3154fe79b752
- Updated: not yet

## Review Scope

- **Files to review**:
  - apps/data-service/src/jobs/queue.ts
  - apps/data-service/src/jobs/cron.ts
  - apps/data-service/src/sentry.test.ts
- **Interface contracts**: PROJECT.md / AGENTS.md / Monorepo rules
- **Review criteria**: Sentry capture, prevention of duplicate events, testing status

## Review Checklist

- **Items reviewed**:
  - apps/data-service/src/jobs/queue.ts (Examine correctness, robustness, Sentry capture, deduplication)
  - apps/data-service/src/jobs/cron.ts (Examine task execution, duplication risk under cronTask wrapper)
  - apps/data-service/src/sentry.test.ts (Examine test coverage, mocks, assertions)
- **Verdict**: REQUEST_CHANGES
- **Unverified claims**: none

## Attack Surface

- **Hypotheses tested**:
  - Null/non-object job body check: Using `in` operator on a non-object throws a TypeError. This triggers a crash in both `handleJobMessage` and `handleJobsBatch`'s catch block, preventing retry or other messages in the batch from running. (Confirmed vulnerability)
  - Cron duplication check: `cronTask` does not check `sentryCaptured` flag. Errors re-thrown from `drainOutbox` inside a cron job will trigger Sentry.captureException twice. (Confirmed vulnerability)
- **Vulnerabilities found**:
  - Crash in `handleJobsBatch` catch block when `message.body` is null or not an object.
  - Duplicate exception logging for outbox drain failures triggered from cron tasks.
  - Lint/formatting issue in `apps/data-service/src/sentry.test.ts` (exits `vp check` with 1).
- **Untested angles**: none

## Key Decisions Made

- Confirmed that "vp test" runs successfully and the integration tests pass.
- Verified that "vp check" fails due to a formatting error in `sentry.test.ts`.
- Decided to issue a REQUEST_CHANGES verdict due to the crash vulnerability, duplicate logging in cron, and formatting violation.

## Artifact Index

- handoff.md — Final review report
