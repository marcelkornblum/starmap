# Implementation Plan: Prodigy Bio-Glass Visual Richness & Cartographic Instrument Alignment

## Phase 1: Prodigy Surface, Bevel, Stage & Semantic Accent Tokens
- [ ] **Task 1.1: Reconnect Directional Slab Gradients & Dual-Edge Specular Bevels** (`src/styles/tokens/palettes.css`, `src/styles/tokens/semantic.css`, token unit tests)
- [ ] **Task 1.2: Calibrate `--status-nominal` Bio-Jade & Narrow `tier1` Stage Override** (`src/styles/tokens/semantic.css`, `paletteTheme.test.ts`)
- [ ] **Task 1.3: Phase 1 Checkpoint** (Run `standards`, `lint`, `typecheck`, `audit:ui`, and token tests)

## Phase 2: Tactile Controls, Specular Sheets, Cushion Blocks & Locus Accents
- [ ] **Task 2.1: Tier 1 `<Button>` Directional Gradients, Elevation, Primary CTA & Selected Bio-Jade States** (`Button.module.css`, `Button.stories.tsx`, `Button.test.tsx`)
- [ ] **Task 2.2: Inset Bevels & Active Glows on `<Input>`, `<Select>`, `<Toggle>` & `<Slider>`** (`Input.module.css`, `Select.module.css`, `Toggle.module.css`, `Slider.module.css`)
- [ ] **Task 2.3: Specular `DetentSheet`, Selected `Block` Border, Recessed `PreviewPanel` & `Breadcrumbs` Locus Accent** (`DetentSheet.module.css`, `Block.module.css`, `PreviewPanel.module.css`, `Breadcrumbs.module.css`)
- [ ] **Task 2.4: Phase 2 Checkpoint** (Run `standards`, `lint`, `typecheck`, `audit:ui`, `audit:guards`, and component tests)

## Phase 3: 3D Cartographic Instrument & Footprint Bio-Jade Alignment
- [ ] **Task 3.1: Calibrate `--chrome-*` Cartographic Instrument Tokens & `threeTokenDefaults`** (`src/styles/tokens/semantic.css`, `src/utils/threeTokenDefaults.ts`, `threeTokenDefaults.test.ts`)
- [ ] **Task 3.2: Bio-Jade Datum Footprint Rim Shader & Line Contrast Tuning** (`src/components/canvas/cartography/planarGridGeometry.ts`, `planarGridGeometry.test.ts`)
- [ ] **Task 3.3: Phase 3 Checkpoint** (Run `standards`, `lint`, `typecheck`, `audit:r3f`, `audit:guards`, and canvas unit tests)

## Phase 4: Multi-Viewport Visual Comparison, Quality Gates & Stacked PR Delivery
- [ ] **Task 4.1: Multi-Viewport Playwright Renders & Side-by-Side PoC Comparison** (`npm run capture:views` across mobile, tablet, and desktop routes; update `docs/design/design-system.md` and `CHANGELOG.md`)
- [ ] **Task 4.2: Full Quality Suite, Dual Review & PR Verification** (`lint`, `typecheck`, `audit:guards`, `audit:ui`, `audit:r3f`, `audit:budgets`, `test:coverage`, `build`, `audit:bundle`, Playwright E2E, `code-review`, and `architecture-review`)
