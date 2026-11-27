# View Requirements Specification

This document records the canonical inventory of screens, URL paths, information requirements, data contracts, and on-screen user actions across Starmap.

> [!NOTE]
> Entries in this document specify **screen boundaries, URL paths, information requirements, data contracts, user triggers, and state transitions**—focusing strictly on what appears on-screen rather than ephemeral styling details.

---

## 1. Feature & Journey Matrix

| Journey | Core User Goal | Route Scope |
| :--- | :--- | :--- |
| **Target Acquisition & Travel Planning** | Locate target star, inspect intrinsic system summary, benchmark travel times, enter system, inspect planet | `/galaxy`, `/system/$systemId`, `/planet/$planetId` |
| **Candidate Hunting & Territory Mapping** | Set spatial anchor, filter by radius & habitability intent, sync 2D candidate list ↔ 3D starfield, plot multi-leg route | `/galaxy?select=...&route=...` |
| **Serendipitous Discovery** | Trigger curated on-ramp prompt, view narrative hook & tags, step through tour waypoints, expand or enter system | `/galaxy?layer=...`, `/system/$systemId?layer=...` |
| **Classification Deep-Dive** | Deep-link to classifications, inspect parameter ranges & Relative Parameter Comparator against anchors, browse Category Index | `/guide/star-types/*`, `/guide/planet-types/*`, `/guide/metrics/*`, `/guide/hazards/*` |
| **Intra-System Logistics & Orbital Timing** | Select departure/arrival bodies in system, compare Hohmann vs Torchship transfers, inspect synodic windows | `/system/$systemId?route=...` |

---

## 2. Discovered Views & On-Screen Data/Action Inventory

### 2.0 Global Navigation & URL Grammar (All Views)

#### Top-of-View Breadcrumbs (`<Breadcrumbs />`, `src/components/domain/Breadcrumbs/`)
- Rendered at the top of the viewport representing the **spatial View and Route Hierarchy**:
  - Galaxy View (`/`, `/galaxy`): `Galaxy`
  - Search View (`/search`): `Galaxy > Search`
  - System View (`/system/$systemId`): `Galaxy > <System Name>`
  - Planet View (`/planet/$planetId`): `Galaxy > <System Name> > <Planet Name>`
  - Guide Views (`/guide/*`): `Guide > <Category>` (or `Guide > <Category> > <Item>`)
- Includes a persistent companion link: links to `/guide/star-types` (`Guide`) from map views, and to `/galaxy` (`Map`) from guide views.

#### Orthogonal URL Parameter Grammar (`src/router/index.ts`)
- **`?focus=<entityId>`:** Single focused entity (populates `<DetailsPanel>` and `<PreviewPanel>`). Visiting `/system/$systemId` or `/planet/$planetId` without `?focus=` enters with `focusedId === null`, keeping secondary telemetry visible while hiding the singular details panel.
- **`?select=<token1>,<token2>,...`:** Comma-separated selection tokens preserved across navigation:
  - Plain entity/system slug: `sol`, `tau-ceti`, `keid`
  - Tag shortcut: `tag:<tagSlug>` (e.g. `?select=tag:habitable-candidate`, `?select=tag:exoplanet-host`)
  - Layer shortcut: `layer:<layerSlug>` (e.g. `?select=layer:project-hail-mary`, `?select=layer:trappist-1-consortium`)
- **`?layer=<layerSlug>` or `?layer=<layerSlug>:<itemSlug>`:** Curated layer overview or active item waypoint walkthrough.
- **`?route=<stop1>,<stop2>[:<mode>],...`:** Interstellar or intra-system route stops with optional embedded propulsion/transfer profile identifiers (e.g. `?route=sol:torchship-1g,tau-ceti` or `?route=earth:hohmann,mars`).
- **`?center=<entityId>` (or `?x=&y=&z=`):** Spatial camera reference centre.
- **`?az=&el=&dist=` (or `?zoom=`):** Spatial camera orientation and scale.
- **Composability:** Cleanly composable, e.g. `/galaxy?select=layer:project-hail-mary&focus=tau-ceti&center=tau-ceti`.

---

### 2.1 Galaxy View (`/`, `/galaxy`, `src/views/GalaxyView`)

