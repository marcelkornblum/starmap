# Tracks Registry

## Initiative: Journey-Driven View Data Models & UI Scaffolding (`journey-ui-scaffolding`)
*Overview: [conductor/initiatives/journey-ui-scaffolding/index.md](./initiatives/journey-ui-scaffolding/index.md) | [Decision Log](./initiatives/journey-ui-scaffolding/decision-log.md) | [View Requirements](./initiatives/journey-ui-scaffolding/view-requirements.md) | [Features Scratchpad](./initiatives/journey-ui-scaffolding/feature-scratchpad.md)*

### Stage 1: Journey Feature Discovery & View Data Models (Zero Presentation Assumptions)
- [x] **Track 01: Journey 1 — Target Acquisition, System Summary, 2-Point Route & Scale Transitions (Data Model & Logic)** *Link: [conductor/tracks/journey-ui-scaffolding_01_journey-1-reader-flow_20261016/index.md](./tracks/journey-ui-scaffolding_01_journey-1-reader-flow_20261016/index.md)*
- [x] **Track 02: Journey 2 — Spatial Anchor, Intent Filters, Candidate Sync & Multi-Leg Network (Data Model & Logic)** *Link: [conductor/tracks/journey-ui-scaffolding_02_journey-2-author-flow_20261016/index.md](./tracks/journey-ui-scaffolding_02_journey-2-author-flow_20261016/index.md)*
- [x] **Track 03: Journey 3 — Curated On-Ramps, Narrative Waypoints & Step-Through (Data Model & Logic)** *Link: [conductor/tracks/journey-ui-scaffolding_03_journey-3-explorer-flow_20261016/index.md](./tracks/journey-ui-scaffolding_03_journey-3-explorer-flow_20261016/index.md)*
- [ ] **Track 04: Journey 4 — Classification Deep-Links, Encyclopedia Articles, Parameter Comparator & Category Index (Data Model & Logic)** *Link: [conductor/tracks/journey-ui-scaffolding_04_journey-4-encyclopedia-flow_20261016/index.md](./tracks/journey-ui-scaffolding_04_journey-4-encyclopedia-flow_20261016/index.md)*
- [ ] **Track 05: Journey 5 — Intra-System Transfer Logistics, Temporal Scrubbing & Conjunction Geometry (Data Model & Logic)** *Link: [conductor/tracks/journey-ui-scaffolding_05_journey-5-transit-planner-flow_20261016/index.md](./tracks/journey-ui-scaffolding_05_journey-5-transit-planner-flow_20261016/index.md)*

### Stage 2: UI Chrome, Telemetry & View Wiring (Flexible Placeholders — Sequenced Post-Stage 1)
- [ ] **Track: Console UI Shell** *Link: [conductor/tracks/console-ui-shell_20261004/index.md](./tracks/console-ui-shell_20261004/index.md)*
- [ ] **Track: Telemetry Container & Dossiers** *Link: [conductor/tracks/telemetry-container_20261004/index.md](./tracks/telemetry-container_20261004/index.md)*
- [ ] **Track: Search & Discovery UI Surfaces** *Link: [conductor/tracks/search-discovery_20261004/index.md](./tracks/search-discovery_20261004/index.md)*
- [ ] **Track: Route & Measurement UI Surfaces** *Link: [conductor/tracks/route-measurement_20261004/index.md](./tracks/route-measurement_20261004/index.md)*

---

## Standalone & Downstream Tracks
- [ ] **Track: Interaction Controls** *Link: [conductor/tracks/interaction-controls_20261010/index.md](./tracks/interaction-controls_20261010/index.md)*
- [ ] **Track: Minimap & Scene Transitions** *Link: [conductor/tracks/minimap-scene-transitions_20261010/index.md](./tracks/minimap-scene-transitions_20261010/index.md)*
- [ ] **Track: 3D Engine Implementation** *Link: [conductor/tracks/3d-engine-implementation_20260929/index.md](./tracks/3d-engine-implementation_20260929/index.md)*
- [ ] **Track: Reference Engine & MDX** *Link: [conductor/tracks/reference-engine_20260929/index.md](./tracks/reference-engine_20260929/index.md)*

---

## Backlog
- [ ] **Feature: Custom Shortlink & Curated Landing URLs (`/go/<slug>`)** — Support friendly, memorable entry-point URLs (e.g., `/go/hail-mary`, `/go/dune`, `/go/trappist`, `/go/voyager`) that resolve to customised landing experiences with pre-configured camera framing, active fictional canon layers, selected targets/routes, and tailored onboarding context.
- [ ] **Feature: GitHub Feature Requests & Bug Reports Integration** — Provide a simple, low-friction way for users to submit feature requests, data/canon corrections, and bug reports directly to GitHub Issues (e.g., an in-app feedback action that opens pre-populated GitHub Issue forms/templates with current URL/view/entity context).
- [ ] **Feature: User Data Layer Saving, Cluster Labelling & Workspace Management** — Support saving, naming (e.g. *"Outer Colony Reach"*), importing/exporting, and managing custom user data layers, saved clusters, multi-leg route networks, and personal lore annotations (`FS-002`, `FS-015`).
- [ ] **Feature: Volumetric Interstellar Clouds & Galactic Structures on the Galaxy Map (`FS-016`)** — Render volumetric 3D interstellar clouds (CLIC clouds: *LIC*, *G-Cloud*, *Blue Cloud*, *Aquilae*, *Mic*, *Leo*, *Dor*, *Eri*, *Vela*; *Local Bubble*; and nearby molecular/dark cloud complexes: *Rho Ophiuchi*, *Taurus*, *Coalsack*, *Lupus*, *Chamaeleon*, *Pipe*) and galactic structures on `GalaxyView` (`GalaxyScene`), evaluate 3D sphere–sphere intersection against the Cartographic Instrument aperture ($\text{distance}(\text{centre}, \text{cloud}) \le R_{\text{aperture}} + R_{\text{cloud}}$), and surface active/intersecting clouds and structures in `<BodiesPanel scope="galaxy" />`.

---

## Archived Tracks (`conductor/archive/tracks/`)
- [x] **Track: Astro Math Core** *Link: [conductor/archive/tracks/astro-math-core_20260929/index.md](./archive/tracks/astro-math-core_20260929/index.md)*
- [x] **Track: Data Pipeline** *Link: [conductor/archive/tracks/data-pipeline_20260929/index.md](./archive/tracks/data-pipeline_20260929/index.md)*
- [x] **Track: Core Routing & State** *Link: [conductor/archive/tracks/core-routing-state_20260929/index.md](./archive/tracks/core-routing-state_20260929/index.md)*
- [x] **Track: UI System & Primitives** *Link: [conductor/archive/tracks/ui-system_20260929/index.md](./archive/tracks/ui-system_20260929/index.md)*
- [x] **Track: Visual Design Exploration** *Link: [conductor/archive/tracks/visual-design-exploration_20260929/index.md](./archive/tracks/visual-design-exploration_20260929/index.md)*
- [x] **Track: 3D Component Architecture Refactor** *Link: [conductor/archive/tracks/3d-component-architecture_20261004/index.md](./archive/tracks/3d-component-architecture_20261004/index.md)*
- [x] **Track: Visual Language Token Layer** *Link: [conductor/archive/tracks/visual-language-tokens_20261004/index.md](./archive/tracks/visual-language-tokens_20261004/index.md)*
- [x] **Track: Camera & Orthographic Projection** *Link: [conductor/archive/tracks/camera-orthographic-projection_20261010/index.md](./archive/tracks/camera-orthographic-projection_20261010/index.md)*
