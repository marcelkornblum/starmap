# Implementation Plan: Prodigy Bio-Glass Visual Richness & Cartographic Instrument Alignment

## Phase 1: Prodigy Surface, Bevel, Stage & Semantic Accent Tokens
- [x] **Task 1.1: Reconnect Directional Slab Gradients & Dual-Edge Specular Bevels** — Connected `--surface-panel-bg` to `--gradient-surface-slab-*`, added `--gradient-control-primary-*` and `--bevel-control-primary-*` in `palettes.css` & `semantic.css`, and switched `FullAssembly` / `StorybookCanvasWrapper` to `background: var(--surface-panel-bg)`.
- [x] **Task 1.2: Calibrate `--status-nominal` Bio-Jade & Narrow `tier1` Stage Override** — Calibrated `--status-nominal` (`hue 164`) distinct from decoupled `--status-neutral` (`hue 198`), bound unselected `EntityLabel` tokens to `--status-neutral`, added `[data-theme="amoled"]`, and scoped `tier1` to disable `backdrop-filter` while retaining directional gradients and stage glow.
- [x] **Task 1.3: Phase 1 Checkpoint** — Verified `paletteTheme.test.ts` (`14/14`), `audit:ui`, `lint`, and `typecheck`.

## Phase 2: Tactile Controls, Specular Sheets, Cushion Blocks & Locus Accents
- [x] **Task 2.1: Tier 1 `<Button>` Directional Gradients, Elevation, Primary CTA & Selected Bio-Jade States** — Wired `Button.module.css` (`default`, `primary`, `subtle`, `danger`, `selected`, `:hover`, `:active`) to `--ui-control-*` directional gradients, specular elevation, press depression, and calm Bio-Jade `selected` tokens; added `SemanticRoles` story and tests.
- [x] **Task 2.2: Inset Bevels & Active Glows on `<Input>`, `<Select>`, `<Toggle>` & `<Slider>`** — Connected `--surface-inset-bevel` across `Input`, `Select`, `Slider` tracks, and focused `.searchRegion`, and wired `--ui-control-active-glow` on checked `Toggle` and `Slider` thumbs.
- [x] **Task 2.3: Specular `DetentSheet`, Selected `Block` Border, Recessed `PreviewPanel` & `Breadcrumbs` Locus Accent** — Applied `--surface-panel-sheen` across `Panel`, `DetentSheet`, and `SpatialShell` Bio-Glass regions; added `1px` Bio-Jade border on `Block[data-selected="true"]`; framed `PreviewPanel` as a recessed inset well; and tinted `Breadcrumbs` `[aria-current="page"]` with `--state-focus`.
- [x] **Task 2.4: Phase 2 Checkpoint** — Verified `9/9` component test suites (`93/93` tests), `audit:ui`, `lint`, and `typecheck`.

## Phase 3: 3D Cartographic Instrument & Footprint Bio-Jade Alignment
- [x] **Task 3.1: Calibrate `--chrome-*` Cartographic Instrument Tokens & `threeTokenDefaults`** — Aligned `createDefaultTokenSnapshot` (`dark`, `light`, `amoled`) in `threeTokenDefaults.ts` with Prodigy Bio-Jade and verdigris tokens and verified green-channel dominance in `useThreeTokenStore.test.tsx` and `extractThreeTokens.test.ts`.
- [x] **Task 3.2: Bio-Jade Datum Footprint Rim Shader & Line Contrast Tuning** — Replaced white `vec3(1.0)` rim bleaching in `DATUM_FILL_FRAGMENT_SHADER` (`planarGridGeometry.ts`) with a `uColor`-derived Bio-Jade highlight and bound `PlanarGrid` primary footprint material to `stateFocus` and `footprintFocusedAlpha`.
- [x] **Task 3.3: Phase 3 Checkpoint** — Verified `8/8` canvas/token suites (`61/61` tests), `audit:r3f`, `audit:guards`, and `lint`.

## Phase 4: Multi-Viewport Visual Comparison, Quality Gates & Stacked PR Delivery
- [x] **Task 4.1: Multi-Viewport Playwright Renders & Side-by-Side PoC Comparison** — Captured 30 Playwright renders across 6 routes × 5 viewports and updated `docs/design/design-system.md` and `CHANGELOG.md`.
- [x] **Task 4.2: Full Quality Suite, Dual Review & PR Verification** — Passed `lint`, `typecheck`, `audit:guards`, `audit:ui`, `audit:r3f`, `audit:budgets`, `test:coverage`, `build`, `audit:bundle`, Playwright E2E, `code-review`, and `architecture-review`.

## Phase 5: Conductor Review Fixes
- [x] **Task 5.1: Resolve Code & Architecture Review Findings** — Removed direct `--palette-*` focus-halo override in `SpatialShell.module.css`; restored `box-shadow: none` and `--ui-control-subtle` on the 2 px `<Slider>` track; added relative-OKLCH critical focus halos on errored `<Input>` and `<Select>` controls; layered `Panel` `.header`/`.body`/`.footer` above `.panel::before`; styled `[data-focused="true"]` and hover specificity on `<Block>` while decoupling `selected` vs `data-focused` in `BodiesPanel` rows; and pruned unused `--ui-control-active-bg`.
