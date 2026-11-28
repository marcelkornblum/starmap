# Specification: Prodigy Bio-Glass Visual Richness & Cartographic Instrument Alignment

## Overview
Restores the Prodigy Bio-Glass directional gradients, specular bevels, semantic Bio-Jade status accents, and 3D cartographic instrument hues across Starmap's 2D interface and 3D stage.

Graduates two items from [`conductor/backlog.md`](../../backlog.md): *Button surface depth & subtle gradients* and *3D Cartographic Instrument & Footprint Bio-Jade Alignment*.

## Scope

1. **Surface, Bevel, Stage & Semantic Status Tokens**
   - Bind `--surface-panel-bg` in [`src/styles/tokens/semantic.css`](../../../src/styles/tokens/semantic.css) to the directional slab gradients defined in [`src/styles/tokens/palettes.css`](../../../src/styles/tokens/palettes.css) (`--gradient-surface-slab-dark` and `--gradient-surface-slab-light`), pairing `--surface-panel-shadow` with dual top and left specular rim highlights (`--bevel-top-rim-dark`).
   - Calibrate `--status-nominal` to Prodigy Bio-Jade emerald (`oklch` hue `164`) for dark, light, and AMOLED themes while keeping `--status-neutral` dedicated to low-chroma slate metadata.
   - Use a three-stop abyssal-verdigris radial glow for `--surface-canvas-stage-bg` and scope the `data-device-tier="tier1"` override so low-GPU devices disable `backdrop-filter` blurs while retaining static CSS gradients and inset bevels.

2. **Tactile Controls, Sheets, Cushion Blocks & Locus Accents**
   - Wire Tier 1 [`Button.module.css`](../../../src/components/interface/controls/Button/Button.module.css) (`default`, `primary`, `selected`, `danger`, `:hover`, and `:active`) to `--ui-control-default-bg`, `--ui-control-hover-bg`, `--ui-control-active-bg`, `--ui-control-elevation`, and `--ui-control-depression`.
   - Give `variant="primary"` CTAs a `137deg` Bio-Jade surface gradient, top specular highlight, and tactile drop shadow; tint `selected` workspace and filter controls (`ConsoleDock`, `GuideSectionNav`, `Objects in View`, `StarTypeCombinator`) with `--palette-accent-focus-subtle` and `--state-focus`.
   - Wire `--surface-inset-bevel` into [`Input.module.css`](../../../src/components/interface/controls/Input/Input.module.css) and [`Select.module.css`](../../../src/components/interface/controls/Select/Select.module.css), and `--ui-control-active-glow` into active [`Toggle.module.css`](../../../src/components/interface/controls/Toggle/Toggle.module.css) and [`Slider.module.css`](../../../src/components/interface/controls/Slider/Slider.module.css).
   - Add the `137deg` top-corner specular sheen to [`DetentSheet.module.css`](../../../src/components/interface/surfaces/DetentSheet/DetentSheet.module.css), a `1px` Bio-Jade selection border on [`Block.module.css`](../../../src/components/interface/surfaces/Block/Block.module.css) (`[data-selected='true']`), recessed inset framing on [`PreviewPanel.module.css`](../../../src/components/domain/PreviewPanel/PreviewPanel.module.css), and `--state-focus` current-locus tinting in [`Breadcrumbs.module.css`](../../../src/components/domain/Breadcrumbs/Breadcrumbs.module.css).

3. **3D Cartographic Instrument & Footprint Bio-Jade Alignment**
   - Retarget `--chrome-datum-plane-*`, `--chrome-datum-footprint-*`, `--chrome-range-ring-*`, `--chrome-range-tick-*`, `--chrome-grid-*`, `--chrome-stalk-focused-color`, and `--chrome-orbit-*` in [`src/styles/tokens/semantic.css`](../../../src/styles/tokens/semantic.css) (with matching fallbacks in [`src/utils/threeTokenDefaults.ts`](../../../src/utils/threeTokenDefaults.ts)) to calibrated Bio-Jade and verdigris hues (`oklch` hue `166` to `182`) with higher line contrast across mobile and desktop screens.
   - Update `DATUM_FILL_FRAGMENT_SHADER` in [`src/components/canvas/cartography/planarGridGeometry.ts`](../../../src/components/canvas/cartography/planarGridGeometry.ts) so the datum footprint rim glows in a luminous tint derived from `uColor` rather than mixing toward white.

## Out of Scope
- Post-processing WebGL bloom passes or runtime multi-pass framebuffer effects.
- Restructuring spatial HUD layout, panel placement, or route contracts delivered in [`mobile-ux-and-console-dock_20261127`](../mobile-ux-and-console-dock_20261127/spec.md).

## Acceptance Criteria
- [ ] `--surface-panel-bg`, `--surface-panel-shadow`, `--status-nominal`, and `--surface-canvas-stage-bg` resolve to Prodigy Bio-Glass directional gradients, dual-edge specular bevels, Bio-Jade nominal emerald, and three-stop stage radial glow across dark, light, and AMOLED themes, with `tier1` preserving CSS gradients while disabling `backdrop-filter`.
- [ ] Tier 1 `Button`, `Input`, `Select`, `Toggle`, and `Slider` render directional surface gradients, inset/specular bevels, elevation/depression states, Bio-Jade `primary` CTAs, and Bio-Jade `selected` navigation states without violating coarse-pointer hit targets or WCAG contrast.
- [ ] `DetentSheet`, selected `Block` rows, `PreviewPanel`, `Badge` (`nominal`), `EntityLabel`, and `Breadcrumbs` current locus match the Prodigy Bio-Glass material hierarchy.
- [ ] The 3D cartographic instrument (`PlanarGrid` datum plane and footprint rim, `CoordinateFins`, range rings, ticks, focused stalks, and orbits) renders in calibrated Bio-Jade and verdigris hues with clear line legibility across mobile and desktop viewports.
- [ ] Multi-viewport Playwright renders (`390x844` to `2560x1440`), `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:budgets`, `npm run test:coverage`, and `npm run build` pass with zero errors.
