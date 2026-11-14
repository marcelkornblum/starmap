# Track T09 Audit Report: Test Restructure

**Initiative:** Architecture Remediation (`architecture-remediation`)  
**Track:** T09 (`architecture-remediation_09_test-restructure_20261106`)  
**Branch:** `chore/arch-remediation-09-test-restructure`  
**Date:** 2026-11-14  
**Verdict:** **UNANIMOUS PASS (3-0)**

---

## 1. Executive Summary

Track T09 completes the Test Restructure phase of `architecture-remediation` (`AUD-140` through `AUD-145`, plus coupled `AUD-004` `forbidden-rendertostring`) with zero production behaviour change, deterministic environment partitioning, zero test runner console noise, and a net reduction of 49 guard baseline entries (`161` → `112` entries; `227` → `167` individual violation instances, net `-60` violations):

1. **Monolith Split & 1:1 Colocated Test Architecture (`AUD-140`, `AUD-142`, `DEC-R056`):**
   - Deleted catch-all monoliths `tests/searchService.test.ts` (1,739 lines), `tests/detailsServiceAndPanel.test.tsx`, `tests/journeyServiceAndPanel.test.tsx`, `tests/layerCardAndExplore.test.tsx`, `tests/guideViews.test.tsx`, `tests/router.test.ts`, `tests/stores.test.ts`, and 50+ legacy top-level `tests/*` files.
   - Established 1:1 colocated test suites across `src/services/**`, `src/services/details/**`, `src/components/domain/Search/**`, `src/views/**` (all 24 view/presenter/hook modules), `src/utils/**` (including `nomenclature.test.ts`), `src/stores/**`, `src/hooks/**`, `src/router/**`, `src/components/interface/**`, `src/components/domain/**`, and `src/components/canvas/**` (**232 / 232 test files**, **1,512 / 1,512 passing assertions**).
   - Reserved top-level `tests/` strictly for `tests/setup.ts`, `tests/fixtures/{layerFixtures,searchFixtures}.ts`, and cross-module journey/focus integration flows (`journey1ReaderFlow.test.tsx`, `journey2AuthorFlow.test.tsx`, `journey3ExplorerFlow.test.tsx`, `journey5TransitFlow.test.tsx`, `searchAndFocusIntegration.test.tsx`).
2. **Semantic Testing Library Queries & `renderToString` Elimination (`AUD-140`, `AUD-141`, `AUD-004`):**
   - Replaced all `renderHtml` / `.innerHTML` substring assertions and every `renderToString` import across `src/` and `tests/` with `@testing-library/react` accessible role, label, text, and `data-*` queries in `jsdom` (`src/router/router.test.tsx`, `src/router/RootLayout.test.tsx`, `src/components/domain/Search/**`, `src/views/**`, `tests/journey*Flow.test.tsx`), driving `forbidden-rendertostring` to **0**.
3. **Deterministic Split Vitest Projects (`AUD-143`, `DEC-R055`):**
   - Partitioned `vite.config.ts` into `unit:node` (`**/*.test.ts`, `environment: 'node'`) for pure logic/services/stores/pipeline suites and `unit:dom` (`**/*.test.tsx`, `environment: 'jsdom'`) for React components/hooks/views/3D scene-graph suites, eliminating every per-file `@vitest-environment` pragma across `src/` and `tests/`.
4. **Zero Console/Runner Warning Suite & `@react-three/test-renderer` (`AUD-144`, `DEC-R057`):**
   - Installed `@react-three/test-renderer@^9.1.1` as a `devDependency` and migrated all 39 3D R3F canvas unit suites in `src/components/canvas/**` to `ReactThreeTestRenderer.create(...)`, eliminating React 19 DOM lowercase tag/prop warnings (`<ambientLight />`, `<mesh />`, `frustumCulled`) alongside `renderToString`.
   - Configured exact-boundary regex `/^three$/` ESM aliasing, `resolve.dedupe`, and `server.deps.inline` across `vite.config.ts` (`unit:node` + `unit:dom`) plus `IS_REACT_ACT_ENVIRONMENT = true` and `act()` wrapping in `tests/setup.ts`, driving `act()` warnings, duplicate Three.js instance warnings, and `THREE_CJS_DEPRECATED` warnings to **0**.
