# Routing and State Architecture

*Placeholder document for routing and state boundaries.*

## URL vs Global State
- **URL (TanStack Router):** The single source of truth for navigation state (e.g., active view, selected system, search queries).
- **Global State (Zustand):** Handles ephemeral UI state (e.g., panel toggles) and persistent local storage settings.
- **Browser History:** Major view changes (Galaxy -> System) trigger a `push` state. Minor intra-view adjustments (panning coordinates, opening a panel) trigger a `replace` state to prevent history bloat.

## Data Fetching Lifecycle
- **Render-then-Fetch:** The application prioritizes immediate UI feedback. When navigating, the route mounts instantly showing skeleton/empty states, while TanStack Router loaders fetch the static JSON data asynchronously.
