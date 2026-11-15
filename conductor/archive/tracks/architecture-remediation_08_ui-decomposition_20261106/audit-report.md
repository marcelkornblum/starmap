# Track T08 Audit Report: View & UI Decomposition

**Initiative:** Architecture Remediation (`architecture-remediation`)  
**Track:** T08 (`architecture-remediation_08_ui-decomposition_20261106`)  
**Branch:** `refactor/arch-remediation-08-ui-decomposition`  
**Date:** 2026-11-14  
**Verdict:** **UNANIMOUS PASS (3-0)**

---

## 1. Executive Summary

Track T08 completes the View & UI Decomposition phase of `architecture-remediation` (`AUD-120` through `AUD-130`) with zero intended behaviour change and net reduction of 116 guard baseline entries (`277` → `161`):

1. **God-Component & View Decomposition (`AUD-120`, `DEC-R053`):**
   - Consolidated `src/components/search/**` into `src/components/domain/Search/` with full 4-file Component Quads (`SearchRoot`, `SearchPanel`, `SearchInput`, `SearchCategoryFilterSelect`, `SearchResults`) and a pure namespace barrel (`src/components/domain/Search/index.ts`), decomposing `SearchRoot` from 774 lines to **186 lines**.
   - Decomposed `GalaxyView.tsx` (750 → **121 lines**), `SystemView.tsx` (580 → **110 lines**), and `PlanetView.tsx` (534 → **108 lines**) into focused view-model, out-of-scope guard, and panel presenter hooks, all strictly ≤ 300 lines.
   - Decomposed `DirectionsPanel.tsx` (525 → **95 lines**) into `DirectionsPeekSection`, `DirectionsPartialSection`, `DirectionsFullSection`, and pure `directionsQuantityHelpers.ts`.
   - Decomposed `CelestialSymbol.tsx` (**125 lines**) into `celestialSymbolMeta.ts`, `celestialSymbolGlyphs.tsx`, and sibling badge components with full 4-file quads.
2. **Design Token Architecture & CUBE CSS Purity (`AUD-121`, `AUD-126`):**
   - Moved component-specific tokens out of global `src/styles/tokens/semantic.css` into scoped `--<component>-*` CSS Module interfaces (`GuideViews.module.css`, `DetentSheet.module.css`, `CelestialSymbol.module.css`, `Button.module.css`, etc.).
   - Tokenised all 220 `hardcoded-css-token` (`px`/`rem`/`rgba`/`ms`) occurrences across 43 CSS Modules and eliminated all 11 `forbidden-outer-margin` declarations (`G-ui` token rules = **0**).
3. **Strict Tier 1 Primitives, Regulated Badges & Composition Lists (`AUD-123`, `AUD-124`, `AUD-125`, `DEC-R050`):**
   - Removed `className` and `style` passthrough across all 38 Tier 1 interface primitives (`BasePrimitiveProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'>`), driving `forbidden-dynamic-classname` to **0** and replacing `.actionButton` CSS overrides in `DirectionsPanel` with native `<Button variant="subtle" size="sm">`.
   - Replaced all raw `<ul>`/`<ol>` lists in domain components and views (`DirectionsPanel`, `SearchResults`, `StarTypesListView`, `PlanetTypesListView`, `HazardsListView`, `MetricsListView`) with `<Stack as="ul" | "ol">` and `<Grid as="ul">` (`forbidden-raw-element` = **0**).
   - Eliminated numeric counts/ratios in `<Badge>`, Unicode `→`/`←` string arrows, and `unit="of N"` pseudo-units across `LayerCard`, `MetricComparativePanel`, `DirectionsPanel`, and `DetailsPanel` (`<Icon direction="left" | "right">`, `<Datum>`, `<Quantity>`, plain step text).