5. **Typed Mocks, Behavioural Store Assertions & Zero `react(globals)` (`AUD-145`):**
   - Replaced `toBeDefined()`-only smoke tests in `src/stores/*.test.ts` with behavioural state mutation, clamping, persistence, and reset assertions; replaced `as any` mocks with explicit TypeScript interfaces; and eliminated all `react(globals)` lint warnings in tests (`0` in `scripts/guards/baseline.json`).

---

## 2. Three-Auditor Gate Summary

| Auditor | Subagent ID (`flash`) | Verdict | Key Evidence |
|---|---|---|---|
| **Auditor A** (`verification-auditor`) | `627a8bcc-173d-4422-999f-aef5a6036a6e` | **VERIFIED (6/6)** | Independently inspected all 6 owned findings (`AUD-140`..`AUD-145`) against `vite.config.ts`, `tests/setup.ts`, `scripts/guards/baseline.json`, and colocated test suites across `src/**` and `tests/**`. Zero `Partial` or `Not fixed` findings. |
| **Auditor B** (`regression-auditor`) | `00dea39b-acb9-40c8-becf-b6d3196fb0b7` | **PASS** | Verified 33/33 active Playwright E2E specs across 9 files (0 skipped, 0 fixme), all URL grammar contracts (`DEC-R014a`–`l`), coverage strengthening across all 4 metrics (`85.32%` L / `84.56%` S / `74.19%` B / `89.08%` F), frame-time budgets, and 30 multi-viewport renders. |
| **Auditor C** (`new-debt-auditor`) | `9bdab444-ed92-46f1-8bd2-3014c63eb942` | **PASS** | Applied `code-review` skill to full `main...HEAD` diff: zero unratified production edits, zero `as any` casts, zero `renderToString` or `.innerHTML` assertions, strict `tests/` purity (`DEC-R056`), clean `ReactThreeTestRenderer` unmount lifecycles, and strictly downward baseline ratchet. |

---

## 3. Per-ID Verification Matrix (`AUD-140` … `AUD-145`)

| ID | Finding | Implementation Evidence | Test & Guard Proof | Verdict |
|---|---|---|---|---|
| `AUD-140` | `tests/searchService.test.ts` (1,739 lines) catch-all with `innerHTML` substring assertions | `tests/searchService.test.ts` deleted; split into `src/services/searchService.test.ts:1-222`, `src/services/searchServiceEdgeCases.test.ts`, `src/components/domain/Search/searchHelpers.test.ts:1-224`, `src/components/domain/Search/searchStoreSync.test.ts:1-156`, `src/components/domain/Search/SearchRoot/SearchRoot.test.tsx:51-90`, and `src/components/domain/SearchResultItem/SearchResultItem.test.tsx:51-73` | `npm run test:coverage` (`232/232` files), `audit:ui` (`forbidden-rendertostring` = 0), zero `.innerHTML` assertions | **VERIFIED** |
| `AUD-141` | `tests/router.test.ts` uses `renderHtml` → `toContain` | `tests/router.test.ts` deleted; replaced by `src/router/router.test.tsx:1-210` and `src/router/RootLayout.test.tsx:29-51` using `@testing-library/react` (`render`, `screen.getByRole`, `screen.getByLabelText`, `screen.getByTestId`) | `src/router/router.test.tsx:183-195`, `audit:ui` (`forbidden-rendertostring` = 0) | **VERIFIED** |
| `AUD-142` | No colocated 1:1 tests for views, `components/search/**`, `journeyService`, `guideService`, `layerCardService`, `details/*`, `nomenclature` | 1:1 colocated suites created across all 24 `src/views/*.test.ts(x)` modules, `src/components/domain/Search/**/*.test.ts(x)`, `src/services/{journeyService,guideService,layerCardService,detailsService}.test.ts`, `src/services/details/*.test.ts`, and `src/utils/nomenclature.test.ts:1-188` | `npm run test:coverage` (Lines `85.32%`, Functions `89.08%`) | **VERIFIED** |
| `AUD-143` | Unit test environment defaults to `node` | `vite.config.ts:106-148` configures split `unit:node` (`include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'content/**/*.test.ts']`, `environment: 'node'`) and `unit:dom` (`include: ['src/**/*.test.tsx', 'tests/**/*.test.tsx']`, `environment: 'jsdom'`) per `DEC-R055`; zero `@vitest-environment` pragmas remain | `npm run test` executes both `unit:node` and `unit:dom` cleanly | **VERIFIED** |
| `AUD-144` | `act()` warnings and duplicate Three.js instance / CJS deprecation warnings in every suite | `vite.config.ts:22-58,115-145` (`find: /^three$/` ESM alias, `resolve.dedupe`, `server.deps.inline`), `tests/setup.ts:4-18` (`IS_REACT_ACT_ENVIRONMENT = true`, `jsdom` canvas stub), and `@react-three/test-renderer` across `src/components/canvas/**/*.test.tsx` (`DEC-R057`) | `npm run test:coverage` (`232/232` suites, **0 runner/console warnings**) | **VERIFIED** |
| `AUD-145` | `toBeDefined()`-only smoke tests; `as any` mocks; `react(globals)` lint warnings in tests | Behavioural store suites in `src/stores/{useSettingsStore,useUIStore,useCameraStore,useCanvasStageStore,useActiveStarsStore}.test.ts`; typed mocks across `src/` & `tests/`; `renderHook` in `src/hooks/*.test.tsx` | `npm run lint` & `audit:guards` (`react(globals)` = **0**, `forbidden-rendertostring` = **0**) | **VERIFIED** |

