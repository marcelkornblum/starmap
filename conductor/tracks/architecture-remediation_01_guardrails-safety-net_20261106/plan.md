# Plan: T01 · Guardrails & Safety Net

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: DEC-R009 — Guard implementation vehicle (extend audit scripts + new `audit:arch` script vs oxlint rules vs new dependency such as dependency-cruiser)
- [x] Task: DEC-R010 — Baseline format and location
- [x] Task: DEC-R011 — `G-literals` definition (which literals count; scope directories)
- [x] Task: DEC-R012 — Layer boundary map for `G-imports` (allowed import directions)
- [x] Task: DEC-R013 — Lint warning strategy (ratchet count vs fix-now; per-rule ownership by later tracks)
- [x] Task: DEC-R014 — URL contract inventory (which URL shapes and assertions)
- [x] Task: DEC-R015 — Data pipeline and Storybook tests in CI (AUD-007)
- [x] Task: DEC-R016 — Frame-time baseline storage and tolerance
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Audit-Script Blind Spots (AUD-001 – AUD-003)
- [ ] Task: Red — fixture tests for per-file quads, token literals, widened inline-style and `renderToString` scopes (`audit:ui`)
- [ ] Task: Green — extend `scripts/audit-ui.ts`
- [ ] Task: Red — fixture tests for whole-store selects, inline JSX geometry, `useFrame` layout reads, colour deps in material `useMemo` (`audit:r3f`)
- [ ] Task: Green — extend `scripts/audit-r3f.ts`
- [ ] Task: Wire existing violations into baselines so `main` stays green
- [ ] Task: Quality Check — `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Ratcheting Architecture Guards
- [ ] Task: Red — fixture tests for `G-imports`, `G-literals`, `G-shims`, `G-canvas`, `G-size`, `G-lint`
- [ ] Task: Green — implement guards and baseline comparison
- [ ] Task: Generate and commit baselines from current code
- [ ] Task: Wire guards into CI (AUD-004)
- [ ] Task: Quality Check
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Toolchain Hygiene (AUD-005 – AUD-008)
- [ ] Task: Pin `"latest"` dependencies (AUD-005)
- [ ] Task: Single coverage threshold source; coverage step fails on regression (AUD-006)
- [ ] Task: CI jobs per DEC-R015 (AUD-007)
- [ ] Task: Explicit `strict: true`; `scripts/**` in a typechecked project; fix resulting type errors in scripts only (AUD-008)
- [ ] Task: Quality Check
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Behavioural Safety Net (AUD-009)
- [ ] Task: Implement URL contract e2e specs per DEC-R014
- [ ] Task: Record frame-time baseline per DEC-R016
- [ ] Task: Confirm full e2e suite green on the track branch
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6: End-of-Track Audit & PR
- [ ] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Revisit DEC-R007 using the false-verdict rate
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