4. **Accessible Single-Anchor Search Row & `DetentSheet` Snap Physics (`AUD-127`, `AUD-128`, `DEC-R051`, `DEC-R052`):**
   - Deleted `anchorRef.current.click()` row emulation in `SearchResultItem.tsx`; suppressed nested `/guide` badge links (`interactive={false}`) and wrapped each search result row in a single native `<a href>`.
   - Refactored `DetentSheet.tsx` and `detentSheetMath.ts` to bind the single sanctioned `--detent-sheet-block-size` custom property (`DEC-R051`), enforcing a 1-row `peek` (`56px`), abutting midpoint snap below `partial` (`45%`), proximity bands + free-rest zone between `partial` and `full`, and a single `@container detent-sheet (min-block-size: 240px)` threshold.
5. **Component Quads, Export Purity & Barrels (`AUD-122`, `AUD-129`, `AUD-130`):**
   - Completed full 4-file Component Quads (`.tsx`, `.module.css`, `.stories.tsx`, `.test.tsx`) across `CelestialBadge`, `SpectralBadge`, `HazardBadge`, `CelestialTitle`, `DetailsPanel`, and `domain/Search/**` (`missing-component-quad` = **0**).
   - Extracted ~60 non-component exports out of `.tsx` component files into pure `.ts` modules (`router/index.ts` + `RootLayout.tsx`, `SpatialEntityContext.ts` + `SpatialEntityProvider.tsx`, `spatialFrameContext.ts`, `sectorPointCloudShaders.ts`, `webglSupport.ts`, `spatialShellHelpers.ts`, `spectralBadgeUtils.ts`, `detentSheetMath.ts`, `searchResultFormatting.ts`), driving `only-export-components` to **0**.
   - Added pure `index.ts` barrels across `SearchResultItem`, `LayerCard`, `Search`, `BodiesPanel`, `Breadcrumbs`, `DetailsPanel`, and all `interface/**` directories.

---

## 2. Three-Auditor Gate Summary

| Auditor | Subagent ID (`flash`) | Verdict | Key Evidence |
|---|---|---|---|
| **Auditor A** (`verification-auditor`) | `5413db15-d396-4072-ad2e-2bf7ce80032b` | **VERIFIED (11/11)** | Inspected all 11 owned findings (`AUD-120`..`AUD-130`) on disk against source files, CSS Modules, quads, barrels, unit tests, and `scripts/guards/baseline.json`. Zero `Partial` or `Not fixed` findings. |
| **Auditor B** (`regression-auditor`) | `5a794202-8149-40af-a764-234569d51040` | **PASS** | Verified 38/38 Playwright E2E specs across 10 files (0 skipped), 1,618/1,618 unit tests across 179 files, coverage thresholds (83.44% L / 82.73% S / 73.14% B / 87.88% F), `-116` baseline ratchet (`277` → `161`), FPS telemetry margins, 30 multi-viewport renders, and uncovered-route audit. |
| **Auditor C** (`new-debt-auditor`) | `b25e09b1-f35a-492b-9c9a-f523b569b1f7` | **PASS** | Applied `code-review` skill to full `origin/main...HEAD` diff: zero `as any` or unsafe casts, zero magic entity literals, zero external `className`/`style` leaks on primitives, all touched UI files ≤ 300 lines, 100% quad/barrel compliance, zero legacy shims. |

---

## 3. Per-ID Verification Matrix (`AUD-120` … `AUD-130`)

