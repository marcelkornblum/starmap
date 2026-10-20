# View Requirements Inventory (`journey-ui-scaffolding`)

This living document accumulates **which screens/views and URL paths exist** and **what needs to be on-screen** across each discovered view as we work through Journeys 1–5 in Stage 1.

> [!IMPORTANT]
> **Strict Clean-Slate & Separation of Concerns (Stage 1 Rule):**
> - **Zero Pre-Assumed Views or Paths:** Legacy POC views are quarantined in `src/views/poc/` (`/poc/*`) and `/` starts as a clean slate. We do not assume which views exist or what their URL paths are ahead of time; every screen boundary and route path is ratified as we step through the journeys.
> - **What On-Screen, Not How to Present It:** Entries in this document describe **screen boundaries, URL paths, information requirements, data contracts, user triggers, and state transitions**—never visual styling, layout splits, or presentation chrome. Presentation patterns are synthesised at the transition to Stage 2.

---

## 1. Cross-Journey Feature Matrix

| Journey | Core User Goal | Status |
| :--- | :--- | :--- |
| **Journey 1: Target Acquisition & Travel Planning** | Locate target star, inspect intrinsic system summary, benchmark 2-point travel times, enter system, inspect planet | `[x] Complete (Track 01)` |
| **Journey 2: Candidate Hunting & Territory Mapping** | Set spatial anchor, filter by radius & habitability intent, sync 2D candidate list ↔ 3D starfield, plot multi-leg route, export URL | `[x] Complete (Track 02)` |
| **Journey 3: Serendipitous Discovery** | Trigger curated on-ramp prompt, view narrative hook & tags, step through tour waypoints (`Prev`/`Next`), expand or enter system | `[~] In Progress (Track 03)` |
| **Journey 4: Classification Deep-Dive** | Trigger classification deep-link `(i)`, inspect parameter ranges & Relative Parameter Comparator against familiar anchors, browse Category Index, return to origin | `[ ] Pending (Track 04)` |
| **Journey 5: Intra-System Logistics & Orbital Timing** | Select departure/arrival bodies in system, scrub orbital clock forward/backward, compare Hohmann vs Torchship transfers, flag solar conjunction blackout | `[ ] Pending (Track 05)` |

---

## 2. Discovered Views & On-Screen Data/Action Inventory

