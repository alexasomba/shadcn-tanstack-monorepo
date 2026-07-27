## 2026-07-15T17:00:30Z

You are the Forensic Auditor (Generation 2). Your task is to perform the final independent forensic integrity verification of the changes implemented for Milestone 7 Phase 2.
Your working directory is: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/auditor_m7_phase2_gen2

Instructions:

1. Initialize your BRIEFING.md and progress.md immediately under your working directory, and start a liveness heartbeat timer/cron using the schedule tool.
2. Review the final codebase state. Verify the integrity of the implementations. Specifically:
   - Check that there are no hardcoded test results, expected outputs, or dummy/facade implementations in source code.
   - Ensure the implementation of Paystack subscription enabling, Todos organization-level isolation, and API Key error mapping is genuine and executes the intended logic.
   - Verify that migrations were correctly generated and applied.
3. Run the verification commands and tests:
   - `vp run --filter data-service test`
   - `vp run --filter e2e-tests test`
4. Compile an integrity audit report (handoff.md) in your working directory outlining your findings and verdict (CLEAN / INTEGRITY_VIOLATION).
5. Message your parent (conversation ID: 43242d62-69a5-4c6e-9e1d-efb3f2103db4) when complete.