| ID | Finding | Implementation Evidence | Test & Guard Proof | Verdict |
|---|---|---|---|---|
| `AUD-120` | God components: `SearchRoot` (774), `GalaxyView` (750), `DirectionsPanel` (525) | `src/components/domain/Search/SearchRoot/SearchRoot.tsx:47-186` (186 L), `src/views/GalaxyView.tsx:27-121` (121 L), `src/views/SystemView.tsx:1-110` (110 L), `src/views/PlanetView.tsx:1-108` (108 L), `src/components/domain/DirectionsPanel/DirectionsPanel.tsx:21-95` (95 L), `src/components/interface/information/CelestialSymbol/CelestialSymbol.tsx:1-125` (125 L) | `SearchRoot.test.tsx:8-28`, `DirectionsPanel.test.tsx:44-60`, `audit:guards` (`G-size` = 0 for `interface`/`domain`/`views`) | **VERIFIED** |
| `AUD-121` | Hardcoded px/rem/rgba/ms in CSS modules | `src/views/GuideViews.module.css:1-461`, `src/components/domain/SpatialShell/SpatialShell.module.css:1-322`, `src/components/interface/surfaces/DetentSheet/DetentSheet.module.css:1-120`, `src/components/interface/information/CelestialSymbol/CelestialSymbol.module.css:1-94` | `audit:ui` & `audit:guards` (`hardcoded-css-token` = 0, `hardcoded-hex-color` = 0, `forbidden-outer-margin` = 0) | **VERIFIED** |
| `AUD-122` | Quad gaps: `CelestialBadge`, `SpectralBadge`, `HazardBadge`, `CelestialTitle`, `DetailsPanel` sub-components, `components/search/**` | 4-file quads in `src/components/interface/information/CelestialSymbol/{CelestialBadge,SpectralBadge,HazardBadge,CelestialTitle}.*`, `src/components/domain/DetailsPanel/*`, and `src/components/domain/Search/{SearchRoot,SearchPanel,SearchInput,SearchCategoryFilterSelect,SearchResults}/*` (`DEC-R053`) | `CelestialBadge.test.tsx:7-36`, `SpectralBadge.test.tsx:23-50`, `HazardBadge.test.tsx:7-59`, `CelestialTitle.test.tsx:7-23`, `DetailsPanel.test.tsx`, `SearchPanel.test.tsx`, `audit:ui` (`missing-component-quad` = 0) | **VERIFIED** |
| `AUD-123` | Raw `<ul>`/`<ol>` lists in domain components and views | `DirectionsPartialSection.tsx:122` (`<Stack as="ul">`), `DirectionsFullSection.tsx:48` (`<Stack as="ol">`), `StarTypesListView.tsx:18` (`<Grid as="ul">`), `SearchResults.tsx:107` (`<Stack as="ul">`) | `DirectionsPanel.test.tsx:44-60`, `SearchResults.test.tsx:9-50`, `audit:ui` (`forbidden-raw-element` = 0) | **VERIFIED** |
| `AUD-124` | Counts/ratios in `<Badge>`, `→`/`←` string arrows, `unit="of 5"` | `LayerCard.tsx:130-132` (plain step span), `LayerCard.tsx:191,201` (`<Icon direction="left" \| "right">`), `MetricComparativePanel.tsx:101-118` (`<Datum>`), `DirectionsPartialSection.tsx:186` & `DirectionsFullSection.tsx:58` (`<Icon direction="right">`) | `tests/layerCardAndExplore.test.tsx:85-105`, `DirectionsPanel.test.tsx:30-60`, `MetricComparativePanel.test.tsx` | **VERIFIED** |
| `AUD-125` | `className` concatenation in primitives; `DirectionsPanel` restyles `<Button>` | `src/components/interface/layouts/types.ts:21-24` (`Omit<..., 'className' \| 'style'>`), `Stack.tsx:21-28`, `Cluster.tsx:23-31`, `Imposter.tsx:23-31`, `DetentSheet.tsx:203`, `Button.tsx:6-13`, `DirectionsPartialSection.tsx:132-146` (`variant="subtle" size="sm"`) | `tests/interfacePrimitives.test.tsx:25-60`, `audit:ui` (`forbidden-dynamic-classname` = 0) | **VERIFIED** |
| `AUD-126` | Component-specific tokens in global `semantic.css` | `src/styles/tokens/semantic.css:102-200` (universal tokens only); component tokens relocated to `GuideViews.module.css:2-28`, `DetentSheet.module.css:1-15`, `CelestialSymbol.module.css:2-6`, `Button.module.css` | `tests/guideViews.test.tsx`, `tests/spatialShell.test.tsx`, `audit:ui` | **VERIFIED** |
| `AUD-127` | Row click emulated via `anchorRef.current.click()` | `src/components/domain/SearchResultItem/SearchResultItem.tsx:37-41,129-144` (`interactive={false}` on secondary badges; single native `<a href>` row wrapper; `anchorRef` deleted per `DEC-R052`) | `SearchResultItem.test.tsx:52-74` (`links.length === 1`), `e2e/search-typing.spec.ts` | **VERIFIED** |
| `AUD-128` | `DetentSheet` writes `style.setProperty` through a ref | `src/components/interface/surfaces/DetentSheet/DetentSheet.tsx:65,111,137` (`--detent-sheet-block-size` per `DEC-R051`), `detentSheetMath.ts:43-138` (abutting midpoint snap + free-rest zone), `DetentSheet.module.css:103-112` (`@container detent-sheet`) | `DetentSheet.test.tsx:12-64,127-143`, `scripts/audit-ui.test.ts` | **VERIFIED** |
| `AUD-129` | ~60 non-component exports from component files | Pure `.ts` extractions: `router/index.ts` + `RootLayout.tsx`, `SpatialEntityContext.ts` + `SpatialEntityProvider.tsx`, `spatialFrameContext.ts`, `sectorPointCloudShaders.ts`, `webglSupport.ts`, `spatialShellHelpers.ts`, `spectralBadgeUtils.ts:1-6`, `detentSheetMath.ts`, `searchResultFormatting.ts`, `directionsQuantityHelpers.ts` | `npm run lint` & `audit:guards` (`only-export-components` = 0) | **VERIFIED** |
| `AUD-130` | Missing `index.ts` barrels (`SearchResultItem`, `LayerCard`) | `src/components/domain/SearchResultItem/index.ts:1-5`, `src/components/domain/LayerCard/index.ts:1`, `src/components/domain/Search/index.ts:1-57`, `BodiesPanel/index.ts`, `Breadcrumbs/index.ts`, `DetailsPanel/index.ts` | `src/components/domain/index.ts:1-108`, `npm run typecheck`, `npm run build` | **VERIFIED** |

