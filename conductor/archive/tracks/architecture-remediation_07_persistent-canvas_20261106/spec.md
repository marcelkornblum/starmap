# Spec: T07 · One Persistent Canvas & R3F Hot Paths

## Overview

Host all scopes inside a single persistent R3F Canvas so that the WebGL context survives navigation. Delete the orphaned GlobalCanvas/SceneBridge system and the patchR3F prototype patch. Eliminate per-frame hot-path defects including O(N²) occlusion registration, layout reads, material rebuilds, colour copies, store access in frame loops, and leaking singleton fallbacks.

**Behaviour change:** None intended
**Risk:** High

**Track type:** Refactor. Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-100 · AUD-101 · AUD-102 · AUD-103 · AUD-104 · AUD-105 · AUD-106 · AUD-107 · AUD-108 · AUD-109 · AUD-110 · AUD-111 · AUD-112 · AUD-113 · AUD-114 · AUD-115 · AUD-116 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t07--one-persistent-canvas--r3f-hot-paths)).

## Scope

### In scope
- AUD-100 — Each scope mounts its own `<Canvas>`; WebGL context recreated on every scope change
- AUD-101 — Orphaned `GlobalCanvas` + `SceneBridge` system; `ReactNode` stored in Zustand
- AUD-102 — `THREE.Object3D.prototype.data` monkey-patched with recursive Proxy
- AUD-103 — Per-frame, per-entity `occlusionManager.register()` → O(N²) scans and allocations per frame
- AUD-104 — `offsetWidth`/`offsetHeight` read in `useFrame`
- AUD-105 — Render-phase ref mutation duplicating the effect below
- AUD-106 — Materials and `Line2` rebuilt on hover: colour/opacity in `useMemo` deps
- AUD-107 — Unconditional per-frame `color.copy()` on ~132 materials
- AUD-108 — `getState()` per frame and `setApertureIds(new Set())` inside `useFrame`
- AUD-109 — Module-level singleton fallbacks leak across remounts/tests
- AUD-110 — Imperative camera/controls restore in `useEffect` racing `CameraRig`
- AUD-111 — Mutable `THREE.Color` instances held in Zustand
- AUD-112 — Dash/dot metrics defined three times with conflicting values
- AUD-113 — `EntityLabel` inline `transform` style
- AUD-114 — `computeHitAreaOffsetFor` and `getCyclicSelectionTarget` filter by `other.hasReticle` so passive stars without reticles do not displace hit areas
- AUD-115 — `BodyMarker` calls `billboardRef.current.updateMatrixWorld(true)` in `useFrame` after updating billboard quaternion and hit-area scale/offset
- AUD-116 — `BodyMarker` replaces bare R3F `onClick` (2 px drag filter) with `onPointerDown`/`onPointerUp` distance thresholding (6–8 px)

### Out of scope
- Visual redesign.

## Acceptance Criteria

- [ ] Every owned finding (AUD-100 … AUD-116) marked `verified` by the end-of-track audit.
- [ ] Owned guard baselines at zero: `G-canvas`, `G-r3f`.
- [ ] No guard baseline increased.
- [ ] Full e2e suite including URL contract specs green.
- [ ] Manual smoke checklist passed.
- [ ] Audit report written to `audit-report.md`.