### 2.0 Global Navigation & URL Grammar (All Views)
- **Top-of-View Breadcrumbs (`<Breadcrumbs />`, [`src/components/domain/Breadcrumbs/Breadcrumbs.tsx`](file:///home/marcel/projects/starmap/src/components/domain/Breadcrumbs/Breadcrumbs.tsx)):**
  - Every view renders `<Breadcrumbs items={...} />` (`data-testid="view-breadcrumbs"`) at the top of the screen representing the **spatial View / Route Hierarchy only** (never the `?focus=` parameter per `DEC-015`):
    - Galaxy View (`/`, `/galaxy`, `/galaxy/$systemId`): `Galaxy`
    - Search View (`/search`): `Galaxy > Search`
    - System View (`/system/$systemId`): `Galaxy > <System Name>`
    - Planet View (`/planet/$planetId`): `Galaxy > <System Name> > <Planet Name>`
    - Guide Views (`/guide/*`): `Galaxy > Guide: <Category>` (or `Galaxy > Guide: <Category> > <Term>`)
- **Orthogonal `?focus=`, `?select=`, and `?center=` / Camera URL Grammar (`DEC-010`, `DEC-015`, `DEC-021`, [`src/router/index.tsx`](file:///home/marcel/projects/starmap/src/router/index.tsx)):**
  - `?focus=<entityId>` — Single focused entity (populates `<DetailsPanel>` and `<PreviewPanel>`). Visiting `/system/$systemId` or `/planet/$planetId` without `?focus=` enters that view with `focusedId === null` and **hides `<DetailsPanel />` and `<PreviewPanel />`**, while `<BodiesPanel />`, `<OrbitalSchematicPanel />`, `<Minimap />`, `<ControlBar />`, and `<CanvasLayer />` still render.
  - `?select=<token1>,<token2>,...` — Comma-separated list of selection tokens (keeps `:` and `,` unencoded via custom `stringifyStarmapSearch`):
    - Plain entity/system slug: `sol`, `tau-ceti`, `keid`
    - Tag shortcut: `tag:<tagSlug>` (e.g. `?select=tag:habitable-candidate`, `?select=tag:exoplanet-host`)
    - Canon shortcut: `canon:<canonSlug>` (e.g. `?select=canon:project-hail-mary`, `?select=canon:star-trek`)
  - `?center=<entityId>` (or `?x=<num>&y=<num>&z=<num>` when free-panned) + `?az=<deg>&el=<deg>&dist=<num>` (or `?zoom=<num>`):
    - Encodes the active 3D view reference point and relative camera orientation/distance across `GalaxyView`, `SystemView`, and `PlanetView`.
    - Clicking the `Centre` link (`data-testid="details-button-center"`) in `<DetailsPanel />` sets `?center=<entityId>` and updates `<Minimap />` and `<CanvasLayer />` coordinates.
  - Composable: e.g. `/galaxy?select=canon:project-hail-mary&focus=tau-ceti&center=tau-ceti`.

### 2.1 Galaxy View (`/`, `/galaxy`, `/galaxy/$systemId` — [`src/views/GalaxyView.tsx`](file:///home/marcel/projects/starmap/src/views/GalaxyView.tsx))
- **Functional Component Boundary:** Root `<main data-testid="galaxy-view-root">` composing `<CanvasLayer scope="galaxy" />`, `<Breadcrumbs />`, `<Search.Root>`, `<Search.Panel scope="galaxy" />`, `<Search.Results />`, `<SearchResultItem>`, `<Minimap orientation={minimapOrientation} />`, `<ControlBar scope="galaxy" />`, `<DetailsPanel details={focusedDetails} />`, and `<PreviewPanel preview={focusedPreview} />`.
- **Search Panel (`<Search.Panel scope="galaxy" />`, `data-testid="search-panel"`, `data-scope="galaxy"`):**
  - Heading: `Search`
  - Query input (`<input type="search" name="query" />` — triggers search immediately on each key press and dynamically syncs the `?q=` URL GET parameter via `history.replaceState`)
  - Clear search button (`<button type="button" data-testid="search-clear-button">Clear search</button>` — clears the search term, removes `?q=` from the URL bar, and hides the `Search Results` panel)
  - Category Filter select (`<select name="filter">` — triggers search immediately on selection change and syncs `?searchCategory=` when non-default):
    - `all`: `All Categories`
    - `stars`: `Stars & Stellar Systems`
    - `planets`: `Planets, Exoplanets & Moons`
    - `structures`: `Galactic Structures & Deep Sky`
    - `minor-bodies`: `Solar System Minor Bodies`
    - `layers`: `Curated Layers & Canons` (accepts legacy `fiction` alias)
  - Explore button (`<button type="button" data-testid="search-explore-button">Explore</button>` — picks a random curated layer, excluding the currently open layer if any, and navigates to `/galaxy?select=layer:<layerSlug>&layer=<layerSlug>` to illuminate its host systems and open the `<LayerCard />` overview).
- **Search Results Panel (`<Search.Results searchViewPath="/search" />`, `data-testid="search-results-panel"`):**
  - **Conditional Visibility:** Hidden completely when the search query is empty (`query.trim().length === 0`).
  - Heading: `Search Results`
  - Full search view link (`<a href="/search?q=..." data-testid="search-view-link">View all search results</a>`)
  - Result group sections (`<h3>` + filtered `/search` link `<a href="/search?q=...&searchCategory=<category>" data-testid="search-category-link-<category>">View all <Heading></a>` + populated `<ul>` of matching `<SearchResultItem result={result} />` domain rows truncated to **3 per category** via `limitPerCategory={3}` on Galaxy View). **Empty categories (`group.items.length === 0`) are omitted completely—neither their heading nor an empty list is rendered:**
    - `Stars & Stellar Systems` (`stars`)
    - `Planets, Exoplanets & Moons` (`planets`)
    - `Galactic Structures & Deep Sky` (`structures`)
    - `Solar System Minor Bodies` (`minor-bodies`)
    - `Curated Layers & Canons` (`layers`)
  - **Domain Search Result Item Component (`<SearchResultItem result={result} />`, [`src/components/domain/SearchResultItem/SearchResultItem.tsx`](file:///home/marcel/projects/starmap/src/components/domain/SearchResultItem/SearchResultItem.tsx)):**
    - Domain component that accepts a `SearchResultItem` record and unpacks its fields to render an unstyled semantic stub (`<li data-testid="search-result-item">`) with CUBE `data-*` state attributes (`data-category`, `data-entity-kind`, `data-reticle`, `data-target-view`, `data-entity-id`, `data-system-id`) and category-specific variations (visual styling deferred to Stage 2):
      - **Base elements (all variations):**
        - Anchor link (`<a href={href}>{name}</a>` — uses centralised Orbit-Context View Targeting `buildEntityOrbitTargetHref` per `DEC-038`):
          - Systems & Galactic Structures link to `/galaxy/<systemSlug>`
          - Stars, Planets, Dwarf Planets, Belts, Minor Bodies & Fictional Bodies link to `/system/<systemSlug>?focus=<itemSlug>`
          - Moons (with planetary `parentBodyId`) link to `/planet/<parentPlanetSlug>?focus=<moonSlug>`
          - Parent Layer Manifests link to `/galaxy?select=layer:<layerSlug>&layer=<layerSlug>`
          - Individual Layer Entries link to their target's Orbit-Context view with `?select=layer:<layerSlug>&layer=<layerSlug>:<itemSlug>`
        - Reticle classification badge (`<span data-testid="result-reticle-type">[{reticleType}]</span>`)
      - **Variation `stars` (`data-testid="result-variation-stars"`):** Unpacks `spectralType` `<Badge category="star">` linking to `/guide/star-types/$starType` (`data-testid="result-spectral-badge"`) and `planetCount` summary (`data-testid="result-planet-summary"`).
      - **Variation `planets` (`data-testid="result-variation-planets"`):** Unpacks planet sub-kind attribute (`data-planet-kind="planet" | "moon" | "dwarf-planet"`).
      - **Variation `structures` (`data-testid="result-variation-structures"`):** Deep-sky structure variation hook.
      - **Variation `minor-bodies` (`data-testid="result-variation-minor-bodies"`):** Solar System minor-body variation hook.
      - **Variation `layers` (`data-testid="result-variation-layers"`):** Unpacks parent layer/canon title (`canonTitle`) or layer kind badge.
      - **Omitted fields:** Heliocentric parsec (`pc`) distance numbers are omitted from result rows.
- **Minimap Panel (`<Minimap orientation={minimapOrientation} />`, [`src/components/domain/Minimap/Minimap.tsx`](file:///home/marcel/projects/starmap/src/components/domain/Minimap/Minimap.tsx)):**
  - Always rendered on `GalaxyView` (`data-testid="minimap-panel"`, `data-scope="galaxy"`, `data-anchor-id`).
  - Exposes `<div data-testid="minimap-viewport-slot">`, galactic reference frame telemetry (`[x, y, z] pc` and heliocentric distance `d`, updating when `?center=<entityId>` or `?x=&y=&z=` is set), and active markers (`origin` for Sol plus any `anchor`, `focused`, and `selected` systems).
- **Control Bar (`<ControlBar scope="galaxy" />`, [`src/components/domain/ControlBar/ControlBar.tsx`](file:///home/marcel/projects/starmap/src/components/domain/ControlBar/ControlBar.tsx)):**
  - Always rendered on `GalaxyView` (`data-testid="control-bar"`, `data-scope="galaxy"`).
  - Contains the Time Controller (`data-testid="control-bar-time-controller"`: Play/Pause button, speed scrubber, and `<input type="datetime-local">` picker), Control Mode & Layer Toggles (`3D` / `Top-Down`, `Orbits`, `Grid`, `Labels`), and Keyboard Shortcut indicators (`<kbd>`).
- **Details Panel (`<DetailsPanel details={focusedDetails} />`, `data-testid="details-panel"`):**
  - Rendered only when an entity is focused (`details !== null`).
  - Broken into 3 detent sections (`Peek`, `Partial`, `Full`) consuming the `FocusedEntityDetails` discriminated union (`focusedKind: 'system' | 'star' | 'planet' | 'minor-body' | 'structure'`) per `DEC-022`, `DEC-025`, `DEC-026`, and `DEC-032`:
    - `Peek`: Header (`starCount` shown only for `'system'`), entity peek telemetry line + hazard summary badge (`data-testid="details-hazard-summary"`), 4-class planet composition breakdown (`terrestrial`, `super-earth`, `ice-giant`, `gas-giant` + hazard summary badge for `'system'` only per `DEC-025` & `DEC-032`), and summary.
    - `Partial`: CTAs at the top (`Details` `data-testid="details-button-system-details"` rendered only when a deeper 3D view exists per `DEC-026`, `Centre` `data-testid="details-button-center"`, `Directions` `data-testid="details-button-directions"`), followed by `Environmental Hazards` (`data-testid="details-hazards-section"`, inheriting host system hazards across all system entities per `DEC-032`), `Canon Layers` (`data-testid="details-canon-section"`), and child/system body lists (`Stars` + `Planets` for `'system'` only per `DEC-025`, `Orbiting Bodies` for `'planet'` / `'minor-body'`).
    - `Full`: Intrinsic Telemetry (`Stellar` / `Planetary` / `Body` / `Structure` Telemetry including `massMsun`, `radiusRsun`, `luminosityLsun`, `effectiveTempK`, `inclinationDeg`, `radiusRearth`, `surfaceGravityG`, `isTidallyLocked`, `esi`) and `Astrometry` (`System ID`, `Sector`, `Coordinates`, clickable `Tags` badges).
- **Focus Preview Panel (`<PreviewPanel preview={focusedPreview} />`, [`src/components/domain/PreviewPanel/PreviewPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/PreviewPanel/PreviewPanel.tsx)):**
  - Rendered only when an entity is focused (`preview !== null`).
  - Heading: `Focus Preview` (`data-testid="preview-panel"`, `data-preview-mode="system-orbits" | "planetary-system" | "object-orbit"`, `data-target-id`, `data-focused-kind`).
  - Exposes a 3D viewport mount slot (`data-testid="preview-canvas-slot"`), the focused target's orbital geometry (`inclinationDeg`, `eccentricity`, `semiMajorAxisAu`), and the child orbit lines list (`data-testid="preview-orbits-list"`).
- **Galactic Bodies Panel (`<BodiesPanel elements={galaxyBodies} />`, [`src/components/domain/BodiesPanel/BodiesPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/BodiesPanel/BodiesPanel.tsx) — `DEC-034`):**
  - Always rendered on `GalaxyView` (`data-testid="bodies-panel"`, `data-scope="galaxy"`, `data-center-id`, `data-aperture-radius-pc`), with **no orbital schematic**.
  - Heading: `Galactic Systems`
  - **3D Instrument Intersection (`active` vs `passive`):** The URL tracks only `focused`, `selected`, and instrument `center` + scale (`?dist=` / `?zoom=`). Which systems are `'active'` is deduced purely by 3D sphere intersection (`isInsideAperture(systemPos, centerCoordinatesPc, apertureRadiusPc)`). `<BodiesPanel scope="galaxy" />` lists all non-passive systems (`data-tier="focused" | "selected" | "active"`), ordered by 3D Euclidean distance from the focused system (or from the instrument centre when nothing is focused).
  - **Focus-Relative Distance Readout:** When a system is focused, renders `<p data-testid="bodies-distance-caption">Distances from {focusedSystemName}</p>`, marks the focused system with `data-testid="bodies-focused-origin-badge"` (`Focused (0 pc)`), and displays `data-testid="bodies-system-distance"` (`pc` linked to `/guide/metrics/distance?focus=...` + `ly`) on all other rows. When nothing is focused, row distances and the distance caption are omitted.
  - **2D $\leftrightarrow$ 3D Synchronisation & State-Preserving Links:** Hovering any row updates `store.setHovered(id)` (`data-hovered="true"`), and clicking a system link navigates to `/galaxy/<systemSlug>` while preserving active `?select=`, `?center=`, and camera/scale query parameters.

### 2.2 Search View (`/search` — [`src/views/SearchView.tsx`](file:///home/marcel/projects/starmap/src/views/SearchView.tsx))
- **Functional Component Boundary:** Root `<main data-testid="search-view-root">` composing `<Breadcrumbs />`, `<Search.Root>`, `<Search.Panel scope="search" />`, `<Search.Results />`, and `<SearchResultItem result={result} />`.
- **URL State & Intent:** Hydrates initial query (`?q=`) and category filter (`?searchCategory=`) from the URL on entry (including deep-links from Galaxy View's `View all search results` and per-category `View all <Heading>` links) and keeps `?q=` and `?searchCategory=` synchronised on every keystroke or filter change.
- **Untruncated Category Lists:** Displays full matching result lists across any of the 5 categories that have matches (without the Galaxy View's 3-item-per-category truncation), omitting headings and lists for categories with zero matches.

### 2.3 System View (`/system/$systemId` — [`src/views/SystemView.tsx`](file:///home/marcel/projects/starmap/src/views/SystemView.tsx))
- **Functional Component Boundary:** Root `<main data-testid="system-view-root">` composing `<CanvasLayer scope="system" />`, `<Breadcrumbs />` (`Galaxy > <System Name>`), `<Search.Root>`, `<Search.Panel scope="system" />`, `<Minimap orientation={minimapOrientation} />` (`data-testid="minimap-panel"`, `data-scope="system"`), `<ControlBar scope="system" />` (`data-testid="control-bar"`, `data-scope="system"`), `<DetailsPanel details={focusedDetails} />` (`data-testid="details-panel"`, rendered only when `?focus=` is active), `<PreviewPanel preview={focusedPreview} />` (`data-testid="preview-panel"`, rendered only when `?focus=` is active), and `<BodiesPanel elements={systemBodies} schematic={orbitalSchematic} />` (`data-testid="bodies-panel"`, `data-scope="system"`).
- **Minimap Panel (`<Minimap orientation={minimapOrientation} />`, [`src/components/domain/Minimap/Minimap.tsx`](file:///home/marcel/projects/starmap/src/components/domain/Minimap/Minimap.tsx)):**
  - Always rendered on `SystemView` (`data-testid="minimap-panel"`, `data-scope="system"`, `data-anchor-id`).
  - Exposes `<div data-testid="minimap-viewport-slot">`, system reference frame telemetry (`coordinatesPc`, `outerOrbitalRadiusAu`, `habitableZoneAu`, `orbitingBodyCount`, updating when `?center=<bodyId>` is active), and active `anchor`, `focused`, and `selected` body markers.
- **Control Bar (`<ControlBar scope="system" />`, `data-testid="control-bar"`, `data-scope="system"`):**
  - Always rendered on `SystemView` with Time Controller, Control Mode & Layer Toggles, and Keyboard Shortcut indicators.
- **Details Panel (`<DetailsPanel details={focusedDetails} />`, `data-testid="details-panel"`):**
  - Rendered only when `?focus=<slug>` is present in the URL (`focusedEntity !== null`).
  - Decomposes the focused entity (`'system' | 'star' | 'planet' | 'belt' | 'minor-body'`) into `Peek` (including `data-testid="details-hazard-summary"` and belt radial span/composition when `focusedKind === 'belt'`), `Partial` (`Details` / `Centre` / `Directions` CTAs at the top, followed by `Environmental Hazards`, `Canon Layers`, then `Stars`/`Planets`/`Circumstellar Belts & Disks` for `'system'` or `Orbiting Bodies` / `Resident Bodies` for `'planet'`/`'belt'`/`'minor-body'`), and `Full` (intrinsic telemetry including `Surface Gravity`, `Tidal Status`, `ESI`, or `Circumstellar Disk Telemetry` `data-testid="details-disk-telemetry-section"` + `Astrometry`) detents per `DEC-022`, `DEC-025`, `DEC-026`, `DEC-032`, and `DEC-035`.
- **Focus Preview Panel (`<PreviewPanel preview={focusedPreview} />`, [`src/components/domain/PreviewPanel/PreviewPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/PreviewPanel/PreviewPanel.tsx)):**
  - Rendered only when `?focus=<slug>` is present in the URL (`preview !== null`).
  - Heading: `Focus Preview` (`data-testid="preview-panel"`, `data-preview-mode="planetary-system" | "object-orbit" | "system-orbits"`), exposing the 3D preview mount slot (`data-testid="preview-canvas-slot"`), focused body inclination (`inclinationDeg`), eccentricity (`eccentricity`), semi-major axis (`semiMajorAxisAu`), and child orbit lines (`data-testid="preview-orbits-list"`).
- **Bodies Panel (`<BodiesPanel elements={systemBodies} schematic={orbitalSchematic} />`, [`src/components/domain/BodiesPanel/BodiesPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/BodiesPanel/BodiesPanel.tsx)):**
  - Heading: `System Bodies` (`data-testid="bodies-panel"`, `data-scope="system"`).
  - Per `DEC-023`, `DEC-024`, and `DEC-035`, embeds the `Orbital Schematic` (`<OrbitalSchematicList />` with `<OrbitalSchematicItem />` ordered from closest orbit `data-orbit-rank="0"` to furthest `1..N`, interleaving circumstellar belts/disks `data-kind="belt"` by radial distance with their `innerRadiusAu–outerRadiusAu AU` span, nesting planetary moons under planets and resident dwarf planets under their host belt via `item.children`, and linking spectral, planet-type, and habitable-zone badges) followed by deduplicated `Minor Bodies & Spacecraft` (`data-testid="bodies-minor-bodies-section"`).

### 2.4 Planet View (`/planet/$planetId` — [`src/views/PlanetView.tsx`](file:///home/marcel/projects/starmap/src/views/PlanetView.tsx))
- **Functional Component Boundary:** Root `<main data-testid="planet-view-root">` composing `<CanvasLayer scope="planet" />`, `<Breadcrumbs />` (`Galaxy` → `<System Name>` → `<Planet Name>`), `<Search.Root>` + `<Search.Panel scope="planet" />` + `<Search.Results />`, `<Minimap orientation={minimapOrientation} />` (`data-testid="minimap-panel"`, `data-scope="planet"`), `<ControlBar scope="planet" />` (`data-testid="control-bar"`, `data-scope="planet"`), `<DetailsPanel details={focusedDetails} />` (`data-testid="details-panel"`, rendered only when `?focus=` is active), `<PreviewPanel preview={focusedPreview} />` (`data-testid="preview-panel"`, rendered only when `?focus=` is active), and `<BodiesPanel elements={planetaryBodies} schematic={orbitalSchematic} />` (`data-testid="bodies-panel"`, `data-scope="planet"`).
- **Minimap Panel (`<Minimap orientation={minimapOrientation} />`, [`src/components/domain/Minimap/Minimap.tsx`](file:///home/marcel/projects/starmap/src/components/domain/Minimap/Minimap.tsx)):**
  - Always rendered on `PlanetView` (`data-testid="minimap-panel"`, `data-scope="planet"`, `data-anchor-id`).
  - Exposes `<div data-testid="minimap-viewport-slot">`, planetary subsystem reference frame telemetry (`parentSemiMajorAxisAu`, `orbitingBodyCount`, updating when `?center=<bodyId>` is active), and active `anchor`, `focused`, and `selected` body markers.
- **Control Bar (`<ControlBar scope="planet" />`, `data-testid="control-bar"`, `data-scope="planet"`):**
  - Always rendered on `PlanetView` with Time Controller, Control Mode & Layer Toggles, and Keyboard Shortcut indicators.
- **Details Panel (`<DetailsPanel details={focusedDetails} />`, `data-testid="details-panel"`):**
  - Rendered only when `?focus=<slug>` is present in the URL (`focusedEntity !== null`).
  - Displays the focused planet (`focusedKind === 'planet'`) or the focused orbiting moon / minor body (`focusedKind === 'minor-body'`) across `Peek` (including `data-testid="details-hazard-summary"`), `Partial` (`Centre` / `Directions` CTAs at the top, followed by `Environmental Hazards`, `Canon Layers`, then `Orbiting Bodies`), and `Full` (intrinsic telemetry including `Surface Gravity`, `Tidal Status`, `ESI` + `Astrometry`) detents per `DEC-022`, `DEC-026`, and `DEC-032`.
- **Focus Preview Panel (`<PreviewPanel preview={focusedPreview} />`, [`src/components/domain/PreviewPanel/PreviewPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/PreviewPanel/PreviewPanel.tsx)):**
  - Rendered only when `?focus=<slug>` is present in the URL (`preview !== null`).
  - Heading: `Focus Preview` (`data-testid="preview-panel"`, `data-preview-mode="object-orbit" | "planetary-system"`), exposing the 3D preview mount slot (`data-testid="preview-canvas-slot"`), focused body inclination (`inclinationDeg`), eccentricity (`eccentricity`), semi-major axis (`semiMajorAxisAu`), and child orbit lines (`data-testid="preview-orbits-list"`).
- **Bodies Panel (`<BodiesPanel elements={planetaryBodies} schematic={orbitalSchematic} />`, [`src/components/domain/BodiesPanel/BodiesPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/BodiesPanel/BodiesPanel.tsx)):**
  - Heading: `Planetary Bodies` (`data-testid="bodies-panel"`, `data-scope="planet"`).
  - Per `DEC-023` and `DEC-024`, embeds the `Orbital Schematic` (`<OrbitalSchematicList />` rendering the host planet `data-orbit-rank="0"` at the top followed by moons `data-orbit-rank="1..N"`) in place of the separate `Planet` and `Moons` lists, followed by deduplicated `Minor Bodies & Spacecraft` (`data-testid="bodies-minor-bodies-section"`).

### 2.5 Guide Views (`/guide/*` — `DEC-027`, `DEC-028`, `DEC-029` & `DEC-032`)
- **Top-Level Breadcrumbs, Persistent `Guide` ↔ `Map` Link, Shared Navigation & Full-Item List Links:**
  - `<Breadcrumbs />` starts at `Guide` (`Guide > Star Types [> <Star Type>]`, `Guide > Planet Types [> <Planet Type>]`, `Guide > Telemetry Metrics [> <Metric>]`, `Guide > Environmental Hazards [> <Hazard>]`), never nested inside `Galaxy`.
  - `<Breadcrumbs />` renders a persistent companion link (`data-testid="breadcrumbs-companion-link"`) next to the breadcrumb trail: on 3D views it links to `/guide/star-types` (`Guide`), and on Guide views it links to `/galaxy` (`Map`).
  - Shared `<nav aria-label="Guide sections" data-testid="guide-section-nav">` links `/guide/star-types`, `/guide/planet-types`, `/guide/metrics`, and `/guide/hazards`.
  - Every item card on `StarTypesListView`, `PlanetTypesListView`, `MetricsListView`, and `HazardsListView` links directly to its detail route.
- **3D Rendering Slots (`data-testid="guide-3d-preview"`):**
  - Rendered on every card in the list views and at the top of each detail view with common-scale radii (`data-radius-rsun`, `data-radius-rearth`), blackbody chromaticity colours (`data-chromaticity-hex`, `data-temp-k`), and hazard preview metadata (`data-hazard-id`, `data-hazard-domain`, `data-hazard-severity`). (True 3D cross-section cutaways are logged in `FS-011` for Stage 3 R3F integration.)
- **Interactive 3-Slice Yerkes Spectral Classification Combinator (`data-testid="star-type-combinator"` on `/guide/star-types/$starType`):**
  - Breaks any stellar classification (e.g. `G2V`, `G8.5V`) into 3 interactive slices (`data-testid="combinator-slice-class"` `O`–`D`, `data-testid="combinator-slice-subdivision"` `0`–`9`, and `data-testid="combinator-slice-luminosity"` `I`–`VII`), dynamically computing and updating the 3D star sphere's scale, colour, and physical telemetry (`data-testid="combinator-computed-telemetry"`).
- **Comparative Measures, Familiar Unit Conversions & Focused-Entity Comparison (`data-testid="metric-comparative-3d"`, `data-testid="metric-familiar-conversion"`):**
  - Both `MetricsListView` and `MetricDetailView` display familiar unit conversions (e.g. `pc` → `light-years (ly)`, `AU` → `light-minutes / million km`, `K` → `°C / °F`, `d` → `Earth years`).
  - Metric `<Unit>` links in `<DetailsPanel />` and `<PreviewPanel />` pass `?focus=<entityId>` so `/guide/metrics/$metricId?focus=<entityId>` renders a 3D comparative measure (`data-testid="metric-comparative-3d"`) comparing the focused entity (e.g. *Tau Ceti*, *Tau Ceti e*) directly against **Earth** or **Sol** in both scientific and familiar units.
- **Environmental Hazards Guide (`HazardsListView` at `/guide/hazards` & `HazardDetailView` at `/guide/hazards/$hazardId`):**
  - Catalogues all 8 system and planetary environmental hazards (`flare-star`, `ionising-radiation`, `variable-flux`, `extreme-heat`, `cryogenic-cold`, `high-gravity`, `tidal-locking`, `high-eccentricity`) with domain (`Stellar System Hazard` vs `Planetary Hazard`), severity tier, trigger threshold criteria, physical mechanism, operational impact, mitigation notes, and real-sky example links.

### 2.6 Route Finding, `<DirectionsPanel />` & 3D `<JourneyChord />` (`?route=` & `?journeyOption=` — `DEC-033`)
- **Shared `<DetentSheet />` Primitive ([`src/components/interface/surfaces/DetentSheet/DetentSheet.tsx`](file:///home/marcel/projects/starmap/src/components/interface/surfaces/DetentSheet/DetentSheet.tsx)):**
  - Provides the `Peek`, `Partial`, and `Full` detent structure shared between `<DetailsPanel />` (`testIdPrefix="details"`) and `<DirectionsPanel />` (`testIdPrefix="directions"`).
- **View, Selection & Focus Preservation (`buildDirectionsTriggerHref` & `syncUrlFocusToStore`):**
  - Clicking `Directions` (`data-testid="details-button-directions"`) keeps the current `pathname` and existing `search` parameters (`?q=`, `?select=`, `?focus=`), appending `?route=sol,<target>` in galaxy scope or `?route=earth,<target>` in system/planet scope.
  - Primary `focusedId` (`focusedIds[0]`) and `selectedIds` remain untouched; only `routeStops[0]` (the first item in `?route=`) is added to `focusedIds` under the hood for 3D canvas representation.
- **Two-Stage `<DirectionsPanel />` & Defensive Gating ([`src/components/domain/DirectionsPanel/DirectionsPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/DirectionsPanel/DirectionsPanel.tsx)):**
  - Replaces `<DetailsPanel />` in the same pane on `GalaxyView`, `SystemView`, and `PlanetView` whenever `?route=` is present in the URL.
  - **Gated `"Coming soon"` Mode (`status === 'coming-soon'`, `data-testid="directions-coming-soon"`):** Displayed when a route crosses between objects in different systems, includes non-system stops at the galaxy scope, or has identical origin and destination (`sol,sol` or `earth,earth`), suppressing 3D chords.
  - **Stage 1 — Options List (`!selectedOption`, `data-testid="directions-options-list"`):** Lists domain-specific propulsion/transfer options (`interstellar` relativistic/sublight vs `intra-system` brachistochrone/Hohmann) with each option's `topSummaryTime`.
  - **Stage 2 — Option Details (`selectedOption`, `data-testid="directions-option-telemetry-list"`):** Clicking an option sets `?journeyOption=<optionId>` and opens full telemetry stats (`Ship Proper Time`, `Coordinate Time`, `Peak Velocity`, `Lorentz Factor γ`, `Turnaround Point`, `Δv`, `Synodic Period`, `1-Way / Round-Trip Comms`, and per-step breakdowns) inside the same pane with a `Back to options` link (`data-testid="directions-back-to-options"`).
- **3D `<JourneyChord />` ([`src/components/canvas/entity/JourneyChord.tsx`](file:///home/marcel/projects/starmap/src/components/canvas/entity/JourneyChord.tsx)):**
  - Mounted inside `<CanvasLayer />` when `journeyLegs` is non-empty, rendering multi-leg 3D chords, $\Delta z$ elevation projection segments, waypoint markers, and `<SafeHtml>` midpoint callouts.

### 2.7 Unified Layer Exploration, `<LayerCard />` & Orbit-Context View Targeting (`?layer=` & `?select=layer:` — `DEC-036`–`DEC-040`)
- **Centralised Orbit-Context View Targeting (`buildEntityOrbitTargetHref` in [`src/services/details/navigationAndCamera.ts`](file:///home/marcel/projects/starmap/src/services/details/navigationAndCamera.ts)):**
  - Used consistently across Search, `<LayerCard />`, `<DetailsPanel />`, and `<BodiesPanel />`:
    - `system` / `structure` $\rightarrow$ `/galaxy/$systemSlug`
    - `star` / `planet` / `dwarf-planet` / `belt` / `minor-body` / `fictional-body` $\rightarrow$ `/system/$systemSlug?focus=<targetSlug>`
    - `moon` (bodies with planetary `parentBodyId`) $\rightarrow$ `/planet/$parentPlanetSlug?focus=<moonSlug>`
    - Parent Layer manifest $\rightarrow$ `/galaxy?select=layer:<layerSlug>&layer=<layerSlug>`
- **`Explore` Button in `<Search.Panel />` (`data-testid="search-explore-button"`):**
  - Picks a random curated layer (excluding the currently active `?layer=` if any) and navigates to `/galaxy?select=layer:<layerSlug>&layer=<layerSlug>`, illuminating all host star systems in that layer on the 3D starfield and opening `<LayerCard />` in Overview mode.
- **Non-Blocking `<LayerCard />` ([`src/components/domain/LayerCard/LayerCard.tsx`](file:///home/marcel/projects/starmap/src/components/domain/LayerCard/LayerCard.tsx)):**
  - Rendered without a backdrop scrim on `GalaxyView`, `SystemView`, and `PlanetView` whenever `?layer=` is present in the URL (`data-testid="layer-card"`, `data-layer-id`, `data-card-mode="overview" | "item"`):
  - **Overview Mode (`?layer=<layerSlug>`, `data-card-mode="overview"`):**
    - Displays Layer `kind` badge (`data-testid="layer-card-kind"`), `title` (`data-testid="layer-card-title"`), overall `description` (`data-testid="layer-card-description"`), item count (`data-testid="layer-card-count"`), optional authoritative `source` link (`data-testid="layer-card-source"`), **Start CTA** (`data-testid="layer-card-start"`, linking to Item 1 at its Orbit-Context target view with `?select=layer:<layerSlug>&layer=<layerSlug>:<firstItemSlug>`), and **Close** (`data-testid="layer-card-close"`).
  - **Item Mode (`?layer=<layerSlug>:<itemSlug>`, `data-card-mode="item"`):**
    - Displays Layer Overview back-link (`data-testid="layer-card-overview-link"`), step counter (`data-testid="layer-card-step"` e.g. `1 of N`), item `title` (`data-testid="layer-card-title"`), narrative `text` hook (`data-testid="layer-card-text"`), clickable thematic `tags` badges (`data-testid="layer-card-tags"`), optional `confidence` badge (`data-testid="layer-card-confidence"`), **Previous** (`data-testid="layer-card-prev"`, returning to `?layer=<layerSlug>` on Item 1), **Next** (`data-testid="layer-card-next"`, wrapping to Item 1 on Item $N$), and **Close** (`data-testid="layer-card-close"`, clearing `?layer=` while keeping the user on the current view and focused entity).
- **`<DetailsPanel />` Layer Annotation Deep-Links (`data-testid="details-canon-item-link"`):**
  - Clicking a layer annotation in `<DetailsPanel />` (`data-testid="details-canon-section"`) opens that specific item directly in `<LayerCard />` at its Orbit-Context target view (`?select=layer:<layerSlug>&layer=<layerSlug>:<itemSlug>`).