---

## 4. Quality, Guard Baseline, E2E & Performance Telemetry

### 4.1 Automated Quality Suite
- `npm run lint`: **PASS** (0 errors, 103 baselined warnings; 0 `only-export-components`, 0 `exhaustive-deps`).
- `npm run typecheck`: **PASS** (`tsc -b` — 0 diagnostics).
- `npm run audit:ui`: **PASS** (0 T08 UI violations; only 23 baselined `AUD-004` `forbidden-rendertostring` test-suite entries owned by T09 remain).
- `npm run audit:r3f`: **PASS** (0 violations).
- `npm run audit:guards`: **PASS** (`scripts/guards/baseline.json` ratcheted downward from **277 → 161 entries**, net **-116 debt entries**, 0 increases).
- `npm run test:coverage`: **PASS** (**179 / 179 files**, **1,618 / 1,618 tests**):
  - Lines: **83.44%** (`10,301 / 12,345`, threshold ≥ 78%)
  - Statements: **82.73%** (`10,939 / 13,222`, threshold ≥ 78%)
  - Functions: **87.88%** (`1,748 / 1,989`, threshold ≥ 78%)
  - Branches: **73.14%** (`9,012 / 12,320`, threshold ≥ 70%)
- `npm run build`: **PASS** (`2.51s` Vite production bundle).
- `npm run build-storybook`: **PASS** (`14.73s` → `/tmp/starmap-storybook-static`).

### 4.2 Playwright E2E Suite & Frame-Time Telemetry
- Full E2E suite (`npm run test:e2e`): **38 / 38 passed** across all 10 spec files (`url-contracts.spec.ts`, `search-typing.spec.ts`, `canvas-interaction-and-fps.spec.ts`, `click-freeze-regression.spec.ts`, `frame-time-baseline.spec.ts`, `journey-1-reader-flow.spec.ts` … `journey-5-transit-planner-flow.spec.ts`).
- Headless SwiftShader WebGL FPS telemetry vs. `scripts/guards/frame-time-baseline.json`:
  - `/galaxy` drag: **37.5 FPS** (well above baseline)
  - `/system/sol` drag: **32.1 FPS**
  - `/planet/earth` drag: **23.7 FPS**
  - Active orbit drag: **31.7 FPS** (mean `31.50ms`, p95 `66.60ms`)