- **Component Boundary:** Composed inside `<SpatialShell testId="galaxy-view-root">` coordinating:
  - `<CanvasLayer scope="galaxy" />`: 3D starfield, coordinate grid, and route chords.
  - `<Breadcrumbs />`: Route hierarchy trail.
  - `<Search.Root limitPerCategory={3}>`:
    - `<Search.Panel scope="galaxy" />`:
      - Heading: `Search`
      - Search Input (`<Search.Input />` composing Tier 1 `<Input type="search" />`): Reactively updates search results and synchronises `?q=`.
      - Clear Button (`<Button data-testid="search-clear-button">`): Clears query and resets URL.
      - Submit Button (`<Button type="submit" data-testid="search-submit-button">`): Executes immediate search submission on the single-line input row.
      - Category Filter (`<Search.CategoryFilterSelect />` composing Tier 1 `<Select>`): Filters by `all`, `stars`, `planets`, `structures`, `minor-bodies`, `layers`, synchronising `?searchCategory=`.
  - `<DiscoverPanel />` (toggled via `ConsoleDock` `Discover`):
    - Groups curated layers into *Scientific Highlights*, *Fictional Universes*, and *Saved Collections* with text filtering and a `Random Layer` action (`<Button data-testid="discover-random-layer-button">`) that navigates to `/galaxy?select=layer:<layerSlug>&layer=<layerSlug>`.
    - `<Search.Results searchViewPath="/search" />`:
      - Truncated to 3 items per category with deep-link `<a href="/search?q=...">View all search results</a>` and category headers linking to `/search?q=...&searchCategory=<cat>`.
      - Domain rows rendered via `<SearchResultItem />`.
  - `<Minimap orientation={minimapOrientation} />`: Galactic plane reference slot, coordinates `[x, y, z] pc`, heliocentric distance `d`, and active marker pips.
  - `<ControlBar scope="galaxy" />`:
    - Play/Pause (`<Button>`) and playback rate (`<Slider>`).
    - Timestamp input (`<Input type="datetime-local" />`).
    - Projection toggle (`<Button>` 3D / Top-Down).
    - Layer toggles (`<Toggle>` Orbits, Grid, Labels).
    - Keyboard shortcut chips (`<Kbd>`).
  - `<DetailsPanel details={focusedDetails} />` (rendered when `?focus=` is active):
    - Multi-detent container (`peek`, `partial`, `full`) rendering physical parameters, spectral classification, planet composition census, environmental hazards, and astrometry.
    - CTAs: `<Button>` Details, `<Button>` Centre, `<Button>` Directions.
  - `<DirectionsPanel journey={activeJourney} />` (rendered when `?route=` has $\ge 2$ stops):
    - Stage 1: Transfer options list with summary durations.
    - Stage 2: Detailed flight telemetry (`Proper Time`, `Coordinate Time`, `Lorentz Factor γ`, `Δv`, `Comms Delay`).
  - `<PreviewPanel preview={focusedPreview} />`: Auxiliary 3D orbit preview mount slot and child orbit lines list.
  - `<BodiesPanel elements={galaxyBodies} />`: Non-passive systems list ordered by 3D Euclidean distance from the active target, with focus-relative distance captions.

---

### 2.2 Search View (`/search`, `src/views/SearchView`)

- **Component Boundary:** Dedicated search overview composed inside `<main data-testid="search-view-root">`:
  - `<Breadcrumbs items={[{ label: 'Galaxy', href: '/galaxy' }, { label: 'Search' }]} />`
  - `<Search.Root>`:
    - `<Search.Panel scope="search" />`: Full-width query input, category dropdown, and clear button.
    - `<Search.Results />`: Untruncated result categories rendering all matching `<SearchResultItem />` entries, omitting categories with zero hits.

---

### 2.3 System View (`/system/$systemId`, `src/views/SystemView`)

- **Component Boundary:** Composed inside `<SpatialShell testId="system-view-root">`:
  - `<CanvasLayer scope="system" targetId={systemId} />`: AU-scale system view rendering the primary star, Keplerian orbits, habitable zones, and planet discs.
  - `<Breadcrumbs />`: `Galaxy > <System Name>`.
  - `<Search.Root limitPerCategory={3}>` with `<Search.Panel scope="system" />` and `<Search.Results />`.
  - `<Minimap scope="system" />`: System coordinates, outer boundary radius (AU), habitable zone span, and orbiting body count.
  - `<ControlBar scope="system" />`: AU-scale time controller and orbital layer switches.
  - `<DetailsPanel details={focusedDetails} />`: Telemetry for focused star, planet, belt, or minor body (`peek`, `partial`, `full`).
  - `<DirectionsPanel journey={activeJourney} />`: Intra-system brachistochrone and Hohmann transfer calculations.
  - `<PreviewPanel preview={focusedPreview} />`: Target orbit geometry and satellite orbits list.
  - `<BodiesPanel elements={systemBodies} schematic={orbitalSchematic} />`: Embeds `<OrbitalSchematicList />` ordered by orbital distance, interleaving circumstellar belts, nesting satellites, and listing minor bodies.

---

### 2.4 Planet View (`/planet/$planetId`, `src/views/PlanetView`)

