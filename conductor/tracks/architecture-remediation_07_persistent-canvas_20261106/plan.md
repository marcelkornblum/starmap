# Plan: T07 · One Persistent Canvas & R3F Hot Paths

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [ ] Task: Confirm review mode (DEC-R006)
- [ ] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs
- [ ] Task: Identify and ratify open decisions one by one in decision-log.md
- [ ] Task: Decide — Scene composition model inside the single Canvas
- [ ] Task: Decide — Replacement for data-* test hooks on R3F nodes (userData vs DOM mirror)
- [ ] Task: Decide — Occlusion registration model
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation (detailed after Phase 1)
- [ ] Task: Expand into Red/Green/Refactor tasks per ratified decisions
- [ ] Task: Quality Check — `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, guard suite
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [ ] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
