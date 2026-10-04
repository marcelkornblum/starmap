# Specification: Visual Language Token Layer

> **Status: Stub.** Refine via `conductor-new-track` before implementation.

## Overview
Implements the visual language ratified in the `visual-design-exploration` track at the token layer, so all 2D surfaces inherit the agreed look before any console UI is built.

Sources: `docs/ui-visual-language.md` (authoritative), `docs/ui-paradigm-exploration.md` (Adaptive Hybrid Console geometry rules), `docs/2d-visual-design-notes.md` (materiality and elevation), `docs/design-system.md`.

## Scope

1. **Semantic Channels** (per `ui-visual-language.md`)
   - Hazard: `--hazard-nominal|caution|critical` plus `-surface` washes (nominal = zero chroma).
   - Confidence: `--confidence-confirmed|candidate|theoretical`.
   - Category: `--category-stellar|planetary|minor-body|artificial|deep-sky`.
   - Overlay: `--overlay-luminosity|temperature|velocity|habitability`.
   - Reserved focus: `--state-focus` restricted to waypoints, reticles, focus rings, scrubhead needles.
   - Reconcile with the current `--status-*` / `--category-star|planet|…` tokens in `semantic.css` and `useThreeTokenStore`.
2. **CUBE Exception Interface**
   - `data-hazard`, `data-state` (`passive|active|selected|focused`), `data-pinned`, `data-category`, `data-overlay`; retire `data-status`.
3. **Materiality & Elevation** (per `2d-visual-design-notes.md` / `ui-paradigm-exploration.md`)
   - Graphite micro-matte surface palette for the 8-tier surface stack.
   - Directional top-rim micro-bevel tokens.
   - Selective glass: blur/opacity tokens applied only to transient tiers (tooltip, popover, palette wash); Dock, panels, drawers opaque.
   - Radius zero, hairline divider tokens, monolithic non-nested slab rules.
4. **Resolve OPEN Values** from `ui-paradigm-exploration.md`: palette, luminance gradient, bevel highlight values, grain texture, blur radius/tint — in both Light and Dark themes.
5. **Primitive/Surface Adoption**
   - Existing primitives and surfaces (`Badge`, `Card`, `Panel`, `Dock`, `Hud`, `Well`, overlays) consume the new tokens and exception attributes.
   - Remove `position` declarations from `Dock` / `Hud` (layout owned by composition, per guardrails).
6. **Documentation:** update `docs/design-system.md` to the reconciled vocabulary.

## Open Decisions (require explicit approval — component contract changes)
- `Badge` / `Card` / `Panel` prop changes (`status` → `hazard`; confidence/category value sets).
- Fate of the `amoled` theme value in `useSettingsStore` (no CSS exists).

## Out of Scope
- New HUD components and layout (`console-ui-shell_20261004`).

## Acceptance Criteria
- [ ] All semantic channels defined in both themes; no stale `--status-*` references remain.
- [ ] WebGL token bridge reads the reconciled names.
- [ ] Surfaces render graphite materiality, micro-bevel and selective glass per spec.
- [ ] Storybook shows every primitive/surface in both themes with the new tokens.
- [ ] Zero hardcoded colours, inline styles or component-level positioning.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass.
