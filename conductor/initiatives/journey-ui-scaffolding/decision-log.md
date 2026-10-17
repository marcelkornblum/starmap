# Decision Log (`journey-ui-scaffolding`)

This document records all architectural, data-model, interaction, and UI scaffolding decisions made during the `journey-ui-scaffolding` initiative.

## Operating Rules for Agents
1. **No Unilateral Decisions:** Agents must never silently choose an option or make a "helpful leap".
2. **One Decision at a Time:** Complex design or data-model questions must be decomposed into atomic, single-concern decisions and discussed with the user one by one via interactive prompts (`ask_question`).
3. **Preserve Options & Trade-offs:** Every entry must record all options considered and their trade-offs so that deferred or provisional choices can be revisited with full context as patterns emerge across Journeys 1–5.
4. **Lifecycle Statuses:**
   - `Open` — Identified decision point awaiting discussion with the user.
   - `Provisional` — Working choice adopted for scaffolding; explicitly flagged to revisit once all journeys are mapped.
   - `Ratified` — Confirmed by the user.
   - `Superseded` — Replaced by a later decision (link to superseding ID).

---

## Decision Register

### DEC-001: Two-Stage Journey-First Discovery Before UI Chrome & Telemetry Presentation
- **Date:** 2026-10-16
- **Status:** `Ratified`
- **Scope:** Initiative Structure (`journey-ui-scaffolding`)
- **Context:** Existing tracks (`console-ui-shell`, `telemetry-container`, `search-discovery`, `route-measurement`) forced component and layout commitments before all 5 user journeys had been traced end-to-end at the data and state level.
- **Options Considered:**
  1. *Layer-First Tracks:* Build Console UI Shell and Telemetry Container first, then fit user journeys into those containers.
     - *Trade-off:* High risk of building the wrong container slots, detents, or component APIs before knowing what data and actions each journey actually requires on-screen.
  2. *Journey UI Scaffolding First (Core Shell + Journey UI Tracks):* Build the core shell first, then build UI views per journey.
     - *Trade-off:* Still forces committing to core shell and telemetry presentation before auditing all 5 journeys' functional needs.
  3. *Two-Stage Approach — Journey Feature & View Data Models First (Zero Presentation Assumptions), Then Flexible Stage 2 UI Chrome & Wiring:* Walk through Journeys 1–5 first (Tracks 01–05) to define **what** needs to be on-screen (view data models, selectors, interface logic) without deciding **how** to present it; defer Console Chrome, Telemetry, and UI Surface Wiring to Stage 2 placeholders until Stage 1 patterns are visible.
     - *Trade-off:* Requires a lightweight diagnostic view harness during Stage 1, but guarantees that Stage 2 UI architecture is 100% grounded in verified cross-journey data requirements.
- **Decision:** Adopt **Option 3**. Execute Stage 1 (Tracks 01–05 for Journeys 1–5 View Data Models & Feature Requirements) first, and hold Stage 2 UI Chrome/Telemetry/Wiring tracks as flexible placeholders until Stage 1 completes.

---

### DEC-002: Local Network Review & Multi-Viewport Screenshot Protocol
- **Date:** 2026-10-16
- **Status:** `Ratified`
- **Scope:** Workflow & Review Tooling
- **Context:** The user interacts with the running application over the local network from multiple devices and requires both deterministic LAN URLs and regular embedded multi-viewport renders directly in the chat/artifact UI.
- **Options Considered:**
  1. *Ad-hoc Dev Server & Manual Browser Checks:* Let Vite pick any free port and rely on manual checks.
     - *Trade-off:* Port drift breaks bookmarks on LAN devices; lacks side-by-side multi-viewport visual history in conversation artifacts.
  2. *Locked LAN Ports (`5173` / `6006`) + Automated 5-Viewport Playwright Capture Script (`npm run capture:views`):* Configure `strictPort: true` and `allowedHosts: true` on `0.0.0.0`, and capture automated screenshots across Mobile Portrait (`390×844`), Tablet Portrait (`768×1024`), Tablet Landscape (`1024×768`), Desktop Standard (`1440×900`), and Desktop Ultrawide (`2560×1440`).
- **Decision:** Adopt **Option 2**. Every visual checkpoint and option review must include clickable LAN URLs (`http://192.168.1.124:5173` / `http://192.168.1.124:6006`) and embedded multi-viewport Playwright screenshots.

---

### DEC-003: Quarantine Existing POC Views Under `src/views/poc/` & Start Stage 1 with a Clean-Slate Router
- **Date:** 2026-10-17
- **Status:** `Ratified`
- **Scope:** View Architecture, Routing & Track Specifications
- **Context:** The codebase previously contained 4 hardcoded views (`GalaxyView`, `SystemView`, `PlanetView`, `ReferenceView`) mounted at `/galaxy`, `/system/$systemId`, `/planet/$planetId`, and `/reference` with a global `RootLayout` header/canvas. Keeping them as the active top-level routes biased Stage 1 into assuming those exact 4 views and URL paths.
- **Options Considered:**
  1. *Move to `src/views/poc/` and Mount Under `/poc/*` While `/` Starts as a Clean Slate:* Move the existing views into `src/views/poc/`, mount them under `/poc/*` (`/poc/galaxy`, `/poc/system/$systemId`, `/poc/planet/$planetId`, `/poc/reference`) for reference, make `/` a completely blank slate with zero layout or route assumptions, and strip pre-assumed view names and URL paths from the Initiative and Track 01–05 specs/plans.
     - *Trade-off:* Preserves existing POC code and tests for reference at `/poc/*` while giving Stage 1 a 100% unopinionated root canvas/router.
  2. *Quarantine in `src/views/poc/` and Unmount from Router Completely:* Keep the files on disk only and remove them from the router.
     - *Trade-off:* Cannot inspect the old POC screens over LAN without re-mounting them.
- **Decision:** Adopt **Option 1**. Existing views live in `src/views/poc/` and are mounted under `/poc/*` for reference; `/` renders `CleanSlateRoot` with zero assumptions about which views exist or what their paths are. All Stage 1 journey tracks decide screen boundaries, view names, and URL paths from scratch one step at a time.

