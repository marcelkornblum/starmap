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
| **Journey 1: Target Acquisition & Travel Planning** | Locate target star, inspect intrinsic system summary, benchmark 2-point travel times, enter system, inspect planet | `[ ] Pending (Track 01)` |
| **Journey 2: Candidate Hunting & Territory Mapping** | Set spatial anchor, filter by radius & habitability intent, sync 2D candidate list ↔ 3D starfield, plot multi-leg route, export URL | `[ ] Pending (Track 02)` |
| **Journey 3: Serendipitous Discovery** | Trigger curated on-ramp prompt, view narrative hook & tags, step through tour waypoints (`Prev`/`Next`), expand or enter system | `[ ] Pending (Track 03)` |
| **Journey 4: Classification Deep-Dive** | Trigger classification deep-link `(i)`, inspect parameter ranges & Relative Parameter Comparator against familiar anchors, browse Category Index, return to origin | `[ ] Pending (Track 04)` |
| **Journey 5: Intra-System Logistics & Orbital Timing** | Select departure/arrival bodies in system, scrub orbital clock forward/backward, compare Hohmann vs Torchship transfers, flag solar conjunction blackout | `[ ] Pending (Track 05)` |

---

## 2. Discovered Views & On-Screen Data/Action Inventory

### 2.0 Global Navigation & URL Grammar (All Views)
- **Top-of-View Breadcrumbs (`<Breadcrumbs />`, [`src/components/domain/Breadcrumbs/Breadcrumbs.tsx`](file:///home/marcel/projects/starmap/src/components/domain/Breadcrumbs/Breadcrumbs.tsx)):**
  - Every view renders `<Breadcrumbs items={...} />` (`data-testid="view-breadcrumbs"`) at the top of the screen:
    - Main View (`/`, `/galaxy`, `/galaxy/$systemId`): `Galaxy` (or `Galaxy > <Focused Entity>`)
    - Search View (`/search`): `Galaxy > Search`
    - System View (`/system/$systemId`): `Galaxy > <System Name>` (or `Galaxy > <System Name> > <Focused Body>`)
    - Guide Views (`/guide/*`): `Galaxy > Guide: <Category>` (or `Galaxy > Guide: <Category> > <Term>`)
- **Orthogonal `?focus=` and `?select=` URL Grammar (`DEC-010`, [`src/router/index.tsx`](file:///home/marcel/projects/starmap/src/router/index.tsx)):**
  - `?focus=<entityId>` — Single focused entity (drives the `Focused` list and populates `<DetailsPanel>`).
  - `?select=<token1>,<token2>,...` — Comma-separated list of selection tokens (keeps `:` and `,` unencoded via custom `stringifyStarmapSearch`):
    - Plain entity/system slug: `sol`, `tau-ceti`, `keid`
    - Tag shortcut: `tag:<tagSlug>` (e.g. `?select=tag:habitable-candidate`, `?select=tag:exoplanet-host`)
    - Canon shortcut: `canon:<canonSlug>` (e.g. `?select=canon:project-hail-mary`, `?select=canon:star-trek`)
  - Composable: e.g. `/galaxy?select=canon:project-hail-mary&focus=tau-ceti` or `/galaxy?select=sol,keid&focus=tau-ceti`.

### 2.1 Main View (`/`, `/galaxy`, `/galaxy/$systemId` — [`src/views/MainView.tsx`](file:///home/marcel/projects/starmap/src/views/MainView.tsx))
- **Functional Component Boundary:** Composes `<Breadcrumbs />`, `<Search.Root>`, `<Search.Panel />`, `<Search.Results />` ([`src/components/search/Search.tsx`](file:///home/marcel/projects/starmap/src/components/search/Search.tsx)), `<SearchResultItem>` ([`src/components/domain/SearchResultItem/SearchResultItem.tsx`](file:///home/marcel/projects/starmap/src/components/domain/SearchResultItem/SearchResultItem.tsx)), the `Systems` (`Focused` & `Selected`) panel, and `<DetailsPanel>` ([`src/components/domain/DetailsPanel/DetailsPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/DetailsPanel/DetailsPanel.tsx)).
- **Search Panel (`<Search.Panel />`, `data-testid="search-panel"`):**
  - Heading: `Search`
  - Query input (`<input type="search" name="query" />` — triggers search immediately on each key press and dynamically syncs the `?q=` URL GET parameter via `history.replaceState`)
  - Clear search button (`<button type="button" data-testid="search-clear-button">Clear search</button>` — clears the search term, removes `?q=` from the URL bar, and hides the `Search Results` panel)
  - Category Filter select (`<select name="filter">` — triggers search immediately on selection change and syncs `?searchCategory=` when non-default):
    - `all`: `All Categories`
    - `stars`: `Stars & Stellar Systems`
    - `planets`: `Planets, Exoplanets & Moons`
    - `structures`: `Galactic Structures & Deep Sky`
    - `minor-bodies`: `Solar System Minor Bodies`
    - `fiction`: `Fictional Canons & Works`
- **Search Results Panel (`<Search.Results searchViewPath="/search" />`, `data-testid="search-results-panel"`):**
  - **Conditional Visibility:** Hidden completely when the search query is empty (`query.trim().length === 0`).
  - Heading: `Search Results`
  - Full search view link (`<a href="/search?q=..." data-testid="search-view-link">View all search results</a>`)
  - Result group sections (`<h3>` + filtered `/search` link `<a href="/search?q=...&searchCategory=<category>" data-testid="search-category-link-<category>">View all <Heading></a>` + populated `<ul>` of matching `<SearchResultItem result={result} />` domain rows truncated to **3 per category** via `limitPerCategory={3}` on Main View). **Empty categories (`group.items.length === 0`) are omitted completely—neither their heading nor an empty list is rendered:**
    - `Stars & Stellar Systems` (`stars`)
    - `Planets, Exoplanets & Moons` (`planets`)
    - `Galactic Structures & Deep Sky` (`structures`)
    - `Solar System Minor Bodies` (`minor-bodies`)
    - `Fictional Canons & Works` (`fiction`)
  - **Domain Search Result Item Component (`<SearchResultItem result={result} />`, [`src/components/domain/SearchResultItem/SearchResultItem.tsx`](file:///home/marcel/projects/starmap/src/components/domain/SearchResultItem/SearchResultItem.tsx)):**
    - Domain component that accepts a `SearchResultItem` record and unpacks its fields to render an unstyled semantic stub (`<li data-testid="search-result-item">`) with CUBE `data-*` state attributes (`data-category`, `data-entity-kind`, `data-reticle`, `data-target-view`, `data-entity-id`, `data-system-id`) and category-specific variations (visual styling deferred to Stage 2):
      - **Base elements (all variations):**
        - Anchor link (`<a href={href}>{name}</a>` — captures strictly state and intent in the URL; secondary telemetry is collected from data):
          - System-level or top-level galactic targets link to `/galaxy/<systemname>` (e.g. `/galaxy/tau-ceti`)
          - Child items inside a system on Galaxy View (exoplanets, fictional worlds) link to `/galaxy/<systemname>?focus=<itemname>` (e.g. `/galaxy/tau-ceti?focus=tau-ceti-e`, `/galaxy/tau-ceti?focus=adrian`)
          - Solar System child bodies (`isSolarSystem && systemId === 'sol'`) link to `/system/sol?focus=<itemname>` (e.g. `/system/sol?focus=earth`)
        - Reticle classification badge (`<span data-testid="result-reticle-type">[{reticleType}]</span>`)
      - **Variation `stars` (`data-testid="result-variation-stars"`):** Unpacks `spectralType` `<Badge category="star">` linking to `/guide/star-types/$starType` (`data-testid="result-spectral-badge"`) and `planetCount` summary (`data-testid="result-planet-summary"`).
      - **Variation `planets` (`data-testid="result-variation-planets"`):** Unpacks planet sub-kind attribute (`data-planet-kind="planet" | "moon" | "dwarf-planet"`).
      - **Variation `structures` (`data-testid="result-variation-structures"`):** Deep-sky structure variation hook.
      - **Variation `minor-bodies` (`data-testid="result-variation-minor-bodies"`):** Solar System minor-body variation hook.
      - **Variation `fiction` (`data-testid="result-variation-fiction"`):** Unpacks canon work/franchise title (`canonTitle`).
      - **Omitted fields:** Heliocentric parsec (`pc`) distance numbers are omitted from result rows.
- **Systems Panel (`data-testid="systems-panel"`):**
  - Synchronised to `SpatialEntityStore`:
    - `Focused` (`<ul data-testid="systems-focused-list">`) — populated from `/galaxy/$systemId` or `?focus=<entityId>`.
    - `Selected` (`<ul data-testid="systems-selected-list">`) — populated from active search results (`?q=`) or `?select=` tokens (`tag:<slug>`, `canon:<slug>`, `<entityId>`).
- **Details Panel (`<DetailsPanel details={focusedDetails} />`, `data-testid="details-panel"`):**
  - Rendered only when an entity is focused (`details !== null`).
  - Broken into 3 detent sections (`Peek`, `Partial`, `Full`) consuming the `FocusedEntityDetails` discriminated union (`focusedKind: 'system' | 'star' | 'planet' | 'minor-body' | 'structure'`).

### 2.2 Search View (`/search` — [`src/views/SearchView.tsx`](file:///home/marcel/projects/starmap/src/views/SearchView.tsx))
- **Functional Component Boundary:** Dedicated full-results search view composing `<Breadcrumbs />`, `<Search.Root>`, `<Search.Panel />`, `<Search.Results />`, and `<SearchResultItem result={result} />`.
- **URL State & Intent:** Hydrates initial query (`?q=`) and category filter (`?searchCategory=`) from the URL on entry (including deep-links from Main View's `View all search results` and per-category `View all <Heading>` links) and keeps `?q=` and `?searchCategory=` synchronised on every keystroke or filter change.
- **Untruncated Category Lists:** Displays full matching result lists across any of the 5 categories that have matches (without the Main View's 3-item-per-category truncation), omitting headings and lists for categories with zero matches.

### 2.3 System View (`/system/$systemId` — [`src/views/SystemView.tsx`](file:///home/marcel/projects/starmap/src/views/SystemView.tsx))
- **Functional Component Boundary:** Dedicated intra-system inspection view composing `<Breadcrumbs />`, `Bodies` panel (`data-testid="bodies-panel"`), `<DetailsPanel details={focusedDetails} />` (`data-testid="details-panel"`), and `<SystemElementsPanel elements={systemElements} />` (`data-testid="system-elements-panel"`).
- **Bodies Panel (`data-testid="bodies-panel"`):**
  - Heading: `Bodies`
  - `Focused` (`<ul data-testid="bodies-focused-list">`) — the active focused body or system root (`/system/$systemId` defaults to focusing the host system; `/system/$systemId?focus=<bodySlug>` focuses the specified star, planet, moon, dwarf planet, or minor body).
  - `Selected` (`<ul data-testid="bodies-selected-list">`) — highlighted bodies resolved from `?select=`.
- **Details Panel (`<DetailsPanel details={focusedDetails} />`, `data-testid="details-panel"`):**
  - Decomposes the focused entity into `Peek`, `Partial`, and `Full` detents tailored to `focusedKind`:
    - **When `focusedKind === 'system'` or `'star'`:**
      - `Peek`: Header with reticle type, spectral `<Badge category="star">`, star count, system-wide planet composition breakdown (`data-testid="details-planet-composition"`), and system summary (`data-testid="details-system-summary"`). When `focusedKind === 'star'`, includes component & magnitude peek line.
      - `Partial`: `Stellar Telemetry` (for `'star'`), `Astrometry` (`System ID`, `Sector`, `Coordinates`, clickable `Tags` badges), and `Details` / `Directions` actions.
      - `Full`: `Canon Layers`, `Stars` list (`data-testid="details-stars-section"`), and `Planets` list (`data-testid="details-planets-section"`).
    - **When `focusedKind === 'planet'`:**
      - `Peek`: Planet header (`<Planet Name> (<System Name>) [<composition>]`), planet telemetry peek line (composition badge, habitable zone badge, `a` in `AU`, `P` in `d`, mass in `M⊕`, `T_eq` in `K`), and a **planet-specific summary** (`data-testid="details-system-summary"`: `"<Planet> is a <composition> planet orbiting <System>, within the [habitable zone candidate] with <N> catalogued bodies in orbit."`). System-wide star count and planet composition summary (`7 planets (...)`) are omitted.
      - `Partial`: `Planetary Telemetry` (`Composition`, `Habitable Zone`, `Semi-Major Axis`, `Orbital Period`, `Eccentricity`, `Mass`, `Equilibrium Temp`, `Discovery`), `Astrometry`, and actions (`Details` link `data-testid="details-button-system-details"` points directly to `/planet/$planetId`).
      - `Full`: `Canon Layers` (specific to the planet + host system) and `Orbiting Bodies` (`data-testid="details-orbiting-bodies-section"`, listing moons and any other catalogued bodies in orbit around that planet with links to `/system/$systemId?focus=<bodySlug>` on System View or `/planet/$planetId?focus=<bodySlug>` on Planet View). System-wide `Stars` and `Planets` lists are omitted.
    - **When `focusedKind === 'minor-body'`:**
      - `Peek`: Body header, classification badge + parent body name, and body-specific summary (`"<Name> is a <moon|dwarf planet|asteroid / minor body> orbiting <ParentBody>."`).
      - `Partial`: `Body Telemetry` (`Classification`, `Host System` / parent body) and `Astrometry`.
      - `Full`: `Canon Layers` and `Orbiting Bodies` (if the body has moons, e.g. Pluto → Charon).
- **System Elements Panel (`<SystemElementsPanel elements={systemElements} />`, [`src/components/domain/SystemElementsPanel/SystemElementsPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/SystemElementsPanel/SystemElementsPanel.tsx)):**
  - Shows every catalogued element in the host system broken into sections (`Stars`, `Planets`, `Moons & Dwarf Planets`, `Minor Bodies & Spacecraft`, `Canon Layers`), with each body name linking to `/system/$systemId?focus=<bodySlug>` and highlighting the currently focused body (`data-focused="true"`).

### 2.4 Planetary View (`/planet/$planetId` — [`src/views/PlanetView.tsx`](file:///home/marcel/projects/starmap/src/views/PlanetView.tsx))
- **Functional Component Boundary:** Dedicated planetary system inspection view composing `<Breadcrumbs />` (`Galaxy` → `<System Name>` → `<Planet Name>`, or `Galaxy` → `<System Name>` → `<Planet Name>` → `<Focused Orbiting Body>` when `?focus=<bodySlug>` is set), `<Search.Root>` + `<Search.Panel />` + `<Search.Results />`, `Bodies` panel (`data-testid="bodies-panel"`), `<DetailsPanel details={focusedDetails} />` (`data-testid="details-panel"`), and `<PlanetaryElementsPanel elements={planetaryElements} />` (`data-testid="planetary-elements-panel"`).
- **Bodies Panel (`data-testid="bodies-panel"`):**
  - Heading: `Bodies`
  - `Focused` (`<ul data-testid="bodies-focused-list">`) — defaults to focusing the host planet from `/planet/$planetId`, or focuses the orbiting body specified by `?focus=<bodySlug>`.
  - `Selected` (`<ul data-testid="bodies-selected-list">`) — highlighted bodies resolved from `?select=` or `?q=`.
- **Details Panel (`<DetailsPanel details={focusedDetails} />`, `data-testid="details-panel"`):**
  - Displays the focused planet (`focusedKind === 'planet'`) or the focused orbiting moon / minor body (`focusedKind === 'minor-body'`) across `Peek`, `Partial`, and `Full` detents.
- **Planetary Elements Panel (`<PlanetaryElementsPanel elements={planetaryElements} />`, [`src/components/domain/PlanetaryElementsPanel/PlanetaryElementsPanel.tsx`](file:///home/marcel/projects/starmap/src/components/domain/PlanetaryElementsPanel/PlanetaryElementsPanel.tsx)):**
  - Heading: `Orbital Bodies` (`data-testid="planetary-elements-panel"`).
  - Shows the host planet (`Planet` section, `data-testid="planetary-elements-planet-section"`) and all catalogued orbital bodies and annotations broken into structured sections (`Moons` `data-testid="planetary-elements-moons-section"`, `Minor Bodies & Spacecraft` `data-testid="planetary-elements-minor-bodies-section"`, and `Canon Layers` `data-testid="planetary-elements-canon-section"`), with each moon or orbital body linking to `/planet/$planetId?focus=<bodySlug>`.

### 2.5 Guide Views (`/guide/*`)
- **Star Types Guide (`/guide/star-types` — [`src/views/StarTypesListView.tsx`](file:///home/marcel/projects/starmap/src/views/StarTypesListView.tsx), `/guide/star-types/$starType` — [`src/views/StarTypeDetailView.tsx`](file:///home/marcel/projects/starmap/src/views/StarTypeDetailView.tsx)):**
  - Linked from all spectral class `<Badge category="star">` pills across Search and Details panels.
- **Planet Types Guide (`/guide/planet-types` — [`src/views/PlanetTypesListView.tsx`](file:///home/marcel/projects/starmap/src/views/PlanetTypesListView.tsx), `/guide/planet-types/$planetType` — [`src/views/PlanetTypeDetailView.tsx`](file:///home/marcel/projects/starmap/src/views/PlanetTypeDetailView.tsx)):**
  - Linked from all planetary composition `<Badge category="planet">` pills (`terrestrial`, `ice-giant`, `gas-giant`).
- **Telemetry Metrics Guide (`/guide/metrics` — [`src/views/MetricsListView.tsx`](file:///home/marcel/projects/starmap/src/views/MetricsListView.tsx), `/guide/metrics/$metricId` — [`src/views/MetricDetailView.tsx`](file:///home/marcel/projects/starmap/src/views/MetricDetailView.tsx)):**
  - Linked from `<Unit>` badges inside `<Quantity>` components (`AU` → `semi-major-axis`, `d` → `orbital-period`, `M⊕` → `planetary-mass`, `K` → `equilibrium-temperature`, `V`/`M_V` → `stellar-magnitude`, `pc` → `galactic-coordinates`).


