# Implementation Plan: Console UI Shell

> [!CAUTION]
> **CRITICAL AGENT INSTRUCTION:**
> The agent is NOT to be trusted and MUST ask what to do often in order to avoid making mistakes.
> Do NOT invent layout architectures, slot templates, or component designs unilaterally.
> Before writing any code, the agent MUST explicitly ask the user for confirmation and alignment on the exact structure, layout behaviour, and technical contract.

## Phase 1: References & Exploration (Game UIs, Codexes & Infinite Canvas Maps)
- [ ] Task: Research and benchmark game HUDs vs in-game encyclopaedias (Elite Dangerous, Homeworld, Star Citizen, Civilization, Destiny).
- [ ] Task: Research infinite canvas and map navigation patterns (Google Earth, Figma, Apple Maps, SkySafari) across desktop, tablet, and mobile.
- [ ] Task: Document architectural patterns for layout co-presence, split workstations, and detents in `docs/ui-shell-references.md`.
- [ ] Task: Align and confirm the concrete shell layout geometry and component contracts with the user.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Adaptive Console Framework (Overlay vs Docked Workstation)
- [ ] Task: Write unit tests for console shell state machine (Overlay vs Docked mode, mobile detents: Peek / Partial / Full). — not shipped as a shell state machine; detent behaviour is covered by `DetentSheet` tests, Docked mode → backlog
- [x] Task: Implement the Adaptive Console Shell layout container managing canvas bounds and 2D workstation co-presence with zero inline styles. — shipped as `src/components/domain/SpatialShell/` (Overlay layout only; persistent canvas via `RootCanvasHost`, remediation T07); mobile Peek/Partial/Full detents shipped as `src/components/interface/surfaces/DetentSheet/`
- [ ] Task: Implement 3D camera viewport compensation hook synchronising canvas offset and aspect ratio on dock toggle. — **not shipped**; moved to `camera-choreography_20261117`
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Selection-Aware Breadcrumbs & Shell Header
- [x] Task: Write unit tests for `Breadcrumbs` navigation component reflecting active hierarchy and emitting upward navigation. — shipped as `src/components/domain/Breadcrumbs/Breadcrumbs.test.tsx`
- [x] Task: Implement `Breadcrumbs` component and shell top bar with keyboard navigation and active state styling. — shipped as `src/components/domain/Breadcrumbs/` (full component quad)
- [x] Task: Create Storybook story for Breadcrumbs and Shell Header. — shipped as `src/components/domain/Breadcrumbs/Breadcrumbs.stories.tsx`
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Total View Decoupling & Route Integration
- [ ] Task: Wire the Stage 1 ratified scaffolding views into the shell slots (`canvas`, `workspace`, `controls`). — partially shipped: Galaxy/System/Planet views mount `SpatialShell` (slots `canvas`, `breadcrumbs`, `search`, `layerCard`, `primaryFloat`, `detailsPanel`, `directionsPanel`, `preview`, `controls`, `minimap`, `bodies`); Guide/Search views still render their own `<main>` → backlog
- [ ] Task: Strip duplicate root HUD CSS and absolute positioning from all view modules.
- [ ] Task: Verify seamless navigation between Atlas and Encyclopedia routes inside the continuous shell.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Closure Note (2026-11-17)

Archived as complete (decision T6a of the Conductor registry tidy, `chore/tracks-registry-tidy`) because the shell intent was delivered under different names during Journeys 1–5 and the architecture-remediation initiative. Quality Check and Phase Verification lines are left unticked: the shipped work was verified in the tracks that delivered it. Residuals and where they went:

| Residual | Destination |
|---|---|
| 3D camera viewport compensation | New track [`camera-choreography_20261117`](../../../tracks/camera-choreography_20261117/index.md) |
| HUD retraction / snap-back during flight (`FS-012`) | New track [`camera-choreography_20261117`](../../../tracks/camera-choreography_20261117/index.md) |
| Docked mode (split workstation) and its state machine | [Backlog](../../../backlog.md) — "Docked mode" |
| Guide and Search views inside `SpatialShell` | [Backlog](../../../backlog.md) — "Guide/Search views inside SpatialShell" |
| Phase 1 research and `docs/ui-shell-references.md`; shell-wide view-decoupling clean-up and navigation verification (Phase 4 tasks 2–3) | Not pursued — closed with the track (superseded by the shipped `SpatialShell`) |
