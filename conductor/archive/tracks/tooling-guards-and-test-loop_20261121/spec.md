# Specification: Tooling, Guards, Test Loop & CI

## Overview
Repairs the fail-open and duplicated guard/CI pipeline, speeds up the 190 s unit-test loop, relocates misplaced script tests, declares phantom dev dependencies, and clears local tooling/config sprawl. Runs first in the remediation sequence so all subsequent tracks operate on a fast, trustworthy TDD and CI loop.

Covers Architecture Review findings `H3`, `L6`, `M8`, `M7`, `M13`, `M14`, `M15`, and `L4`.

## Current State (baseline at 2026-11-21)
- `scripts/audit-guards.ts` runs `audit:ui`, `audit:r3f`, and `oxlint` internally while `.github/workflows/ci.yml` executes them again separately; `audit-guards.ts` swallows oxlint execution/JSON errors (`:902-904`); dead baseline machinery (`compareBaseline`, `AUD-xxx` mapping, `:520-580`) remains even though the baseline is `{}`.
- Layering and `max-lines` are declared in three places (docs, `.oxlintrc.json` at `"warn"`, and `scripts/audit-guards.ts`) with 12 near-identical override blocks in `.oxlintrc.json`.
- `npm run test` takes ~190 s wall time for 317 files / 1,853 tests (46 % environment, 25 % import, only 12 % test execution), largely driven by a global `vi.mock('@tanstack/react-router', async () => importActual(...))` in `tests/setup.ts:19-26` and heavy barrel imports.
- Five script test files (`src/data/__tests__/{dataPipeline,syncDiscoveries,captureViews,consolidateMultiStarSystems,getStrippedSystemBaseName}.test.ts`) live inside `src/` and import `../../../scripts/*`.
- `package.json` duplicates `build:data` and `data:build`; `justfile` re-wraps 8 npm scripts; `@babel/parser`, `@testing-library/jest-dom`, and `three-stdlib` are imported as undeclared transitive packages; `vite.config.ts:21-56` carries 8 hard-coded `node_modules` path aliases and duplicated `inline` test config blocks.
- `.github/workflows/ci.yml` runs 5 jobs with uncached `npm ci`, never verifies `data:build` reproducibility, omits `test:storybook`, and pins Node 22 while `.tool-versions` floats `nodejs lts`.
- `.storybook/main.ts:21` hard-codes personal LAN IP `192.168.1.124`, and `scratch/migration-tracker.md` is git-tracked.

## Scope
1. **Guard & Linter Consolidation (`H3`, `L6`)**:
   - Introduce a single unified check entry point (`npm run check`) and eliminate duplicate invocations of `audit:ui`, `audit:r3f`, and `lint` across `scripts/audit-guards.ts` and `.github/workflows/ci.yml`.
   - Make oxlint invocation fail-closed (never swallow non-zero exits or JSON parse errors).
   - Remove dead baseline comparison and `AUD-xxx` mapping machinery from `scripts/audit-guards.ts` (and its dead tests).
   - Eliminate the triple layer/size definition by promoting `.oxlintrc.json` rules to `"error"` (or keeping a single authoritative enforcer) and removing duplicate checks.
2. **Unit Test Loop Speedup (`M8`, `M7`)**:
   - Remove the global `vi.mock('@tanstack/react-router', importActual)` from `tests/setup.ts`; replace it with an opt-in helper (or real `createMemoryHistory` utility) used only by the tests that require router hooks.
   - Move `src/data/__tests__/*` script tests alongside `scripts/` (`scripts/**/*.test.ts`) and split the 248-line catch-all `dataPipeline.test.ts` per pipeline module so `src/` no longer imports `scripts/`.
3. **Dependencies, Scripts & Config Hygiene (`M13`, `M14`, `L4`)**:
   - Delete `justfile` and the duplicate `build:data` npm script (standardise on `data:build`); group script documentation cleanly in `README.md`.
   - Declare `@babel/parser` and `@testing-library/jest-dom` explicitly as `devDependencies` (or migrate AST guards to the existing TypeScript compiler API); audit and remove the 8 hard-coded `vite.config.ts` `node_modules` aliases unless a concrete duplication failure reproduces; deduplicate `vite.config.ts` shared test config.
   - Replace the hard-coded LAN IP (`192.168.1.124`) in `.storybook/main.ts` with an environment variable; remove tracked `scratch/migration-tracker.md`.
4. **CI Workflow Streamlining (`M15`)**:
   - Enable `cache: 'npm'` across CI jobs; merge `lint` and `typecheck` into a single fast job running `npm run check`; align Node version between `.tool-versions` (`nodejs 22`) and CI.
   - Add a scheduled/nightly `data:build` reproducibility verification workflow; keep `test:storybook` local-only for now.

## Out of Scope
- Runtime bundle splitting and heavy barrel removal inside `src/`: [`startup-code-splitting-and-fonts_20261121`](../startup-code-splitting-and-fonts_20261121/spec.md).
- Removing `src/config` / `src/content` exemptions from `G-literals` and pointing `G-literals` at `data/seed`: [`data-contract-purity_20261121`](../data-contract-purity_20261121/spec.md).
- Bulk stripping of `AUD-`/`DEC-` comments across `src/` (`M18`, accepted/deferred) or rewriting the component-quad policy (`L3`, accepted — optional doc wording clarification only).

## Acceptance Criteria
- [ ] `npm run check` runs lint, typecheck, guards, UI audit, and R3F audit once each with zero duplicate executions and fail-closed error handling.
- [ ] Dead baseline / `AUD-xxx` mapping code is removed from `scripts/audit-guards.ts`, and layering/size rules have a single authoritative enforcement point.
- [ ] Global `@tanstack/react-router` `importActual` mock is removed from `tests/setup.ts`; full `npm run test` wall-clock time is materially reduced and recorded against the 190 s baseline.
- [ ] Zero files under `src/` import from `scripts/`; all pipeline/script tests live beside `scripts/`.
- [ ] `justfile` and `build:data` are removed; zero undeclared transitive packages are imported in `scripts/` or `tests/`; no personal LAN IP remains in `.storybook/main.ts` and `scratch/migration-tracker.md` is removed.
- [ ] `.github/workflows/ci.yml` uses `cache: 'npm'`, avoids duplicate audit executions, aligns Node version with `.tool-versions`, and includes a nightly `data:build` reproducibility check.
- [ ] `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, and `npm run test:coverage` pass cleanly.
