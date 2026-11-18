# Implementation Plan: 3D Engine Implementation

## Phase 1: Camera & Core Optimization
- [x] Task: Resolve camera coupling (dolly vs aperture scaling) and extend `CameraRig` accordingly. — shipped via archived `camera-orthographic-projection_20261010` (`src/components/canvas/`) plus PRs #81/#82
- [x] Task: Implement perspective ↔ orthographic blending, modal navigation controls and critically damped glides. — shipped via archived `camera-orthographic-projection_20261010`; same-view glides in `src/components/canvas/instrument/useCameraTransition.ts`
- [x] Task: Implement the `InstancedMesh` logic to parse the bulk output from the Data Pipeline. — shipped as a GPU `Points` shader (`src/components/canvas/entity/SectorPointCloud.tsx`, `sectorPointCloudShaders.ts`), which the spec explicitly allows ("or custom `Points` materials"); binary sector streaming via archived `spatial-data-runtime_20261025`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Materials, Shaders & Post-Processing
- [x] Task: Build the responsive WebGL materials that sync to the UI token system. — shipped as `ThemeTokenBridge.tsx`, `useThemeTokenSync.ts`, `useThreeTokenStore`
- [x] Task: Calibrate zoom-level clamping and far horizon fade. — shipped as `useGalacticCeilingDistance.ts`, `deviceTierService`, and the far-horizon fade in `sectorPointCloudShaders.ts`
- [ ] ~~Task: Integrate `@react-three/postprocessing` (e.g., Bloom) if defined in the visual design spec.~~ — **dropped** (never required by the visual design spec; dependency was never added to `package.json`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Scale Transitions, Selection Pipeline & Projection Bridge
- [ ] Task: Implement multi-scale datum plane transitions with tilt indicators. — **not shipped**; moved to `orientation-instruments_20261117`
- [x] Task: Implement unified selection pipeline (2D ↔ 3D selection, raycast focal lock, reticle state promotion). — shipped as `src/components/canvas/entity/interactionActions.ts`, `math/tiers.ts`, `SpatialEntityStore`
- [x] Task: Implement 3D → 2D screen-space projection bridge. — shipped as `EntityLabel` (`ResizeObserver` cache) and `ScreenEdgeIndicators` in `src/components/canvas/`
- [ ] Task: Implement galactic orientation compass / attitude minimap. — **not shipped**; moved to `orientation-instruments_20261117`
- [ ] Task: Implement 3D-synchronised search framing. — **not shipped**; moved to `camera-choreography_20261117` (FS-003)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — not run; Phase 3 closed with the three residuals above lifted out

## Phase 4: Route Integration & Optimization
- [x] Task: Connect the canonical scenes to the router's active state (the tunnel). — shipped via the persistent `RootCanvasHost` (`src/router/RootLayout.tsx`, remediation T07)
- [x] Task: Run a WebGL memory audit to ensure disposal of geometries on unmount. — shipped as `npm run audit:r3f` (`package.json`) plus LRU/dispose tests
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Closure Note (2026-11-17)

Archived as complete (standalone track, `initiative: null`) during the Conductor registry tidy (`chore/tracks-registry-tidy`). Residuals and where they went:

| Residual | Destination |
|---|---|
| Post-processing (`@react-three/postprocessing`) | **Dropped** — not required by any ratified design spec |
| Galactic orientation compass / attitude indicator | New track [`orientation-instruments_20261117`](../../../tracks/orientation-instruments_20261117/index.md) |
| Datum-plane transition tilt indicators | New track [`orientation-instruments_20261117`](../../../tracks/orientation-instruments_20261117/index.md) |
| 3D-synchronised search framing (`FS-003`) | New track [`camera-choreography_20261117`](../../../tracks/camera-choreography_20261117/index.md) |
| Camera choreography coupling block (`FS-012` / `FS-013`) | Now lives only in [`camera-choreography_20261117`](../../../tracks/camera-choreography_20261117/spec.md) |

Phase 3 tasks left unticked above are the lifted residuals. Phase Verification lines are left unticked: the shipped work was verified in the tracks and PRs that delivered it.
