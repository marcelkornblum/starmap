# Implementation Plan: Telemetry Container & Panels

> Task text below is historical; the shipped components are named `DetailsPanel` (for `SystemInformationPanel`) and `BodiesPanel scope="galaxy"` (for `SecondaryObjectsPane`).

## Phase 1: Foundational Elements (Heading Primitive & Persistent Dock)
- [x] Task: Write unit tests for `Heading` typographic primitive (`src/components/interface/information/Heading`) supporting eyebrow, title, and subtitle slots with zero outer margins and semantic tokens. — shipped as `src/components/interface/information/Heading/Heading.test.tsx`
- [x] Task: Implement `Heading` primitive and configure Storybook story in `src/components/interface/information/Heading/Heading.stories.tsx`. — shipped as `src/components/interface/information/Heading/`
- [ ] Task: Write unit tests for persistent `Dock` navigation component (`src/components/interface/surfaces/Dock`) supporting Map vs Encyclopedia modes and search trigger. — `Dock` primitive and its tests exist but it is mounted nowhere (only `src/prototypes/PaletteShowcase`); → backlog "Dock: wire or delete"
- [ ] Task: Refactor `Dock` component to remove positioning assumptions and integrate mode switching state with TanStack Router. — not shipped; → backlog "Dock: wire or delete"
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: System Information Panel (Tiers 1, 2, and 3)
- [x] Task: Write unit tests for `SystemInformationPanel` covering detent states (Peek, Partial, Full) and mobile drag affordance. — shipped as `src/components/domain/DetailsPanel/DetailsPanel.test.tsx` and `src/components/interface/surfaces/DetentSheet/` (drag handle)
- [ ] Task: Implement Tier 1 (Peek Detent): Header, stellar-only facet reticle with tooltip, spectral class badge, planetary summary strip with per-symbol tooltips. Verify no anchor-dependent metrics. — partially shipped in `src/components/domain/DetailsPanel/` (`DetailsIdentityHeader`, spectral badge, planetary summary strip); per-symbol `<Tooltip>` not shipped → backlog "Details panel polish"
- [ ] Task: Implement Tier 2 (Partial Detent): Encyclopaedic narrative blocks (physical character, exoplanetary architecture, pop culture references heading) and prominent CTA container with extensible action slots. — superseded: shipped as the `DetailsPanel` partial detent with a Details / Centre / Directions CTA group (`DetailsActionControls.tsx`) and canon references via `LayerCard`; conditional `Centre` → `camera-choreography_20261117`
- [ ] Task: Implement Tier 3 (Full Detent): Vertical orbital schematic ordered by semi-major axis (host star, CHZ bounds bracket, exoplanet items, asteroid/debris disks) with accordion disclosure. — schematic shipped as `src/components/domain/OrbitalSchematicPanel/` (orbit-ordered ladder incl. belts and disks); accordion disclosure not shipped → backlog "Details panel polish"
- [ ] Task: Implement Tier 3 Encyclopedia linkage `(i)` triggers and pinned attribution/astrometry footer (coordinates and external authority links). — encyclopedia deep-links shipped via `CelestialBadge` / `SpectralBadge` / `Unit` links and astrometry in `DetailsAstrometrySection.tsx`; pinned attribution footer not shipped → merged into backlog `FS-019`
- [x] Task: Configure comprehensive Storybook stories for `SystemInformationPanel` in `src/components/interface/information/SystemInformationPanel/SystemInformationPanel.stories.tsx`. — shipped as `src/components/domain/DetailsPanel/DetailsPanel.stories.tsx` and `OrbitalSchematicPanel.stories.tsx` (domain, not `interface/`, per the layering guard)
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Secondary Objects Pane & 3D Starfield Sync
- [x] Task: Write unit tests for `SecondaryObjectsPane` covering 2D list rendering and selection state. — shipped as `src/components/domain/BodiesPanel/BodiesPanel.test.tsx`
- [x] Task: Implement `SecondaryObjectsPane` with bi-directional 2D list ↔ 3D starfield reticle synchronisation (hover and selection). — shipped as `src/components/domain/BodiesPanel/` (`scope="galaxy"`, `store.setHovered` sync, DEC-034)
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Closure Note (2026-11-17)

Archived as complete (decision T6b of the Conductor registry tidy, `chore/tracks-registry-tidy`): roughly two-thirds of the scope shipped under different names during Journeys 1–5 and remediation. Quality Check and Phase Verification lines are left unticked: the shipped work was verified in the tracks that delivered it. Residuals and where they went:

| Residual | Destination |
|---|---|
| Per-symbol `<Tooltip>` in the planetary summary strip | [Backlog](../../../backlog.md) — "Details panel polish" |
| Accordion disclosure in the orbital schematic | [Backlog](../../../backlog.md) — "Details panel polish" |
| Pinned attribution footer with NASA / SIMBAD / Gaia / Wikipedia links | Merged into [Backlog](../../../backlog.md) `FS-019` |
| `Dock` wiring (Map vs Encyclopedia modes, search trigger) | [Backlog](../../../backlog.md) — "Dock: wire or delete" |
| Conditional `Centre` CTA (`FS-013`) | New track [`camera-choreography_20261117`](../../../tracks/camera-choreography_20261117/index.md) |
| `Enter System →` CTA and pop-culture heading | Superseded by the shipped CTA group and `LayerCard` canon; no residual |