---

## 4. Quality, Guard Baseline, E2E & Performance Telemetry

### 4.1 Automated Quality Suite
- `npm run lint`: **PASS** (0 errors; `oxlint` warnings reduced from `103` → `66`; **0 `react(globals)`**).
- `npm run typecheck`: **PASS** (`tsc -b` — 0 diagnostics).
- `npm run audit:ui`: **PASS** (**0 violations** across the entire repository; `forbidden-rendertostring` reduced `23` → **0**).
- `npm run audit:r3f`: **PASS** (0 violations).
- `npm run audit:guards`: **PASS** (`scripts/guards/baseline.json` ratcheted downward from **161 → 112 entries** and **227 → 167 violation instances**, net **-49 entries / -60 violations**, 0 increases).
- `npm run test:coverage`: **PASS** (**232 / 232 files**, **1,512 / 1,512 tests**, **0 runner warnings**):
  - Lines: **85.32%** (`10,526 / 12,336`, threshold ≥ 78% — up from `83.44%` in T08)
  - Statements: **84.56%** (`11,173 / 13,213`, threshold ≥ 78% — up from `82.73%` in T08)
  - Functions: **89.08%** (`1,772 / 1,989`, threshold ≥ 78% — up from `87.88%` in T08)
  - Branches: **74.19%** (`9,141 / 12,320`, threshold ≥ 70% — up from `73.14%` in T08)
- `npm run build`: **PASS** (clean production bundle).
- `npm run build-storybook`: **PASS** (clean static Storybook build → `/tmp/starmap-storybook-static`).

### 4.2 Playwright E2E Suite & Frame-Time Telemetry
- Full E2E suite (`npm run test:e2e`): **33 / 33 active specs passed** (0 failed, 0 skipped, 0 fixme) across all 9 Playwright spec files (`url-contracts.spec.ts`, `search-typing.spec.ts`, `click-freeze-regression.spec.ts`, `frame-time-baseline.spec.ts`, `canvas-interaction-and-fps.spec.ts`, `journey-1-reader-flow.spec.ts`, `journey-2-author-flow.spec.ts`, `journey-3-explorer-flow.spec.ts`, `journey-5-transit-planner-flow.spec.ts`).
- Frame-time telemetry passed comfortably within the `+25%` p95 ceiling against `scripts/guards/frame-time-baseline.json` across `/galaxy`, `/system/sol`, and `/planet/earth`, and met the live orbit drag `> 10 FPS` invariant under headless software WebGL.

### 4.3 Multi-Viewport Capture Findings (`scripts/capture-views.ts`)
Captured **30 live Playwright screenshots** (6 routes × 5 standard viewports: `390×844`, `768×1024`, `1024×768`, `1440×900`, `2560×1440`) across `/galaxy?focus=sol`, `/system/sol`, `/planet/earth`, `/galaxy?route=sol,tau-ceti`, `/galaxy?layer=project-hail-mary:tau-ceti`, and `/guide/star-types`. Zero blank canvases, missing panels, layout overflows, or error boundaries observed.

---

## 5. Orchestrator Spot-Verification Log (`DEC-R007`)