- **Component Boundary:** Composed inside `<SpatialShell testId="planet-view-root">`:
  - `<CanvasLayer scope="planet" targetId={planetId} />`: Kilometre-scale planetary disc, atmosphere/texture shaders, ring systems, and natural satellites.
  - `<Breadcrumbs />`: `Galaxy > <System Name> > <Planet Name>`.
  - `<Search.Root>` and `<Search.Panel scope="planet" />`.
  - `<Minimap scope="planet" />`: Subsystem reference telemetry, parent semi-major axis, and moon count.
  - `<ControlBar scope="planet" />`: Planetary rotation, satellite motion, and coordinate grid switches.
  - `<DetailsPanel details={focusedDetails} />`: In-depth planetary telemetry (mass, surface gravity, ESI, atmospheric composition, tidal locking state).
  - `<BodiesPanel elements={planetaryBodies} schematic={orbitalSchematic} />`: Host planet at rank `0` followed by moon orbits and visiting spacecraft.

---

### 2.5 Guide Views (`/guide/*`)

Dedicated educational and scientific reference views sharing persistent navigation (`<Breadcrumbs />`, `<nav aria-label="Guide sections">` linking all guide modules):

1. **Star Types (`/guide/star-types`, `/guide/star-types/$starType`, `src/views/StarTypesListView`, `src/views/StarTypeDetailView`):**
   - Catalogues Morgan–Keenan / Yerkes stellar classifications (O, B, A, F, G, K, M, White Dwarfs, Brown Dwarfs).
   - Detail view embeds the interactive 3-slice Yerkes Spectral Classification Combinator (`data-testid="star-type-combinator"`) allowing users to adjust class, subdivision, and luminosity class to inspect real-time physical telemetry.
2. **Planet Types (`/guide/planet-types`, `/guide/planet-types/$planetType`, `src/views/PlanetTypesListView`, `src/views/PlanetTypeDetailView`):**
   - Catalogues terrestrial, super-Earth, sub-Neptune, gas giant, and ice giant planetary classes.
3. **Telemetry Metrics (`/guide/metrics`, `/guide/metrics/$metricId`, `src/views/MetricsListView`, `src/views/MetricDetailView`):**
   - Physical parameter definitions, scientific units, and familiar real-world comparisons (`pc` $\rightarrow$ `ly`, `AU` $\rightarrow$ `million km / light-minutes`, `K` $\rightarrow$ `°C / °F`).
   - Supports `?focus=<entityId>` to render side-by-side comparative 3D measures against Earth or Sol.
4. **Environmental Hazards (`/guide/hazards`, `/guide/hazards/$hazardId`, `src/views/HazardsListView`, `src/views/HazardDetailView`):**
   - Explains all 8 stellar and planetary environmental hazards (`flare-star`, `ionising-radiation`, `variable-flux`, `extreme-heat`, `cryogenic-cold`, `high-gravity`, `tidal-locking`, `high-eccentricity`).

---

### 2.6 Route Finding & Transfer Benchmarks (`?route=`)

- **Shared `<DetentSheet>` Primitive (`src/components/interface/surfaces/DetentSheet/`):**
  - Manages vertical sheet detents (`peek`, `partial`, `full`) shared across `<DetailsPanel>` and `<DirectionsPanel>`.
- **Triggering Directions:**
  - Clicking `Directions` (`<Button data-testid="details-button-directions">`) preserves the active path and appends `?route=sol,<target>` (galaxy scope) or `?route=earth,<target>` (system/planet scope).
- **Embedded Route Modes:**
  - Selected propulsion or transfer mode IDs are embedded on route stops (e.g. `?route=sol:torchship-1g,tau-ceti`).
- **3D Trajectory Visualization (`<JourneyChord />`):**
  - Rendered in `<CanvasLayer />` when route legs are active, showing 3D transit lines, elevation drop projections, and waypoint callouts.

---

### 2.7 Curated Layer Exploration (`?layer=`, `<LayerCard />`)

- **Non-Blocking Layer Card (`src/components/domain/LayerCard/`):**
  - Floats above the 3D canvas on `GalaxyView`, `SystemView`, and `PlanetView` when `?layer=` is present:
  - **Overview Mode (`?layer=<layerSlug>`):** Displays layer title, badge, description, item count, source citation, and Start CTA (`<Button data-testid="layer-card-start">` linking to waypoint 1).
  - **Item Mode (`?layer=<layerSlug>:<itemSlug>`):** Displays waypoint counter (`1 of N`), item title, narrative hook, thematic tag chips, and Prev / Next navigation buttons.
- **Orbit-Context View Targeting (`src/services/details/detailsNavigation.ts`):**
  - Resolves layer waypoints and search results to their canonical orbit-context view:
    - Systems / Structures $\rightarrow$ `/galaxy?focus=<slug>` (or `/system/<slug>` when already focused)
    - Stars / Planets / Belts / Minor Bodies $\rightarrow$ `/system/<systemSlug>?focus=<slug>`
    - Moons $\rightarrow$ `/planet/<parentSlug>?focus=<moonSlug>`
    - Parent Layer manifests $\rightarrow$ `/galaxy?select=layer:<layerSlug>&layer=<layerSlug>`