### 4.3 Multi-Viewport Capture Findings (`scripts/capture-views.ts`)
Captured **30 live Playwright screenshots** (6 routes × 5 standard viewports: `390×844`, `768×1024`, `1024×768`, `1440×900`, `2560×1440`) across `/galaxy?focus=sol`, `/system/sol`, `/planet/earth`, `/galaxy?route=sol,tau-ceti`, `/galaxy?layer=project-hail-mary:tau-ceti`, and `/guide/star-types`. Zero blank canvases, missing panels, overflow collisions, or error boundaries observed.

---

## 5. Orchestrator Spot-Verification Log (`DEC-R007`)

Per `verification-protocol.md` §2.4 (`DEC-R007`), the Orchestrator directly spot-verified **11 of 11** owned findings (`100%` coverage across High/Medium/Low rows) against disk source before flipping any ledger status:
- Directly inspected `DetentSheet.tsx`, `DetentSheet.module.css`, `detentSheetMath.ts`, `SearchResultItem.tsx`, `SearchResults.tsx`, `SearchResults.module.css`, `DirectionsPanel.tsx`, `DirectionsPartialSection.tsx`, `LayerCard.tsx`, `MetricComparativePanel.tsx`, `GalaxyView.tsx`, `StarTypesListView.tsx`, `semantic.css`, `layouts/types.ts`, `Stack.tsx`, `spectralBadgeUtils.ts`, `router/index.ts`, and `router/RootLayout.tsx`.
- **False-verdict rate:** **`0 / 11` (`0.0%`)**. *(Note: Auditor A's prose snippet under `AUD-129` formatted `spectralBadgeUtils.ts` as a `function` declaration whereas lines 1–6 on disk declare an arrow `const shouldDisplaySpectralBadge`; the underlying file path, behaviour, and `VERIFIED` finding are exact.)*

---

## 6. Final Ledger Delta

All 11 Track T08 rows in `conductor/initiatives/architecture-remediation/findings-ledger.md` transitioned from `claimed` → `verified`:
- `AUD-120`: `claimed` → `verified`
- `AUD-121`: `claimed` → `verified`
- `AUD-122`: `claimed` → `verified`
- `AUD-123`: `claimed` → `verified`
- `AUD-124`: `claimed` → `verified`
- `AUD-125`: `claimed` → `verified`
- `AUD-126`: `claimed` → `verified`
- `AUD-127`: `claimed` → `verified`
- `AUD-128`: `claimed` → `verified`
- `AUD-129`: `claimed` → `verified`
- `AUD-130`: `claimed` → `verified`

---

## 7. Manual Smoke Checklist (LAN: `http://192.168.1.124:5173`)

Run over LAN (`http://192.168.1.124:5173`) on desktop **and** a phone before merging Track T08's PR.

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

### Track T08 Specific Additions (from Regression Audit §2.2)

- [ ] **Direct `/guide/star-types` List Route (`AUD-123`):** Open `http://192.168.1.124:5173/guide/star-types` directly on desktop and mobile; verify `<Grid as="ul">` renders responsive star-type cards cleanly without outer-margin overflow and links navigate to `/guide/star-types/<slug>`. *(The only route of 13 in `src/router/index.ts` not directly navigated by URL in automated E2E.)*
- [ ] **Mobile `DetentSheet` Asymmetric Snap Physics & 1-Row `peek` (`AUD-128`, `DEC-R051`):** On a phone (< `768px`) at `http://192.168.1.124:5173/galaxy?focus=sol`, verify `peek` shows only the drag handle + 1 heading row (`56px`), releasing between `peek` and `partial` (`45%`) snaps cleanly to the nearer detent (never resting between them), and releasing between `partial`'s upper band and `full`'s lower band rests freely while keeping `partial` + `full` sections visible via the single `@container detent-sheet` threshold.
- [ ] **Single-Anchor `SearchResultItem` Keyboard & Pointer Row Activation (`AUD-127`, `DEC-R052`):** Type `"Tau Ceti"` into search, press `Tab` into the results list, verify each result row receives a single focus stop (spectral/reticle badges are non-interactive and do not steal focus or navigate to `/guide/*`), and press `Enter` or click anywhere on the row to select the target.