Per `verification-protocol.md` §2.4 (`DEC-R007`), the Orchestrator directly spot-verified **6 of 6** owned findings (`100%` coverage) against disk source before flipping any ledger status:
- Directly inspected `vite.config.ts`, `tests/setup.ts`, `src/services/searchService.test.ts`, `src/components/domain/SearchResultItem/SearchResultItem.test.tsx`, `src/router/router.test.tsx`, `src/stores/useSettingsStore.test.ts`, `src/components/canvas/entity/PlanetBody.test.tsx`, `src/utils/nomenclature.test.ts`, and all 453 lines of `scripts/guards/baseline.json` (`0` `forbidden-rendertostring`, `0` `react(globals)`, `0` deleted `tests/*` entries).
- **False-verdict rate:** **`0 / 6` (`0.0%`)**.

---

## 6. Final Ledger Delta

All 6 Track T09 rows in `conductor/initiatives/architecture-remediation/findings-ledger.md` transitioned from `claimed` → `verified`:
- `AUD-140`: `claimed` → `verified`
- `AUD-141`: `claimed` → `verified`
- `AUD-142`: `claimed` → `verified`
- `AUD-143`: `claimed` → `verified`
- `AUD-144`: `claimed` → `verified`
- `AUD-145`: `claimed` → `verified`

---

## 7. Manual Smoke Checklist (LAN: `http://192.168.1.124:5173`)

Run over LAN (`http://192.168.1.124:5173`) on desktop **and** a phone before merging Track T09's PR.

### Baseline (every track)

**Galaxy (`/galaxy`)**
- [ ] Map renders with grid, rings and star reticles; no console errors.
- [ ] Orbit, pan and zoom feel smooth; no frame hitches when hovering reticles.
- [ ] Clicking a star selects it (reticle state + details panel) without a camera jump.
- [ ] Hover labels appear without flicker or position jumps.
- [ ] Browser back/forward restores the previous selection and focus.
- [ ] Refreshing a `/galaxy?focus=<id>&select=<id>` URL restores the same state.

**System (`/system/<id>`) and Planet (`/planet/<id>`)**
- [ ] Navigating galaxy → system → planet and back works; the camera frames the target each time.
- [ ] Orbits and bodies render; the bodies panel lists the expected planets.
- [ ] Details panel telemetry matches the selected body.
- [ ] Refreshing a deep link restores the same view and focus.

**Search (`/search` and the docked search)**
- [ ] Typing shows results without input lag or lost characters.
- [ ] Choosing a result focuses it on the map and updates the URL.
- [ ] Clicking outside dismisses the panel without click-through to the canvas.

**Guide (`/guide/*`)**
- [ ] Star types, planet types, metrics and hazards list and detail pages render.
- [ ] Metric comparison from a focused entity (`?focus=`) shows that entity's values.

**Directions / journeys**
- [ ] A two-point route can be planned; propulsion options and figures appear.

**Layers**
- [ ] Toggling a canon/overlay layer shows its entities; layer cards step through items.

**Mobile**
- [ ] Detent sheet drags between levels; panels do not overlap the canvas controls.
- [ ] No pull-to-refresh or tap-flash on canvas interaction.

### Track T09 Specific Additions (from Regression Audit §6)

- [ ] **Dual-Environment Test Execution (`AUD-143`, `AUD-144`, `DEC-R055`):** Run `npm run test` locally over the CLI and verify that both `unit:node` and `unit:dom` projects report clean execution with zero runner warnings, unhandled rejections, or terminal hanging.
- [ ] **Zero Dev Console Noise on Canvas Navigation (`AUD-144`):** Open DevTools console on LAN (`http://192.168.1.124:5173/galaxy`), navigate between `/galaxy?focus=sol`, `/system/sol`, and `/planet/earth`, and confirm zero React `act()` warnings, Three.js duplicate instance warnings, or CJS deprecation warnings appear in browser DevTools (checking that the `/^three$/` ESM alias in `vite.config.ts` behaves identically in browser dev mode).
- [ ] **Search & Details DOM Interaction (`AUD-140`, `AUD-142`):** Perform an interactive search for `Tau Ceti` on desktop and mobile, click the result, and verify that the Details panel detent sheet expands smoothly to `partial` and `full` without layout hitches or frozen inputs.
