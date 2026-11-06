# Spec: T09 · Test Restructure

## Overview

Remove catch-all test suites and colocate 1:1 focused test files using Testing Library queries. Configure the test environment default appropriately, and eliminate act() warnings, duplicate Three.js instance warnings, and CJS deprecation noise across the test suite.

**Behaviour change:** None
**Risk:** Low

**Track type:** Chore (test restructure). Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-140 · AUD-141 · AUD-142 · AUD-143 · AUD-144 · AUD-145 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t09--test-restructure)).

## Scope

### In scope
- AUD-140 — `tests/searchService.test.ts` (1,739 lines) catch-all with `innerHTML` substring assertions
- AUD-141 — `tests/router.test.ts` uses `renderHtml` → `toContain`
- AUD-142 — No colocated 1:1 tests for views, `components/search/**`, `journeyService`, `guideService`, `layerCardService`, `details/*`, `nomenclature`
- AUD-143 — Unit test environment defaults to `node`
- AUD-144 — `act()` warnings and duplicate Three.js instance / CJS deprecation warnings in every suite
- AUD-145 — `toBeDefined()`-only smoke tests; `as any` mocks; `react(globals)` lint warnings in tests

### Out of scope
- Production code changes beyond test seams.

## Acceptance Criteria

- [ ] Every owned finding (AUD-140 … AUD-145) marked `verified` by the end-of-track audit.
- [ ] Owned guard baselines at zero: `G-lint` (react globals in tests).
- [ ] No guard baseline increased.
- [ ] Full e2e suite including URL contract specs green.
- [ ] Manual smoke checklist passed.
- [ ] Audit report written to `audit-report.md`.
