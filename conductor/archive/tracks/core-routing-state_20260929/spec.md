# Specification: Core Routing & State

## Overview
This track builds the structural skeleton of Starmap. It implements the type-safe routing system and global state management, defining the strict boundary between URL-driven state (navigation) and Zustand-driven state (ephemeral/persistent UI settings). It also establishes the global WebGL canvas lifecycle.

## Functional Requirements
1. **Specific Routes:** Configure TanStack Router with the exact hierarchy:
   - `/galaxy` (Top-level atlas)
   - `/system/$systemId` (Specific star system)
   - `/planet/$planetId` (Specific planetary body)
   - `/reference/*` (Encyclopedia catch-all)
2. **Persistent Settings Store:** Implement a Zustand store utilizing the `persist` middleware to save user preferences (e.g., UI theme, visual toggles) directly to `localStorage`.
3. **Ephemeral State Store:** Implement a separate Zustand architecture for transient, non-URL state. This must support both global ephemeral state (e.g., "is audio playing?") and view-level ephemeral state.
4. **First-Class Navigation Enforcer:** Create a strict, type-safe navigation utility (`useStarmapNav`) that enforces `push` for major view changes and `replace` for arbitrary URL parameter updates (like map coordinates).
5. **Render-then-Fetch Pattern:** Implement route loaders to simulate asynchronous data fetching, ensuring routes mount instantly with skeleton states.
6. **Global Canvas Engine:** Mount a persistent `<Canvas>` at the root, using `@react-three/drei` to swap specific 3D scenes based on the route without destroying the WebGL context.

## Non-Functional Requirements
- **No Heavy 3D Graphics:** This track focuses purely on the structural plumbing. 3D scenes should be simple placeholders.
- **Strict Separation:** The URL must remain the single source of truth for the active astronomical target.

## Acceptance Criteria
- [ ] TanStack Router is configured with the 4 core routes.
- [ ] The `useStarmapNav` utility successfully updates a URL parameter (e.g., `?center=xyz`) via `replace` without adding to browser history.
- [ ] A persistent setting (e.g., `showLabels`) can be toggled, saved to `localStorage`, and persists across a hard refresh.
- [ ] Navigating between `/galaxy` and `/system/sol` swaps a placeholder 3D scene in the global canvas without unmounting the `<Canvas>` wrapper.

## Out of Scope
- Final UI styling or complex CSS.
- Real astronomical data integration.
- Actual 3D models or complex WebGL shaders.
