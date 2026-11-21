# Specification: State, Layering & Legacy Surface Cleanup

## Overview
Eliminates remaining architectural debt inside `src/`: removes `globalThis` router and canvas-stage locators, relocates ~830 lines of CSS→Three.js token extraction out of `src/stores/`, deletes the ~2,660-line `PaletteShowcase` prototype (while explicitly keeping the `Dock` primitive intact), purges prohibited type aliases, deprecated props, and legacy test shims, replaces a 10-parameter function with an options object, and enables `noUncheckedIndexedAccess` in `src/utils` and codecs.

Covers Architecture Review findings `M3`, `M4`, `M5`, `M6`, `M11`, `M12`, `L1`, and `L5`.

## Current State (baseline at 2026-11-21)
- `src/hooks/useSpaLocation.ts:42-60` and `src/hooks/spaNavigation.ts:40-47` reach TanStack Router via `globalThis.__STARMAP_APP_ROUTER__` typed as an all-optional `SpaRouterLike` with `[key: string]: unknown`, inspecting URLs via `resolved.includes('center=')` (`M3`).
- `src/stores/useCanvasStageStore.ts:1-48` mixes React context, a zustand store, and a `globalThis` callback registry/listener set, types `cameraState: Record<string, unknown>`, and is omitted from `src/stores/index.ts` (`M4`).
- ~830 lines of pure CSS→Three.js token extraction (`extractThreeColorTokens.ts`, `extractThreeTokens.ts`, `threeTokenDefaults.ts`) live in `src/stores/` (`M5`).
- `src/prototypes/PaletteShowcase/` (~2,660 lines: 820-line TSX, 1,817-line CSS module, stories, test) sits in `src/` and is counted in coverage because `vite.config.ts:94` excludes non-existent `src/components/prototypes/**` (`M6`).
- 12 pure type aliases (`PlanetRecord = ExoplanetRecord`, `StarRecord`, `StarSystemManifest`, etc.) violate the zero-aliases rule (`M11`).
- Deprecated props (`@deprecated rGc`, backwards-compat props in `CartographicInstrument.tsx`, `CameraRig.tsx`), duplicate `legacyTestId` attributes (`directionsQuantityHelpers.ts`), legacy unit-test branches (`spatialShellHelpers.ts`), and `_resetWebGLSupportedForTesting` on a public barrel remain (`M12`).
- `resolveFocusedTarget` (`src/services/details/focusedTargetResolver.ts:36-47`) takes 10 positional parameters (`L1`).
- `tsconfig.app.json:19-24` omits `noUncheckedIndexedAccess`, leaving index-heavy codec code unchecked (`L5`).

## Scope
1. **Eliminate `globalThis` Locators & Misplaced Store Modules (`M3`, `M4`, `M5`)**:
   - Remove `globalThis.__STARMAP_APP_ROUTER__` and `SpaRouterLike`; wire typed TanStack Router hooks/context or elevated navigation helpers cleanly within the layering rules.
   - Split `useCanvasStageStore.ts` into cohesive modules using a module-scoped `useSyncExternalStore` registry (zero `globalThis`), replace `Record<string, unknown>` `cameraState` with a strict type, and align `src/stores/` exports.
   - Move `extractThreeColorTokens.ts`, `extractThreeTokens.ts`, and `threeTokenDefaults.ts` out of `src/stores/` into `src/utils/` or `src/components/canvas/theme/` (matching the layering rank table).
2. **Remove `PaletteShowcase` Prototype & Fix Coverage Exclude (`M6`)**:
   - Delete `src/prototypes/PaletteShowcase/` (preserving history in git) and remove the broken `src/components/prototypes/**` exclude in `vite.config.ts`.
   - **Explicit retention:** keep `src/components/interface/surfaces/Dock/` intact — it is reserved for the backlog item moving the Galaxy ↔ Guide mode switcher out of `Breadcrumbs` onto `<Dock>`.
3. **Purge Aliases, Deprecated Props, Shims & Parameter Sprawl (`M11`, `M12`, `L1`, `L5`)**:
   - Codemod and delete all 12 pure type aliases (`M11`).
   - Delete deprecated props (`rGc`, etc.), `legacyTestId` duplicates, legacy unit-test branches, and move `_resetWebGLSupportedForTesting` into a dedicated test-only module (`M12`).
   - Refactor `resolveFocusedTarget` to take a single typed options object (`L1`).
   - Enable `noUncheckedIndexedAccess` starting with `src/utils/` and codec modules (`L5`).

## Out of Scope
- Deleting `src/components/interface/surfaces/Dock/` (explicitly retained for backlog item *Primary Mode Switcher on `<Dock>`*).
- Bulk deletion of ~60 per-component 1-line `index.ts` barrels (`L2`), cosmetic `AUD-`/`DEC-` comment stripping (`M18`), and rewriting component-quad folder conventions (`L3`): accepted/deferred.
- `.storybook/main.ts` hardcoded LAN IP and `scratch/migration-tracker.md` (`L4`): already included in [`tooling-guards-and-test-loop_20261121`](../tooling-guards-and-test-loop_20261121/spec.md).

## Acceptance Criteria
- [ ] Zero `globalThis` router or canvas-stage registries remain in `src/`; router navigation uses typed TanStack Router APIs, and `cameraState` is strictly typed.
- [ ] Zero CSS→Three.js token extractor modules remain in `src/stores/`.
- [ ] `src/prototypes/PaletteShowcase/` is removed and `vite.config.ts` coverage excludes match real paths; `src/components/interface/surfaces/Dock/` remains intact and passing its unit tests/stories.
- [ ] Zero prohibited type aliases (`M11`), deprecated props, `legacyTestId` duplicates, legacy test branches, or public-barrel test-reset exports (`M12`) remain.
- [ ] `resolveFocusedTarget` accepts a single typed options object; `noUncheckedIndexedAccess` passes cleanly across `src/utils/` and codecs.
- [ ] `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, and `npm run test:coverage` pass cleanly.
