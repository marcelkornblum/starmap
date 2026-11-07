# Spec: T01 · Guardrails & Safety Net

## Overview

Install the mechanical guards and the behavioural safety net that every later remediation track depends on. **This track makes zero production behaviour changes.** It only adds checks, tests, baselines and toolchain fixes, so any later regression or reintroduced debt is caught automatically.

**Track type:** Chore (tooling, CI, tests). Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-001 · AUD-002 · AUD-003 · AUD-004 · AUD-005 · AUD-006 · AUD-007 · AUD-008 · AUD-009 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t01--guardrails--safety-net)).

## Scope

### In scope
1. **Audit-script blind spots** (AUD-001 – AUD-003)
   - `audit:ui`: per-file quad check for every exported component; px/rem/rgba/ms token check; inline-style scan widened to `canvas/` and `prototypes/`; `renderToString` scan widened to `tests/`.
   - `audit:r3f`: any whole-object store selection; inline `create*Geometry(` / `new THREE.*Geometry` inside JSX; layout reads (`offsetWidth`, `getBoundingClientRect`, …) inside `useFrame`; colour/opacity identifiers in material/geometry `useMemo` deps.
2. **Ratcheting architecture guards** with shrink-only baselines: `G-imports` (layer boundaries + cycles), `G-literals`, `G-shims`, `G-canvas`, `G-size`, `G-lint`. Guards run in CI and fail when any count rises; baselines record today's violations by file and rule.
3. **Toolchain hygiene** (AUD-004 – AUD-008): pin `"latest"` dependencies; align and enforce the coverage ratchet; CI coverage for Storybook tests and the data pipeline (per decision); explicit `strict: true`; typecheck all of `scripts/**`.
4. **Behavioural safety net** (AUD-009): e2e URL contract specs for every route and search-param shape in use (deep link, refresh, back/forward), plus a recorded frame-time baseline from the existing canvas FPS spec.

### Out of scope
- Fixing any violation the guards detect (owned by T02–T09; baselines only shrink in those tracks).
- Pixel-diff visual regression (DEC-R004).

## Functional Requirements

- **FR-1:** Each extended audit rule has a fixture-backed unit test proving it detects the violation and passes on compliant code.
- **FR-2:** Each guard emits a per-rule, per-file violation report and compares it against a committed baseline. It fails if any file/rule count exceeds the baseline, and prints a hint to lower the baseline when counts fall.
- **FR-3:** Baselines are generated from current `main` and committed; CI runs every guard on every PR.
- **FR-4:** URL contract specs assert, for each URL shape: resolved route, selected/focused entity, open panels, and camera target (where observable via `data-*` hooks). They pass on unmodified `main`.
- **FR-5:** The frame-time baseline is recorded with an explicit tolerance and asserted by the regression auditor in later tracks.

## Non-Functional Requirements

- **NFR-1:** `git diff main -- src/` is empty at track close, apart from test-only hooks agreed in the decision log.
- **NFR-2:** Guard runtime adds under 30 s to CI.
- **NFR-3:** Guards are single-command `npm run` scripts (subagent permission-safe).

## Acceptance Criteria

- [ ] AUD-001 … AUD-009 marked `verified` by the end-of-track audit.
- [ ] All guards wired into CI with committed baselines; CI green.
- [ ] URL contract specs and existing e2e specs pass on the track branch.
- [ ] Manual smoke checklist passed by the user.
- [ ] Audit report written to `audit-report.md`.
