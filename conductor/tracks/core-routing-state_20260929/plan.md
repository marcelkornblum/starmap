# Implementation Plan: Core Routing & State

## Phase 1: Router & Navigation Enforcer
- [x] Task: Install and configure TanStack Router.
- [x] Task: Scaffold the 4 base routes (`/galaxy`, `/system/$systemId`, `/planet/$planetId`, `/reference`).
- [x] Task: Implement the `useStarmapNav` hook to enforce the `push` vs `replace` browser history rules.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: State Persistence & Ephemeral Stores
- [x] Task: Install Zustand.
- [x] Task: Create `useSettingsStore` utilizing the `persist` middleware for `localStorage`.
- [x] Task: Create `useUIStore` for handling ephemeral, view-level and global transient state.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Global Canvas & Route Loaders
- [ ] Task: Wrap the application root in a single React Three Fiber `<Canvas>`.
- [ ] Task: Implement the render-then-fetch loader pattern on the routes (using mock delays).
- [ ] Task: Configure the routes to inject specific placeholder 3D scenes into the global canvas using `@react-three/drei` tunnel or view helpers.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
