# Implementation Plan: Visual Design & 3D Cartography

## Phase 1: 3D Visual Language & Cartography
- [x] Task: Define the visual representation of celestial nodes (stars, spectral grading, remnants, planetary bodies) in 3D space.
- [x] Task: Define coordinate graticules, reference planes, parsec range rings, and declination drop stems.
- [x] Task: Define Keplerian orbit line styling, inclination cues, and directional trails (Finesse deferred to backlog).
- [x] Task: Define decluttering and Level of Detail (LOD) thresholds across Galaxy, System, and Planet views.
- [x] Task: Create `docs/3d-spatial-architecture.md` capturing finalized architectural decisions (with `docs/3d-visual-design-notes.md` retained as exploration scratchpad).
- [ ] Task: Phase Verification & Checkpoint (Halt for User Review).

## Phase 2: Three.js Token Synchronisation Architecture
- [x] Task: Design and document the bridge pattern for reading CSS custom properties from the DOM and synchronising them into Three.js materials, uniforms, and scene lighting.
- [x] Task: Document reactivity and re-render lifecycle for theme toggling (Light/Dark mode) in WebGL.
- [ ] Task: Phase Verification & Checkpoint (Halt for User Review).

## Phase 3: UI Visual Language & Token Semantics
- [ ] Task: Define visual representation rules for telemetry status (`--status-*`), observational confidence (`--confidence-*`), and astronomical domains (`--category-*`).
- [ ] Task: Define tabular data presentation rules, unit formatting, and monospace tabular alignments.
- [ ] Task: Document component-level CUBE exception patterns using HTML `data-*` attributes without class concatenation.
- [ ] Task: Create `docs/ui-visual-language.md` capturing these rules.
- [ ] Task: Phase Verification & Checkpoint (Halt for User Review).

## Phase 4: User Journeys & Overall Features
- [ ] Task: Map primary user journeys across scales (Galaxy macro navigation -> Stellar system targeting -> Planetary inspection).
- [ ] Task: Define contextual controls, navigation transitions, and breadcrumb/orientation flows.
  - *Note for Interaction Mode Discussion:* Resolve camera coupling implementation (dolly vs coordinate rescaling / fixed camera distance with variable aperture radius) and its impact on navigation dynamics.
- [ ] Task: Create dummy data fixtures (`tests/fixtures/system.fixture.json` and `tests/fixtures/planet.fixture.json`) supporting these journeys.
- [ ] Task: Phase Verification & Checkpoint (Halt for User Review).

## Phase 5: Storybook Prototyping & Interface Execution
- [ ] Task: Build isolated 3D component prototypes in Storybook (`<SchematicStar>`, `<OrbitalRing>`, `<CartographicGrid>`).
- [ ] Task: Connect 3D prototypes to the token synchronisation bridge to verify live theme toggling.
- [ ] Task: Implement the Adaptive Telemetry Container and Dock components in Storybook, testing mobile detents and wide multi-bay expansions.
- [ ] Task: Phase Verification & Checkpoint (Final Track Review & PR).
