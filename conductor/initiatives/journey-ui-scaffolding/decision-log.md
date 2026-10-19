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

---

### DEC-004: Minified 1-Letter Key Runtime JSON Format, Space-Delimited Clean Keys & Sharded Search Indices
- **Date:** 2026-10-17
- **Status:** `Ratified`
- **Scope:** Data Pipeline Export Formats (`public/data/`) & Search Index Architecture
- **Context:** Uncompressed JSON exports in `public/data/` totalled $171.5\text{ MB}$ due to verbose property names, nested coordinate/velocity/orbit objects, and repeated default values across 331,312 stars. Additionally, normalising ~120,000 raw alias strings at runtime would cause 150–300 ms main-thread pauses and V8 heap churn on older hardware.
- **Options Considered:**
  1. *Keep Verbose JSON & Normalise Raw Aliases on Client Load:*
     - *Trade-off:* High file size ($171.5\text{ MB}$ total; $3.4\text{ MB}$ full search index) and ~240,000 temporary string allocations on load.
  2. *1-Letter Object Keys, Tuple Packing (`p`, `v`, `o`), Default Omission, Space-Delimited Clean Keys (`a`), plus Dual-Tier (`core`/`full`) and Category-Sharded Search Indices (`public/data/search/*.json`):*
     - *Trade-off:* Requires a clear key reference (`public/data/README.md`), but cuts total JSON footprint by ~68%, eliminates hundreds of thousands of V8 sub-object/array allocations, and costs $0\text{ ms}$ client normalisation time.
- **Decision:** Adopt **Option 2**:
  - All runtime JSON exports use zero whitespace, 1-letter keys, packed numeric tuples (`p`, `v`, `o`), and default omission as documented in `public/data/README.md`.
  - Search index entries store pre-normalised lowercase clean keys packed into a single space-delimited string (`a: "tauceti taucet hd10700 hip8102 gj71"`).
  - Emit both sizes of unified index (`public/data/search/core.json` and `public/data/search/full.json`) as well as category-sharded indices (`stars.json`, `planets.json`, `structures.json`, `minor-bodies.json`, `fiction.json`) to support filtered category searches.

---

### DEC-005: Nomenclature Expansion, Substring-Deduplicated Clean Keys & Multi-Key Exoplanet Join (Step 1)
- **Date:** 2026-10-17
- **Status:** `Ratified`
- **Scope:** `scripts/build-data.ts` & Astronomical Nomenclature
- **Context:** HYG stores 3-letter Greek and IAU constellation abbreviations (`"Tau Cet"`, `"Eps Eri"`), `loadHygCrossMatch` omitted `gl` (Gliese), and `buildGaiaDataPipeline` joined exoplanets using only a single normalised key, missing planets filed under expanded names (`"tau Ceti"`) or `HD`/`HIP`/`GJ` identifiers.
- **Decision:**
  1. **Primary Display Name (`n`):** Keep IAU proper name primary for now, followed by expanded Bayer/Flamsteed + Latin constellation genitive (`"Tau Ceti"`, `"82 G. Eridani"`, `"Beta Pictoris"`), then `Gliese`, `HIP`, `HD`, `HR`.
  2. **Clean-Key Substring Deduplication:** When generating clean keys for an object, if one clean key is a contiguous substring of another clean key for the same object (e.g., `"taucet"` inside `"tauceti"`), discard the shorter substring and keep only the longer key.
  3. **Multi-Key Exoplanet Join (Including Retracted Candidates):** Include all entries from the exoplanet catalogues (including retracted candidates in OEC) and union matches across all of a star's candidate keys (proper name, expanded/abbreviated Bayer & Flamsteed, `HD`, `HIP`, `Gl`/`GJ`/`Gliese`).

---

### DEC-006: Uniform 36-Bucket Keyed Dictionary Shards (`summaries/` & `details/`) and Unified Sector Dictionary Format (Step 2)
- **Date:** 2026-10-17
- **Status:** `Ratified`
- **Scope:** Runtime Data Sharding, `O(1)` ID Lookup & Spatial Sector Partitions (`public/data/`)
- **Context:** Multi-result searches (`FS-003`) can span dozens of $25\text{ pc}$ spatial sectors, and direct `id` lookups (from search results or deep links) for stars, planets, structures, or minor bodies previously required either knowing the spatial `sectorId` upfront or downloading monolithic multi-megabyte files (`orbital-elements-asteroids.json`, `galactic-structures.json`) and scanning arrays in $O(N)$. Naive first-letter sharding fails on astronomical catalogs because tens of thousands of IDs share prefixes (`gaia-`, `hip-`, `hd-`, `ngc-`).
- **Decision:**
  1. **Deterministic 36-Bucket Shard Key (`0`–`9`, `a`–`z`):** Use a deterministic 32-bit FNV-1a hash modulo 36 (`getShardKey(id)`) to distribute all entity IDs uniformly across 36 shard buckets (`0.json` .. `z.json`).
  2. **Keyed JSON Dictionaries (`Record<id, CompactRecord>`) Across Both ID Shards and Spatial Sector Shards:**
     - Store records inside `public/data/summaries/<0..z>.json`, `public/data/details/<0..z>.json`, `public/data/partitions/sector_*.json` (`d`), and `public/data/systems/sector_*.json` (`d`) as keyed JSON dictionaries (`{ "<id>": { ... } }`) rather than arrays, enabling $O(1)$ lookup (`shard.d[id]`) and eliminating redundant `"i":"<id>"` properties inside each value.
  3. **Inline Search Summary Tuple (`m`):** Include `m: [mag, spect, planetCount, hasHabitable]` on search index entries (and derive `sectorId` mathematically from `p: [x, y, z]`) so search results immediately have core summary metrics in memory with zero extra network requests, while `summaries/<0..z>.json` and `details/<0..z>.json` provide instant ~8–10 KB (gzipped) $O(1)$ lookups by `id` for any entity.

---

### DEC-007: Unified Dataset Layering Data Model, Bibliographic Source Block, Flattened Node Entries & Custom Authoring Skill (`FS-001` & `FS-002` — Step 3)
- **Date:** 2026-10-17
- **Status:** `Ratified`
- **Scope:** `src/types/astro.ts`, `src/utils/datasetLayerCodec.ts`, `scripts/build-data.ts`, `public/data/overlays/layers/` & `.agents/skills/canon-layer-author/SKILL.md`
- **Context:** To support Fictional Universe Canon Layers (`FS-001`) and Custom User Note Layers (`FS-002`) at the data layer without hardcoding fictional lore into core astronomical records, both built-in canon layers and user-created note layers need an identical, compact, $O(1)$-addressable data contract. Additionally, the user requested a bibliographic metadata block on the main layer node, a flattened single-note entry structure (no nested `snippets` array), a mandatory real host `systemId` on every entry (so Galactic View can always highlight the parent star system even for fictional worlds like *Reach* or *Vulcan*), and a reusable agent skill for authoring canon layers from source material.
- **Decision:**
  1. **Unified Layer Schema (`DatasetLayerManifest` / `CompactLayerManifest`):**
     - Envelope: `i` (`layerId`), `n` (`title`), `k` (`1 = fictional-canon`, `2 = custom-user`, `3 = scientific-overlay`), `d` (`description`), `v` (`version`), `b` (`source`: `DatasetLayerSourceMeta` with `s` = `summary`, `a` = `creator`, `y` = `publicationYear`, `m` = `medium`, `r` = `canonicalReference`, `u` = authoritative `url`), and `e` (`Record<targetId, CompactLayerEntry>`).
     - Flattened Entry (`e[targetId]`): `k` (`targetType`: `1 = system` default/omitted, `2 = planet`, `3 = moon`, `4 = structure`, `5 = minor-body`, `6 = fictional-body`), `s` (`systemId` of real host star system, omitted when `s === targetId`), `u` (`inUniverseName`), `x` (`text`), `w` (`workTitle`), `a` (`aliases` string array), `g` (`tags` string array), and `c` (`confidence`, omitted when `'confirmed'`).
     - Purely fictional star systems with no real-sky counterpart in the 100-pc catalog are excluded.
  2. **Search Integration:** Layer entries contribute searchable `k: 7` (`fiction`) items with `w: layerId`, `s: entry.systemId` (ensuring Galactic View always highlights the parent star system), `p: [x, y, z]`, and substring-deduplicated `a` clean keys into `public/data/search/fiction.json`, `core.json`, and `full.json`.
  3. **Custom Workspace Skill (`.agents/skills/canon-layer-author/SKILL.md`):** Created a 5-step interactive authoring skill instructing agents to extract bibliographic metadata, resolve an authoritative `source.url` (preferring Wikipedia or primary canonical encyclopedia and surfacing the choice at the review checkpoint), cross-match entities against the 100-pc catalog, halt for user ratification, and emit/verify the layer.

---

### DEC-008: Observational Confidence Tier (`C`/`c`) & Theoretical Field Bitmask (`f`) Across All Runtime Datasets
- **Date:** 2026-10-17
- **Status:** `Ratified`
- **Scope:** `src/types/astro.ts`, `src/utils/compactDataCodec.ts`, `src/utils/datasetLayerCodec.ts`, `scripts/build-data.ts`
- **Context:** Starmap's visual language (`docs/ui-visual-language.md` and `<ConfidencePip>`) defines 4 observational confidence tiers (`confirmed`, `candidate`, `theoretical`, `unverified`). Several fields in `scripts/build-data.ts` are derived from astrophysical models when raw catalog columns are blank (e.g. radiative $T_{\text{eq}}$ with $A=0.3$, asteroid radius from $H$-magnitude, spectral class from $G_{BP}-G_{RP}$, representative distances for SNRs/pulsars/dark nebulae), and raw catalogs contain explicit uncertainty flags (`e_Plx / Plx` in Gaia DR3, NASA vs. OEC candidate status, MPC orbit uncertainty `U`).
- **Decision:**
  1. **Record-Level Confidence (`C?: 2 | 3 | 4` on astro records, `c?: 2 | 3 | 4` on layer entries):** Omit `1` (`'confirmed'`) by default so confirmed records incur zero byte overhead; encode `2 = 'candidate'`, `3 = 'theoretical'`, `4 = 'unverified'`.
  2. **Theoretical Field Bitmask (`f?: number`, omitted when `0`):**
     - `THEORETICAL_STAR_FLAGS`: bit `1` = `spect` estimated from $G_{BP}-G_{RP}$; bit `2` = radial velocity absent ($v_r = 0$ assumed).
     - `THEORETICAL_PLANET_FLAGS`: bit `1` = `equilibriumTempK` derived from radiative equilibrium; bit `2` = `massMearth` modelled; bit `4` = `radiusRearth` modelled; bit `8` = `esi` computed from modelled inputs.
     - `THEORETICAL_STRUCTURE_FLAGS`: bit `1` = `dist` uses representative survey distance.
     - `THEORETICAL_SOLAR_FLAGS`: bit `1` = `meanRadiusKm` estimated from $H$-magnitude and assumed albedo.

---

### DEC-009: Three-Layer Search Architecture — Data Repository, Pure Service Layer, and Compound `<Search.*>` Component Boundary
- **Date:** 2026-10-17
- **Status:** `Ratified`
- **Scope:** `src/data/searchRepository.ts`, `src/services/searchService.ts`, `src/components/search/Search.tsx`, `src/views/MainView.tsx`
- **Context:** Inspired by the *Two Scoops of Django* Service Layer pattern, domain search logic must live in stateless, deterministic unit functions separated from both data-fetching plumbing and view presentation, while views need a first-level React component boundary so multiple views can adopt search cleanly and isolate React state re-renders from sibling view trees.
- **Options Considered:**
  - *Option A (Compound Components Boundary — `<Search.Root>`, `<Search.Panel>`, `<Search.Results>`):* React Context boundary binding the repository and pure service functions while allowing views to place the search form and results panels in arbitrary layout slots.
  - *Option B (Headless Render-Prop Component — `<SearchBoundary>`):* Single render-prop controller requiring each view to re-implement form and result markup.
  - *Option C (Monolithic `<SearchWorkspace>`):* Fixed single-block layout coupling input and results together.
- **Decision:** Ratified **Option A** backed by the 3-layer separation:
  1. **Data Repository (`src/data/searchRepository.ts`):** Fetches, validates, deduplicates, and caches `public/data/search/*.json` shards in memory on demand.
  2. **Pure Service Layer (`src/services/searchService.ts`):** Stateless unit functions (`normaliseSearchQuery`, `scoreSearchEntry`, `executeCatalogSearch`) handling Bayer/Flamsteed expansion, exact/prefix/alias/multi-token scoring, relational child lookup via `entry.s` (`systemId`), and category grouping.
  3. **Compound Component Boundary (`src/components/search/Search.tsx`):** `<Search.Root>`, `<Search.Panel>`, and `<Search.Results>` consumed by `MainView` (`/`) and reusable across future views.

### DEC-009: Route-to-View Mapping & Granular Search Compound Composition
- **Status:** Ratified
- **Date:** 2026-10-17
- **Context:** Defining how top-level URLs map to Views across the application and how the `<Search>` compound component adapts to global chrome vs dedicated search vs embedded/contextual pickers.
- **Decision:**
  1. **Route-to-View Mapping:**
     - `/`, `/galaxy`, and `/galaxy/$systemId` all mount [`MainView`](file:///home/marcel/projects/starmap/src/views/MainView.tsx) (`data-testid="clean-slate-root"`).
     - `/search` (`?q=&searchCategory=`) mounts [`SearchView`](file:///home/marcel/projects/starmap/src/views/SearchView.tsx) (`data-testid="search-view-root"`).
     - `/system/$systemId` (`?focus=`) mounts a dedicated [`SystemView`](file:///home/marcel/projects/starmap/src/views/SystemView.tsx) (`data-testid="system-view-root"`).
  2. **Search Sub-Component Granularity:**
     - `<Search.Input />` always bundles the query `<input type="search">` and the `Clear search` `<button>` together as an indivisible unit (whenever a view has a search input, it always includes the clear button).
     - `<Search.CategoryFilter />` renders the category `<select name="searchCategory">` independently so contexts that hardcode a category (`initialFilter="stars"`) or do not need category filtering can compose `<Search.Panel><Search.Input /></Search.Panel>` without the dropdown.
     - `<Search.Panel />` defaults to rendering `<Search.Input />` + `<Search.CategoryFilter />` when no custom `children` are passed.
  3. **Contextual Picker Support & URL Parameter Naming:**
     - Category filtering in URLs uses the explicit `?searchCategory=` GET parameter so it does not collide with future view filters.
     - `<Search.Root>` supports `limitPerCategory` (3 on `MainView` / `SystemView`, unlimited on `SearchView`), `syncUrl={false}` for embedded pickers that should not mutate the URL bar, `initialFilter` for hardcoded category scopes, and `onSelectResult` to intercept result selection when picking an entity into local state rather than navigating.

---

### DEC-010: Precalculated Data Pipeline, Discriminated Details Model, & Orthogonal `?focus=` / `?select=` URL Grammar
- **Date:** 2026-10-17
- **Status:** `Ratified`
- **Scope:** `scripts/build-data.ts`, `src/utils/compactDataCodec.ts`, `src/data/guideCatalog.ts`, `src/services/searchService.ts`, `src/services/detailsService.ts`, `src/components/domain/DetailsPanel/DetailsPanel.tsx`, `src/router/index.tsx`
- **Context:** Consolidating architectural hygiene across data precalculation, details view modeling, and URL query parameter grammar before expanding further screens.
- **Decision:**
  1. **Zero Hardcoding & Full Data-Layer Precalculation:**
     - All entity reticle classifications (`u`), planetary compositions (`c` / `u`), habitable-zone flags (`z` / `h`), system planet composition breakdowns (`b: [terrestrial, iceGiant, gasGiant]`), and system tag bitmasks (`g`) are precalculated at build time in `scripts/build-data.ts` and `src/utils/compactDataCodec.ts`.
     - Sol's star body is stored under `'sol-A'` in `detailsByBucket` so `details/s.json['sol']` holds Sol's full `SystemManifest` (`t: 'sys'`).
  2. **Structured Details Model & 5-Way Discriminated Union:**
     - `FocusedEntityDetails` in `src/services/detailsService.ts` is a 5-way discriminated union on `focusedKind` (`'system' | 'star' | 'planet' | 'minor-body' | 'structure'`), exposing structured `planetCompositionBreakdown` and `systemSummarySegments` arrays so `DetailsPanel.tsx` renders zero stringly-typed regex splits and omits stellar-system-only Peek fields when `focusedKind === 'structure'`.
     - Guide catalog constants and href builders live in `src/data/guideCatalog.ts`.
  3. **Orthogonal `?focus=` and `?select=` URL Query Parameter Grammar:**
     - `?focus=<entityId>` is strictly single-entity (`string | undefined`), opening `DetailsPanel` and focusing that entity.
     - `?select=<tokens>` accepts a comma-separated list of explicit entity IDs (`sol,tau-ceti`), tag shortcuts (`tag:habitable-candidate`, `tag:exoplanet-host`), and canon shortcuts (`canon:project-hail-mary`), resolving and unioning all matching entities into `SpatialEntityStore.selectedIds`.
     - `createRouter` in `src/router/index.tsx` configures `stringifySearch` (`stringifyStarmapSearch`) to keep RFC 3986 `:` and `,` characters unencoded in the URL bar.

---

### DEC-011: Planet-Focused `<DetailsPanel>` & Precalculated Orbiting Bodies (`o: parentBodyId`)
- **Date:** 2026-10-17
- **Status:** `Ratified`
- **Scope:** `src/utils/compactDataCodec.ts`, `src/services/detailsService.ts`, `src/components/domain/DetailsPanel/DetailsPanel.tsx`
- **Context:** When a planet is focused on the System View (`/system/$systemId?focus=<planetSlug>`), `<DetailsPanel>` was previously rendering host-system information (the host system's `overviewText` or system summary sentence, the system-wide `N planets (...)` composition summary in `Peek`, and the system-wide `Stars` and `Planets` lists in `Full`).
- **Decision:**
  1. **Planet-Specific Summary Sentence (`data-testid="details-system-summary"`):**
     - `manifestOverview` (`sysManifest.overviewText`) is restricted to `focusedKind === 'system'`.
     - When `focusedKind === 'planet'`, `buildIntrinsicSystemSummarySegments` generates a planet-specific summary: `"<Planet> is a [<composition>] planet orbiting <System>, within the [habitable zone candidate] with <N> catalogued bodies in orbit."`
  2. **Omit Host-System Aggregates on Planet Focus:**
     - When `focusedKind === 'planet'` (or `'minor-body'`), `Peek` omits the host star spectral badge, star count (`data-testid="details-star-count"`), and system-wide planet composition breakdown (`data-testid="details-planet-composition"`).
     - `Full` omits the system-wide `Stars` (`data-testid="details-stars-section"`) and `Planets` (`data-testid="details-planets-section"`) lists when `focusedKind === 'planet'`.
  3. **Orbiting Bodies List (`data-testid="details-orbiting-bodies-section"`):**
     - `CompactSearchEntry` in `src/utils/compactDataCodec.ts` precalculates `o: body.parentBodyId` whenever a moon or minor body orbits a parent body other than `'sol'`.
     - `buildFocusedEntityDetails` resolves `orbitingBodies` for the focused planet and `<DetailsPanel>` renders an `Orbiting Bodies` section in `Full` linking each moon or orbiting body to `/system/$systemId?focus=<bodySlug>` (or `/planet/$planetId?focus=<bodySlug>` on `PlanetView`).

---

### DEC-012: Planetary View (`/planet/$planetId`), `<PlanetaryElementsPanel>`, & Planet Drill-Down Link
- **Date:** 2026-10-18
- **Status:** `Superseded` (partially superseded by `DEC-013` for unified `<BodiesPanel>` naming and debug panel removal)
- **Scope:** `src/views/PlanetView.tsx`, `src/components/domain/BodiesPanel/BodiesPanel.tsx`, `src/services/detailsService.ts`, `src/services/searchService.ts`, `src/router/index.tsx`
- **Context:** Extending the Galaxy → System hierarchy with a dedicated Planetary View (`/planet/$planetId`) that mirrors the System View structure (`Breadcrumbs`, `Search`, `<DetailsPanel>`, and `<BodiesPanel>`).
- **Decision:**
  1. **Route & View Boundary (`/planet/$planetId`):**
     - `/planet/$planetId` (`?focus=`) mounts [`PlanetView`](file:///home/marcel/projects/starmap/src/views/PlanetView.tsx) (`data-testid="planet-view-root"`), composing `<Breadcrumbs />` (`Galaxy` → `<System Name>` → `<Planet Name>`, or `Galaxy` → `<System Name>` → `<Planet Name>` → `<Focused Orbiting Body>` when `?focus=<bodySlug>` is set), `<Search.Root>`, `<DetailsPanel details={focusedDetails} />`, and `<BodiesPanel elements={planetaryBodies} />`.
  2. **Planet Drill-Down Link in `<DetailsPanel>`:**
     - When `focusedKind === 'planet'`, the existing `Details` action link (`data-testid="details-button-system-details"`) in `<DetailsPanel>` points directly to `/planet/<planetSlug>` (`buildPlanetDetailsHref`), avoiding a redundant second action link.

---

### DEC-013: Unified View & Panel Naming (`GalaxyView`, Configurable `<BodiesPanel>`) & Removal of Debug Focus/Selection Panels
- **Date:** 2026-10-18
- **Status:** `Ratified`
- **Scope:** `src/views/GalaxyView.tsx`, `src/views/SystemView.tsx`, `src/views/PlanetView.tsx`, `src/components/domain/BodiesPanel/BodiesPanel.tsx`, `src/services/detailsService.ts`, `src/router/index.tsx`
- **Context:** The temporary debugging panels that only listed `Focused` and `Selected` entities were named `SystemsPanel` (`<h2>Systems</h2>` on `MainView`) and `BodiesPanel` (`<h2>Bodies</h2>` on `SystemView` / `PlanetView`), which collided conceptually with the actual entity inventory panels (`SystemElementsPanel` / `PlanetaryElementsPanel`). Additionally, `MainView` did not match the scale-named views (`SystemView`, `PlanetView`).
- **Decision:**
  1. **Zero-Alias View Naming (`GalaxyView`):**
     - Rename `MainView` (`src/views/MainView.tsx`, `data-testid="clean-slate-root"`) to [`GalaxyView`](file:///home/marcel/projects/starmap/src/views/GalaxyView.tsx) (`src/views/GalaxyView.tsx`, `data-testid="galaxy-view-root"`) with zero legacy aliases.
     - All 6 Guide routes (`/guide/star-types`, `/guide/star-types/$starType`, `/guide/planet-types`, `/guide/planet-types/$planetType`, `/guide/metrics`, `/guide/metrics/$metricId`) are explicitly catalogued in the view inventory with `*-view-root` test IDs.
  2. **Remove Debug `Focused` / `Selected` Panels:**
     - Remove the debug-only panels that rendered `<h3>Focused</h3>` and `<h3>Selected</h3>` lists from `GalaxyView`, `SystemView`, and `PlanetView`.
  3. **Unified Configurable `<BodiesPanel />` (`scope: 'system' | 'planet'`):**
     - Replace the separate `SystemElementsPanel` (`<h2>System Elements</h2>`) and `PlanetaryElementsPanel` (`<h2>Orbital Bodies</h2>`) components with a single unified [`<BodiesPanel />`](file:///home/marcel/projects/starmap/src/components/domain/BodiesPanel/BodiesPanel.tsx) (`data-testid="bodies-panel"`, zero legacy aliases) configured via `scope: 'system' | 'planet'`:
       - `scope: 'system'` (`<h2>System Bodies</h2>`): renders `Stars`, `Planets`, `Moons & Dwarf Planets`, `Minor Bodies & Spacecraft`, and `Canon Layers`.
       - `scope: 'planet'` (`<h2>Planetary Bodies</h2>`): renders `Planet`, `Moons`, `Minor Bodies & Spacecraft`, and `Canon Layers`.
     - Items inside `<BodiesPanel />` expose both `data-focused="true"` and `data-selected="true"` CUBE state attributes.
  4. **Planned Unified Region & Schematic Names:**
     - Radial top-to-bottom orbital schematic on `SystemView` and `PlanetView`: `<OrbitalSchematicPanel />` (`<h2>Orbital Schematic</h2>`, `data-testid="orbital-schematic-panel"`).
     - Shared spatial view regions: `<CanvasLayer />` (`data-testid="canvas-layer"`), `<PreviewPanel />` (`data-testid="preview-panel"`), `<Minimap />` (`data-testid="minimap-panel"`), `<ControlBar />` (`data-testid="control-bar"`), and per-view configured `<Search.*>`.

---

### `DEC-014` — Precalculated Orbital Rank (`r`) & Region Overlap Flags (`e` / `z`) for `<OrbitalSchematicPanel />`
- **Date:** 2026-10-18
- **Track:** `journey-ui-scaffolding_01_journey-1-reader-flow_20261016`
- **Status:** Ratified
- **Context / Question:** How should `<OrbitalSchematicPanel />` order stars, planets, dwarf planets, moons, and minor bodies from closest orbit at the top to furthest at the bottom across both `SystemView` and `PlanetView`, and how should segments affected by orbital regions (Circumstellar Habitable Zone, Asteroid Belt, Kuiper Belt) be marked for background colour fills?
- **Options Considered:**
  1. **Option A (Selected — Precalculated Integer Orbital Rank & Region Overlap Codes in Build Pipeline):** Compute a 1-indexed integer orbital rank (`r?: number`) per parent scope (`systemId` for heliocentric/stellar bodies, `parentBodyId` for planetary moons/satellites) ordered by ascending `orbit.semiMajorAxis` at build time in `buildSearchIndices` (`src/utils/compactDataCodec.ts`), alongside compact region overlap codes (`z: 1` for habitable zone overlap, `e?: 'belt' | 'kuiper'` for Main Asteroid Belt $2.0 \le a \le 3.5\text{ AU}$ / `AsteroidMainBelt` and Kuiper Belt $a \ge 30\text{ AU}$ / `AsteroidDistant`).
  2. **Option B:** Sort only `SystemManifest.planets` at runtime and place moons/minor bodies unsorted at the bottom until individual detail shards are fetched.
- **Decision (Ratified):**
  - Precalculate 1-indexed integer orbital rank `r?: number` and region overlap code `e?: 'belt' | 'kuiper'` (in addition to `z?: 1` for Habitable Zone) on `CompactSearchEntry` in `buildSearchIndices` (`src/utils/compactDataCodec.ts`).
  - Implement pure domain builders `buildSystemOrbitalSchematic` and `buildPlanetaryOrbitalSchematic` in `src/services/detailsService.ts` producing `OrbitalSchematicSummary`:
    - Primary host star(s) (`scope: 'system'`) or host planet (`scope: 'planet'`) appear at the top (`orbitRank: 0`), followed by all orbiting bodies in ascending `orbitRank` order from closest orbit at the top to furthest at the bottom.
    - Each `OrbitalSchematicItem` carries `id`, `name`, `href`, `kind` (`'star' | 'planet' | 'dwarf-planet' | 'moon' | 'minor-body' | 'spacecraft'`), `orbitRank`, `summaryLabel`, `inHabitableZone: boolean`, `region?: 'habitable-zone' | 'asteroid-belt' | 'kuiper-belt'`, `isFocused: boolean`, and `isSelected: boolean`.
  - Render `<OrbitalSchematicPanel elements={orbitalSchematic} />` (`src/components/domain/OrbitalSchematicPanel/OrbitalSchematicPanel.tsx`, `data-testid="orbital-schematic-panel"`, `<h2>Orbital Schematic</h2>`) on both `SystemView` and `PlanetView`, structured as three nested composable components (`<OrbitalSchematicPanel>`, `<OrbitalSchematicList>`, and `<OrbitalSchematicItem>`) so the ordered list and individual segments can later be embedded inside `<BodiesPanel />`, exposing `data-orbit-rank`, `data-region`, `data-in-habitable-zone`, `data-focused`, and `data-selected` attributes on each `<li data-testid="orbital-schematic-item">` segment.

---

### `DEC-015` — Breadcrumbs Represent View Hierarchy Only (Never `?focus=`) & `<DetailsPanel />` Strict Focus Gating
- **Date:** 2026-10-18
- **Track:** `journey-ui-scaffolding_01_journey-1-reader-flow_20261016`
- **Status:** Ratified
- **Context / Question:** Should `<Breadcrumbs />` include the currently focused entity (`?focus=`), and should visiting `/system/$systemId` or `/planet/$planetId` without an explicit `?focus=` parameter auto-focus the host system/planet and display `<DetailsPanel />`?
- **Decision (Ratified):**
  1. **Breadcrumbs (`<Breadcrumbs />`) represent the spatial View / Route Hierarchy only, never what is focused (`?focus=`):**
     - `GalaxyView`: `Galaxy` (`[{ label: 'Galaxy' }]`).
     - `SystemView`: `Galaxy > [System Name]` (`[{ label: 'Galaxy', href: '/galaxy' }, { label: sysName }]`).
     - `PlanetView`: `Galaxy > [System Name] > [Planet Name]` (`[{ label: 'Galaxy', href: '/galaxy' }, { label: sysName, href: sysHref }, { label: planetName }]`).
  2. **Strict `<DetailsPanel />` Focus Gating:**
     - Navigating to `/system/$systemId` or `/planet/$planetId` without `?focus=` enters that view's spatial scope with **nothing focused** (`focusedId === null`).
     - When nothing is focused (`focusedEntity === null`), `<DetailsPanel />` MUST NOT be visible (`details={null}`), while `<BodiesPanel />` and `<OrbitalSchematicPanel />` still render the host system's or host planet's bodies and schematic.
     - `<DetailsPanel />` only renders when an entity is explicitly focused (`?focus=<slug>` or legacy `/galaxy/$systemId`).

---

### `DEC-016` — Contextual 3D Focus Preview Window (`<PreviewPanel />`) Across `GalaxyView`, `SystemView`, and `PlanetView`
- **Date:** 2026-10-18
- **Track:** `journey-ui-scaffolding_01_journey-1-reader-flow_20261016`
- **Status:** Ratified
- **Context / Question:** How should we configure the 3D Focus Preview panel (`<PreviewPanel />`) across `GalaxyView`, `SystemView`, and `PlanetView` when an entity is focused?
- **Options Considered:**
  1. **Option A (Selected — Unified Focus-Gated `<PreviewPanel />` Across All 3 Spatial Views):** Render `<PreviewPanel preview={focusedPreview} />` (`<h2>Focus Preview</h2>`, `data-testid="preview-panel"`) across `GalaxyView`, `SystemView`, and `PlanetView` strictly when an entity is focused (`focusedEntity !== null`), exposing `previewMode` (`'system-orbits' | 'planetary-system' | 'object-orbit'`), orbital inclination (`inclinationDeg`) / eccentricity (`eccentricity`) / semi-major axis (`semiMajorAxisAu`), child orbit lines (`data-testid="preview-orbits-list"`), and a 3D preview viewport slot (`data-testid="preview-canvas-slot"`).
  2. **Option B:** Render `<PreviewPanel />` only on `GalaxyView` and `SystemView`, omitting object-level previews on `PlanetView`.
- **Decision (Ratified):**
  - Extend `FocusedPlanetDetail` and `FocusedPlanetTelemetry` in `src/services/detailsService.ts` with `readonly inclinationDeg?: number` (mapped from `orbit.inclination`).
  - Implement pure builder `buildFocusedPreviewSummary` in `src/services/detailsService.ts` returning `FocusedPreviewSummary | null` (`null` when `details === null`).
  - Create `<PreviewPanel preview={focusedPreview} />` (`src/components/domain/PreviewPanel/PreviewPanel.tsx`) and mount it alongside `<DetailsPanel />` on `GalaxyView`, `SystemView`, and `PlanetView`.

### DEC-017: `<Minimap />` Global Spatial Orientation Panel (`GalaxyView`, `SystemView`, `PlanetView`)
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** Every spatial view (`GalaxyView`, `SystemView`, `PlanetView`) needs a persistent `<Minimap />` (`data-testid="minimap-panel"`) for global spatial orientation regardless of whether a specific entity is focused.
- **Options Considered:**
  1. **Option A (Recommended):** Scaffold `<Minimap orientation={minimapOrientation} />` across `GalaxyView`, `SystemView`, and `PlanetView` with scope-specific orientation telemetry (`scope: 'galaxy' | 'system' | 'planet'`), active `focused` and `selected` markers, and `data-testid="minimap-viewport-slot"`.
  2. **Option B:** Keep `<Minimap />` minimal with only the scope attribute, current target/anchor name, and `data-testid="minimap-viewport-slot"`.
- **Decision (Ratified):**
  - Implement pure builders `buildGalaxyMinimapOrientation`, `buildSystemMinimapOrientation`, and `buildPlanetMinimapOrientation` in `src/services/detailsService.ts` returning `MinimapOrientationSummary`.
  - Create `<Minimap orientation={minimapOrientation} />` (`src/components/domain/Minimap/Minimap.tsx`) with `<section data-testid="minimap-panel" data-scope={orientation.scope}>`, `<h2>Minimap</h2>`, `<div data-testid="minimap-viewport-slot">`, scope-specific orientation telemetry (`origin` / `sector` / `coordinates` / `orbitalExtentAu` / `habitableZoneAu` / `orbitingBodyCount`), and active focused/selected marker items (`data-testid="minimap-markers-list"`, `data-testid="minimap-marker-item"`).
  - Mount `<Minimap />` unconditionally across `GalaxyView`, `SystemView`, and `PlanetView`.

### DEC-018: Remove `Canon Layers` from `<BodiesPanel />` (Keep on `<DetailsPanel />`)
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** Canon annotations (`Canon Layers`) are narrative/universe metadata rather than orbital body data, so they should not appear inside `<BodiesPanel />` (`data-testid="bodies-panel"`) or `<OrbitalSchematicPanel />`. They remain in `<DetailsPanel />` (`data-testid="details-canon-section"`), and a dedicated `<CanonLayersPanel />` is deferred to Journey 3 (Serendipitous & Canon Discovery).
- **Options Considered:**
  1. **Option A (Recommended):** Remove `Canon Layers` (`bodies-canon-section`) from `<BodiesPanel />` now (keep on `<DetailsPanel />`), and defer a dedicated `<CanonLayersPanel />` to Journey 3.
  2. **Option B:** Remove `Canon Layers` from `<BodiesPanel />` and scaffold `<CanonLayersPanel />` immediately in Track 01.
- **Decision (Ratified):**
  - Remove the `Canon Layers` (`data-testid="bodies-canon-section"`) rendering from `<BodiesPanel />` (`src/components/domain/BodiesPanel/BodiesPanel.tsx`) and `canonAnnotations` from `SystemBodiesSummary` / `PlanetaryBodiesSummary` (`src/services/detailsService.ts`), while preserving `Canon Layers` inside `<DetailsPanel />`.
  - Record `<CanonLayersPanel />` in `feature-scratchpad.md` for Journey 3.

### DEC-019: `<ControlBar />` with Time Controller, Control Mode Buttons & Keyboard Shortcut Indicators
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** Every spatial view (`GalaxyView`, `SystemView`, `PlanetView`) needs a persistent `<ControlBar />` (`data-testid="control-bar"`) for simulation time control (play/pause, timeline/speed scrubber, and date-time picker), view/layer control modes (`3D` / `Top-Down`, `Orbits`, `Grid`, `Labels`), and keyboard shortcut indicators (`<kbd>`).
- **Options Considered:**
  1. **Option A (Recommended):** Include the full Time Controller (Play/Pause button, timeline scrubber `<input type="range">`, and `<input type="datetime-local">` picker), Control Mode buttons (`3D` / `Top-Down`, `Orbits`, `Grid`, `Labels`), and Keyboard Shortcut indicators (`<kbd>`) in `<ControlBar />` across `GalaxyView`, `SystemView`, and `PlanetView`.
  2. **Option B:** Show the Time Controller only on `SystemView` and `PlanetView`, and show only Control Modes + Keyboard Indicators on `GalaxyView`.
- **Decision (Ratified):**
  - Create `<ControlBar scope="galaxy | system | planet" />` (`src/components/domain/ControlBar/ControlBar.tsx`) with `<section data-testid="control-bar" data-scope={scope}>` and `<h2>Controls</h2>`:
    - **Time Controller (`data-testid="control-bar-time-controller"`):**
      - Play/Pause toggle button (`data-testid="control-bar-play-pause"`, `aria-pressed={isPlaying}`).
      - Timeline / warp scrubber (`<input type="range" data-testid="control-bar-time-scrubber" />`).
      - Date-time picker (`<input type="datetime-local" data-testid="control-bar-datetime-picker" />`, defaulting to J2000.0 `2000-01-01T12:00`).
    - **Control Modes & Layer Toggles (`data-testid="control-bar-mode-group"`):**
      - Projection mode buttons (`data-testid="control-bar-projection-3d"`, `data-testid="control-bar-projection-top-down"`) backed by `useSettingsStore`.
      - Layer toggle buttons (`data-testid="control-bar-toggle-orbits"`, `data-testid="control-bar-toggle-grid"`, `data-testid="control-bar-toggle-labels"`) backed by `useSettingsStore`.
    - **Keyboard Shortcut Indicators (`data-testid="control-bar-shortcuts-list"`):**
      - `<ul data-testid="control-bar-shortcuts-list">` with `<li data-testid="control-bar-shortcut-item">` and `<kbd>` indicators (`/` Search, `Space` Play/Pause, `R` Reset View, `Esc` Clear Focus).
  - Mount `<ControlBar />` across `GalaxyView`, `SystemView`, and `PlanetView`.

### DEC-020: Bottom-Layer `<CanvasLayer />` & Per-View Scoped `<Search.Panel />`
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** Each spatial view (`GalaxyView`, `SystemView`, `PlanetView`) needs a bottom-layer 3D `<CanvasLayer />` (`data-testid="canvas-layer"`) and a per-view `scope` configuration on `<Search.Panel />` (`data-scope="galaxy | system | planet"`).
- **Decision (Ratified):**
  - Create lightweight `<CanvasLayer scope="galaxy | system | planet" targetId={...} />` (`src/components/domain/CanvasLayer/CanvasLayer.tsx`) rendering `<div data-testid="canvas-layer" data-scope={scope} data-target-id={targetId}>` as the bottom layer in `GalaxyView`, `SystemView`, and `PlanetView`.
  - Add optional `scope?: 'galaxy' | 'system' | 'planet' | 'search'` to `<Search.Panel />` (`src/components/search/Search.tsx`) exposing `data-scope={scope}` on `data-testid="search-panel"`.

### DEC-021: 3D View Reference Point & Relative Camera Position in URL + `Centre` Action Link
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** `GalaxyView`, `SystemView`, and `PlanetView` need to capture their 3D view reference point and relative camera orientation/distance in the URL so scenes can be recreated and shared, and `<DetailsPanel />` needs a `Centre` link next to `Details` that moves the 3D view's centre onto the focused object and updates `<Minimap />` coordinates.
- **Options Considered:**
  1. **Option A (Recommended):** Use `?center=<entityId>` (or `?x=&y=&z=` when free-panned) for the 3D reference point, plus `?az=<deg>&el=<deg>&dist=<num>` (or `?zoom=`) for relative camera orientation/distance; clicking `Centre` (`data-testid="details-button-center"`) sets `?center=<id>` and updates `<Minimap />` and `<CanvasLayer />` coordinates.
  2. **Option B:** Use `?center=<entityId>` plus Cartesian camera offset `?camX=&camY=&camZ=`.
- **Decision (Ratified):**
  - Extend `StarmapSearchParams` in `src/router/index.tsx` and URL parser helpers with `center?: string`, `x?: number`, `y?: number`, `z?: number`, `az?: number`, `el?: number`, `dist?: number`, `zoom?: number`.
  - Add `readonly centerHref: string` to `FocusedEntityDetailsBase` (`src/services/detailsService.ts`) and render `<a href={centerHref} data-testid="details-button-center">Centre</a>` next to `Details` (`data-testid="details-button-system-details"`) inside `<div data-testid="details-actions">` in `<DetailsPanel />`.
  - Update `buildGalaxyMinimapOrientation`, `buildSystemMinimapOrientation`, and `buildPlanetMinimapOrientation` so when `?center=<entityId>` (or explicit `?x=&y=&z=`) is active in the URL, `<Minimap />` updates its reference frame (`anchorId`, `anchorName`, `coordinatesPc`, `distanceFromOriginPc`, `parentSemiMajorAxisAu`) to the centered entity/point.
  - Expose `data-center-id`, `data-center-coords`, `data-camera-az`, `data-camera-el`, and `data-camera-dist` on `<CanvasLayer />`.

### DEC-022: Swap `Partial` and `Full` Detent Content Across All `<DetailsPanel />` Focus Types (CTAs at Top of `Partial`, Followed by `Canon Layers`)
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** In `<DetailsPanel />`, `Canon Layers` and child/system body lists (`Stars`, `Planets`, `Orbiting Bodies`) are higher-priority browsing content than raw telemetry tables and astrometry coordinates, while the primary CTAs (`Details`, `Centre`, `Directions`) must remain at the very top of `Partial` followed immediately by `Canon Layers` in the same position across every variant.
- **Decision (Ratified):**
  - Across **all 5 `focusedKind` variants** (`'system'`, `'star'`, `'planet'`, `'minor-body'`, `'structure'`) in `<DetailsPanel />`:
    - **`Partial` Detent (`data-testid="details-detent-partial"`):**
      1. CTAs (`data-testid="details-actions"`: `Details`, `Centre`, `Directions`) — always first at the top of `Partial`.
      2. `Canon Layers` (`data-testid="details-canon-section"`) — always second, in the exact same position across all 5 variants.
      3. Child / System Bodies (`Stars` `data-testid="details-stars-section"` and `Planets` `data-testid="details-planets-section"` for `'system'` / `'star'`; `Orbiting Bodies` `data-testid="details-orbiting-bodies-section"` for `'planet'` / `'minor-body'`).
    - **`Full` Detent (`data-testid="details-detent-full"`):**
      1. Intrinsic Telemetry (`Stellar Telemetry` for `'star'`, `Planetary Telemetry` for `'planet'`, `Body Telemetry` for `'minor-body'`, `Structure Telemetry` for `'structure'`).
      2. `Astrometry` (`data-testid="details-astrometry-section"`: `System ID`, `Sector`, `Coordinates (J2000 pc)`, `Tags`).

### DEC-023: Replace Stars/Planets/Moons Lists in `<BodiesPanel />` with `<OrbitalSchematicList />` Across `SystemView` & `PlanetView`
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** Having separate `Stars`, `Planets`, `Planet`, and `Moons` lists inside `<BodiesPanel />` alongside a separate `<OrbitalSchematicPanel />` on `SystemView` and `PlanetView` duplicated the primary orbital hierarchy. The Orbital Schematic should replace the `Stars` / `Planets` / `Planet` / `Moons` sections inside `<BodiesPanel />`, while keeping `<BodiesPanel />` as the extensible container panel on both `SystemView` and `PlanetView` for additional sections (such as `Minor Bodies & Spacecraft` and future panels/sections) and leaving `<DetailsPanel />` lists unchanged.
- **Options Considered:**
  1. **Option A:** Replace `Stars`/`Planets`/`Moons` with `<OrbitalSchematicList />` in both `<BodiesPanel />` and `<DetailsPanel />`.
  2. **Option B (Selected):** Replace `Stars`/`Planets`/`Moons` with `<OrbitalSchematicList />` inside `<BodiesPanel />` on `SystemView` and `PlanetView` only (keeping `<BodiesPanel />` as the container for future sections, removing the duplicate standalone `<OrbitalSchematicPanel />` mount on the views, and leaving `<DetailsPanel />` lists as-is).
  3. **Option C:** Replace lists inside `<DetailsPanel />` only.
- **Decision (Ratified):**
  - Inside `<BodiesPanel />` (`src/components/domain/BodiesPanel/BodiesPanel.tsx`, `data-testid="bodies-panel"`, `data-scope="system" | "planet"`), render the `Orbital Schematic` section (`<OrbitalSchematicList items={...} />`) in place of the separate `Stars`, `Planets`, `Planet`, and `Moons` sections, followed by `Minor Bodies & Spacecraft` (`data-testid="bodies-minor-bodies-section"`).
  - Remove the duplicate standalone `<OrbitalSchematicPanel />` mount from `SystemView.tsx` and `PlanetView.tsx` so `<BodiesPanel />` is the single orbital/bodies container panel on both 3D views.

### DEC-024: Nested Planetary Moons in `<OrbitalSchematicList />` & Deduplicated `Minor Bodies & Spacecraft` in `<BodiesPanel />`
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** In `<BodiesPanel />`, `buildSystemOrbitalSchematic` and `buildPlanetaryOrbitalSchematic` previously pushed `minorBodiesAndSpacecraft` into `<OrbitalSchematicList />` while `<BodiesPanel />` also rendered a separate `Minor Bodies & Spacecraft` section below, duplicating spacecraft and asteroids. Meanwhile, planetary moons (`Moon`, `Io`, `Europa`, `Titan`) were skipped on `SystemView` instead of nesting under their host planet.
- **Decision (Ratified):**
  - Extend `OrbitalSchematicItem` with optional `readonly children?: readonly OrbitalSchematicItem[];` and recursively render `<OrbitalSchematicList items={item.children} />` inside `<OrbitalSchematicItem />` when `item.children` is non-empty.
  - In `buildSystemOrbitalSchematic`, attach planetary moons (`entry.o === planet.id`) as sorted `children` under their parent planet, and exclude `minorBodiesAndSpacecraft` from both `buildSystemOrbitalSchematic` and `buildPlanetaryOrbitalSchematic` so minor bodies and spacecraft appear only once in the dedicated `Minor Bodies & Spacecraft` section of `<BodiesPanel />`.
  - Link star spectral badges (`/guide/star-types/...`), planet composition badges (`/guide/planet-types/...`), and `Habitable zone` badges (`/galaxy?q=HabitableCandidate`) inside `<OrbitalSchematicItem />`.

### DEC-025: Scope `StarFocus` (`focusedKind === 'star'`) Strictly to the Focused Star in `<DetailsPanel />`
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** Focusing an individual star (`focusedKind === 'star'`, e.g. `Alpha Centauri A`) previously repeated the system-wide star count (`3 stars`), planet composition breakdown, and full `Stars` and `Planets` lists in `Peek` and `Partial`, making `StarFocus` nearly indistinguishable from `SystemFocus`.
- **Decision (Ratified):**
  - Keep the separate `Stars` / `Planets` / `Orbiting Bodies` lists inside `<DetailsPanel />` (`Partial` detent) for `system`, `planet`, and `minor-body` focus, and scope `StarFocus` (`focusedKind === 'star'`) strictly to the focused star component (omitting system-wide `starCount`, `details-planet-composition`, `details-stars-section`, and `details-planets-section` when `focusedKind === 'star'`).

### DEC-026: Contextual `Details` Drill-Down CTA (`data-testid="details-button-system-details"`) in `<DetailsPanel />`
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** The `Details` CTA link in `<DetailsPanel />` was previously rendered unconditionally, even when already on `/system/$id` focusing that system, or on `/planet/$id` focusing that planet, or when focusing a `star`, `minor-body`, or `structure` with no deeper 3D view.
- **Decision (Ratified):**
  - Make `systemDetailsHref?: string` optional on `FocusedEntityDetailsBase`.
  - Populate `systemDetailsHref` only when a deeper 3D view exists for the focused entity relative to the current `viewScope`:
    - `focusedKind === 'system'` on `GalaxyView` (`viewScope === 'galaxy'`) → `/system/$systemId`
    - `focusedKind === 'planet'` on `GalaxyView` or `SystemView` (`viewScope === 'galaxy' || viewScope === 'system'`) → `/planet/$planetId`
  - Omit `data-testid="details-button-system-details"` in `<DetailsPanel />` when `systemDetailsHref` is `undefined`.

### DEC-027: Guide Pages (`/guide/*`) Top-Level Breadcrumbs, 3D Preview Slots, 3-Slice Yerkes Combinator & `guideService.ts`
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** All spectral class `<Badge category="star">`, planetary composition `<Badge category="planet">`, and metric `<Unit>` elements across the app deep-link into the 6 Guide views (`/guide/star-types`, `/guide/star-types/$starType`, `/guide/planet-types`, `/guide/planet-types/$planetType`, `/guide/metrics`, `/guide/metrics/$metricId`). Per user review:
  1. Guide pages are top-level reference pages and must not nest under `Galaxy` in `<Breadcrumbs />` (breadcrumbs start at `Guide`).
  2. Both Guide list views and detail views must include 3D rendering slots (`data-testid="guide-3d-preview"`) with common-scale radii ($R_\odot$, $R_\oplus$) and accurate blackbody/chromaticity colours.
  3. `StarTypeDetailView` (`/guide/star-types/$starType`) must include an interactive **3-Slice Yerkes Spectral Classification Combinator** (`data-testid="star-type-combinator"`) — like a 3-slice flip-book combining **Slice 1 (Spectral Class `O`–`D`)**, **Slice 2 (Subdivision `0`–`9`)**, and **Slice 3 (Luminosity Class `I`–`VII`)** — showing how each slice affects the whole star and updating the 3D sphere preview and computed telemetry in real time.
- **Decision (Ratified):**
  - Remove `{ label: 'Galaxy', href: '/galaxy' }` from `<Breadcrumbs />` on all 6 Guide views so breadcrumbs start at `{ label: 'Guide', href: '/guide/star-types' }`.
  - Create `src/services/guideService.ts` defining canonical typed entries, 3D preview metadata (`canonicalRadiusRsun`, `canonicalTempK`, `chromaticityHex`, `canonicalRadiusRearth`, `textureTheme`), and `computeSpectralCombination(spectralLetter, subdivision, luminosityClass)` for the 3-slice combinator.
  - Render `<nav aria-label="Guide sections" data-testid="guide-section-nav">`, `<div data-testid="guide-3d-preview">` on all list items and detail views, `<section data-testid="star-type-combinator">` on `StarTypeDetailView`, structured `<dl data-testid="guide-detail-telemetry">`, and `<ul data-testid="guide-examples-list">` with real-sky links back into `/galaxy`, `/system/$id`, and `/planet/$id`.

### DEC-028: Guide List Item Links, Familiar Unit Conversions & Context-Aware Metric Comparisons (`?focus=<entityId>`)
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:**
  1. On the Guide list pages (`/guide/star-types`, `/guide/planet-types`, `/guide/metrics`), each item card should act as a link to its detail page rather than restricting navigation to the small badge text.
  2. The 3D star and planet cross-section cutaways (truncated by the preview frame to reveal internal structure) are logged in `feature-scratchpad.md` (`FS-011`) for the 3D Engine implementation rather than approximated with 2D CSS overlays.
  3. Metric list and detail pages (`/guide/metrics` and `/guide/metrics/$metricId`) need comparative measures using 3D (`data-testid="metric-comparative-3d"`) to show values against **Earth** or **Sol**, convert astronomical units into familiar units for our audience (e.g., parsecs ↔ **light-years**, AU ↔ **light-minutes / million km**, Kelvin ↔ **°C / °F**, days ↔ **Earth years**), and automatically include whatever entity was focused when navigating to the metric page (`?focus=<entityId>`).
- **Decision (Ratified):**
  - **Guide List Card Links:** Make each list item on `StarTypesListView`, `PlanetTypesListView`, and `MetricsListView` wrap its card content in a link (`data-testid="star-types-guide-link"`, `data-testid="planet-types-guide-link"`, `data-testid="metrics-guide-link"`) to its detail page.
  - **3D Cross-Section Cutaways Deferred to `FS-011`:** Keep the clean centered common-scale 3D spheres in `.previewSlot` for now and record the 3D cross-section cutaway specification in `feature-scratchpad.md` (`FS-011`).
  - **Context-Aware Metric Links & 3D Comparative Measures (`?focus=<entityId>`):**
    - Append `?focus=<details.id>` (or `preview.targetId`) to metric `/guide/metrics/<slug>` links in `<DetailsPanel />` and `<PreviewPanel />`.
    - Add `familiarConversion: string` to `MetricGuideEntry` (rendered on both `MetricsListView` and `MetricDetailView` via `data-testid="metric-familiar-conversion"`) and `resolveMetricComparison(metricId, focusedEntityId?)` in `src/services/guideService.ts`, rendering `<section data-testid="metric-comparative-3d">` comparing the focused entity (or default benchmark) against **Earth / Sol** in both scientific and familiar units (e.g. light-years).

### DEC-029: Persistent `Guide` ↔ `Map` Companion Link Next to `<Breadcrumbs />`
- **Date:** 2026-10-18
- **Status:** Ratified
- **Context:** Users need a persistent one-click way next to `<Breadcrumbs />` to jump into the Guide from 3D views, and back out to the 3D Galaxy view (`Map`) when browsing the Guide views.
- **Decision (Ratified):**
  - Inside `<Breadcrumbs />` (`src/components/domain/Breadcrumbs/Breadcrumbs.tsx`), render a persistent companion link (`data-testid="breadcrumbs-companion-link"`) alongside `<ol data-testid="breadcrumbs-list">`:
    - On 3D / Map views (`items[0]?.label !== 'Guide'`): links to `/guide/star-types` with label `Guide`.
    - On Guide views (`items[0]?.label === 'Guide'`): links to `/galaxy` with label `Map`.

### DEC-030: Unicode Greek Bayer Transliteration, Superscript Digits, Two-Word Constellation Genitives & Space-Separated Numbered Bayer Expansion
- **Date:** 2026-10-19
- **Status:** Ratified
- **Context:** During Journey 1 Step 1 (Target Acquisition) review, two nomenclature edge cases were identified in `src/utils/nomenclature.ts`:
  1. Copy-pasted Unicode Greek Bayer strings (`"τ Ceti"`, `"τ Cet"`, `"α Centauri"`, `"ε Eri b"`, `"π³ Ori"`) had their Greek characters stripped by `normalizeCleanKey` (`replace(/[^a-z0-9]/g, '')`), reducing `"τ Ceti"` to `"ceti"` and matching every star in Cetus instead of `Tau Ceti`.
  2. `expandGouldOrConstellationSuffix` only inspected the single final word for a constellation genitive and only expanded `starTokens[0]` when `starTokens.length === 2`, causing the 11 two-word IAU constellation genitives (`"alp Canis Majoris"`, `"ρ Coronae Borealis b"`) and space-separated numbered Bayer queries (`"omi 2 Eridani"`, `"pi 3 Ori"`) to bypass Greek Bayer expansion.
- **Decision (Ratified):**
  - Export `UNICODE_GREEK_TO_LATIN_MAP`, `SUPERSCRIPT_DIGIT_MAP`, and `transliterateGreekAndSuperscripts` in `src/utils/nomenclature.ts` and apply them in both `expandGreekBayer` and `normalizeCleanKey`.
  - Update `expandGouldOrConstellationSuffix` to match both 2-word and 1-word trailing IAU constellation genitives and collapse space-separated numbered Bayer prefixes (`["omi", "2"]` $\rightarrow$ `"Omicron-2"`) while keeping Gould designations (`"82 G. Eridani"`) untouched.

### DEC-031: Collection-Surfaced Search Target Links & Option C `?select=` URL Grammar (`canon:`, `tag:`, `star-type:`, `planet-type:`, `collection:`)
- **Date:** 2026-10-19
- **Status:** Ratified
- **Context:** When a user clicks a search result surfaced from a collection (such as a fictional canon `"Project Hail Mary"` or a system tag `"Habitable Candidate"`), navigating to `/galaxy/tau-ceti` previously cleared `selectedIds`, losing the rest of the collection in the 3D scene. Additionally, other user journeys (Journey 3 curated tours and Journey 4 Guide-to-Map jumps) benefit from a unified `?select=` token grammar without adding runtime string parsing overhead to keystroke search.
- **Decision (Ratified):**
  - **Collection-Surfaced Search Target Links (`buildResultTargetLink` & `executeCatalogSearch`):**
    - Any search result with `canonLayerId` (`entry.w`) serialises `select=canon:<shortSlug>` onto its target `href` (e.g. `/galaxy/tau-ceti?select=canon:project-hail-mary`, `/galaxy/40-eridani?focus=erid&select=canon:project-hail-mary`).
    - Perform an $O(1)$ pre-loop lookup (`QUERY_CLEAN_KEY_TO_TAG_SLUG`) in `executeCatalogSearch` against the precalculated `entry.g` system tag bitmask (`SYSTEM_TAG_BITS`); when a query matches a system tag, surface matching star systems (`(entry.g & bit) !== 0`) with `select=tag:<tagSlug>` on their target `href` (`/galaxy/tau-ceti?select=tag:habitable-candidate`).
  - **Option C `?select=` URL Token Grammar (`parseUrlSelectTokens` & `resolveSelectedSystemsFromUrlSelect`):**
    - Support 5 collection prefixes plus explicit entity slugs on URL load (zero keystroke search overhead):
      1. `canon:<slug>` (`SEED_FICTIONAL_CANON_LAYERS`)
      2. `tag:<slug>` (precalculated `entry.g` bitmask / canon tags)
      3. `star-type:<slug>` (precalculated `entry.m[1]` spectral string / `entry.u` compact class; wired into `STAR_TYPE_GUIDE_ENTRIES` example links)
      4. `planet-type:<slug>` (precalculated `entry.u` planet class / `entry.b` composition counts tuple; wired into `PLANET_TYPE_GUIDE_ENTRIES` example links)
      5. `collection:<slug>` (`SEED_CURATED_COLLECTIONS` for Journey 3 curated sets such as `extreme-worlds` and `newly-discovered`)
      6. `<entityId>` (explicit individual entities)

### DEC-032: 4-Class Planet Taxonomy (`terrestrial`, `super-earth`, `ice-giant`, `gas-giant`), `super-earth` Concentric Double-Circle Reticle, and Precalculated Environmental Hazards Across `<DetailsPanel />` Detents
- **Date:** 2026-10-19
- **Status:** Ratified
- **Context:** During Journey 1 Step 2 (Spatial Framing, Planet Composition Summary & Environmental Hazard Summary) review:
  1. `classifyPlanetPhysical` previously collapsed all worlds $\le 1.75\,R_\oplus$ or $\le 10\,M_\oplus$ into `'terrestrial'`. Expanding to 4 canonical classes (`'terrestrial'`, `'super-earth'`, `'ice-giant'`, `'gas-giant'`) requires unifying naming across `astroMath.ts`, `guideCatalog.ts`, `compactDataCodec.ts`, and `reticleGeometry.ts` (including a dedicated `super-earth` reticle and 4th pip on the bottom-left diamond facet).
  2. Focusing a star component (`focusedKind === 'star'`) on `SystemView` must remain strictly scoped to the star (never pulling in system planet composition).
  3. Environmental hazards must be precalculated in the build-time data pipeline (`scripts/build-data.ts` and `src/utils/compactDataCodec.ts`) for both systems/stars (`flare-star`, `ionising-radiation`, `variable-flux`) and planets (`extreme-heat`, `cryogenic-cold`, `high-gravity`, `tidal-locking`, `high-eccentricity`). Rather than storing a duplicate `host-flare-exposure` code on individual planet records, any entity focused inside a system with a hazard (`system`, `star`, `planet`, `minor-body`) inherits and displays the host system's hazards via the existing `systemId` relationship alongside its own intrinsic hazards.
  4. `<DetailsPanel />` needs hazard summaries and planetary telemetry distributed cleanly across its three detents (`Peek`, `Partial`, `Full`).
- **Decision (Ratified):**
  - **4-Class Planetary Taxonomy & Reticle Symbology:**
    - Unify `PlanetCensusClassification` and `PLANET_COMPOSITION_TYPES` as `['terrestrial', 'super-earth', 'ice-giant', 'gas-giant']`:
      - `terrestrial`: $R \le 1.25\,R_\oplus$ and $M \le 2.0\,M_\oplus$
      - `super-earth`: $1.25 < R \le 2.0\,R_\oplus$ or $2.0 < M \le 10.0\,M_\oplus$ (with $R \le 2.0\,R_\oplus$)
      - `ice-giant`: $2.0 < R \le 6.0\,R_\oplus$ or $10.0 < M \le 50.0\,M_\oplus$
      - `gas-giant`: $R > 6.0\,R_\oplus$ or $M > 50.0\,M_\oplus$
    - Upgrade `computePlanetCompositionCounts` and `planetCompositionCounts` (`entry.b`) to a 4-tuple `[terrestrial, superEarth, iceGiant, gasGiant]` (retaining backward-compatible decoding for 3-element legacy test tuples).
    - Add `'super-earth'` to `PLANET_TYPE_GUIDE_ENTRIES` (`/guide/planet-types/super-earth`) and add `'surface-gravity'` to `METRIC_GUIDE_ENTRIES` (`/guide/metrics/surface-gravity`).
    - In `src/components/canvas/cartography/reticleGeometry.ts` and `docs/3d-spatial-architecture.md` §2.2, represent `'super-earth'` as a **concentric double 1px open circle** (inner + outer open rings with an unobstructed open centre) both as a standalone reticle (`createReticleGeometry`) and as a planetary census pip on the bottom-left diamond facet (`appendPlanetaryPips`).
  - **Precalculated Environmental Hazards, System Hazard Inheritance & Detent Placement:**
    - Precalculate `SYSTEM_HAZARD_BITS` (`flare-star = 1`, `ionising-radiation = 2`, `variable-flux = 4`) and `PLANET_HAZARD_BITS` (`extreme-heat = 1`, `cryogenic-cold = 2`, `high-gravity = 4`, `tidal-locking = 8`, `high-eccentricity = 16`) plus `surfaceGravityG` in `astroMath.ts`, `compactDataCodec.ts`, and `scripts/build-data.ts`.
    - In `buildFocusedEntityDetails` (`src/services/detailsService.ts`), resolve `systemHazards` from the host system (`systemId`) and include them in `details.hazards` and `details.hazardCount` for every entity in that system (`system`, `star`, `planet`, `minor-body`), merged with any planet-level hazards (`[...systemHazards, ...planetHazards]`).
    - **`Peek` Detent:** Keep `details-planet-composition` strictly on `focusedKind === 'system'`. Render `<span data-testid="details-hazard-summary">` badge (`0 hazards` nominal or `N hazards` warning/critical, linking to `/guide/hazards` or `/guide/hazards/$hazardId`) across all system entities (`system`, `star`, `planet`, `minor-body`).
    - **`Partial` Detent:** Render `<section data-testid="details-hazards-section">` (`<h4>Environmental Hazards</h4>`) with either `<p data-testid="details-hazards-nominal"><Badge status="nominal"><a href="/guide/hazards">0 hazards</a></Badge> Nominal environment</p>` or `<ul data-testid="details-hazards-list">` listing each active system and planetary hazard badge (linked to `/guide/hazards/$hazardId`) and plain-language description.
    - **`Full` Detent:** In `Planetary Telemetry` (`data-testid="details-planet-telemetry-list"`), render `Surface Gravity` (`data-testid="details-planet-telemetry-gravity"`, unit `g` linked to `/guide/metrics/surface-gravity?focus=<id>`), `Tidal Status` (`data-testid="details-planet-telemetry-tidal"`), and `Earth Similarity (ESI)` (`data-testid="details-planet-telemetry-esi"`).
  - **Environmental Hazards Guide Section (`/guide/hazards` & `/guide/hazards/$hazardId`):**
    - Add `HAZARDS_GUIDE_PATH = '/guide/hazards'` and `HAZARD_GUIDE_ENTRIES` covering all 8 environmental hazards (`flare-star`, `ionising-radiation`, `variable-flux`, `extreme-heat`, `cryogenic-cold`, `high-gravity`, `tidal-locking`, `high-eccentricity`) to `src/data/guideCatalog.ts` and `src/services/guideService.ts`.
    - Mount `HazardsListView` (`/guide/hazards`) and `HazardDetailView` (`/guide/hazards/$hazardId`) in `src/router/index.tsx` and add `Environmental Hazards` to `<GuideSectionNav />`.

### DEC-033: Shared `<DetentSheet />`, Dedicated `journeyService.ts`, Two-Stage `<DirectionsPanel />`, Defensive Route Gating (`Coming soon`), Under-the-Hood Origin Focus & General 3D `<JourneyChord />`
- **Date:** 2026-10-19
- **Status:** Ratified
- **Context:** For Journey 1 Step 3 (Route Finding & Benchmark Calculations):
  1. `<DetailsPanel />` and the new `<DirectionsPanel />` share the 3-detent container anatomy (`Peek`, `Partial`, `Full`) without `<DirectionsPanel />` being coupled to entity details.
  2. Clicking `Directions` on any entity must NOT load a new top-level view or mutate the user's existing selection or primary focus (`focusedId`); instead, it appends `?route=<origin>,<target>` onto the current URL and gives the first route stop (`routeStops[0]`, i.e. `sol` or `earth`) focus under the hood (`focusedIds`) solely for 3D canvas representation.
  3. All route finding, relativistic interstellar transit math, and intra-system orbital transfer math must live in a dedicated `src/services/journeyService.ts` (backed by pure equations in `src/utils/astroMath.ts`), with zero hardcoded entity attributes except `DEFAULT_INTERSTELLAR_ORIGIN_ID = 'sol'` and `DEFAULT_INTRA_SYSTEM_ORIGIN_ID = 'earth'` strictly as the default first-step origin.
  4. Routes must be defensively gated for v1: users may not travel between objects in different systems, and at the galaxy level may only travel between star systems themselves. Clicking `Directions` when a route is not allowed (cross-system body routes, non-system stops at the galaxy scope, or identical origin/destination `sol,sol` / `earth,earth`) must open `<DirectionsPanel />` in a `"Coming soon"` state (`status: 'coming-soon'`, `data-testid="directions-coming-soon"`) with zero 3D chords.
  5. Supported routes open a two-stage `<DirectionsPanel />` in the same pane: Stage 1 lists propulsion/transfer options with a top summary (`topSummaryTime`, e.g. journey time), and clicking an option opens Stage 2 (`?journeyOption=<optionId>`) displaying full telemetry stats in the same pane alongside a multi-leg 3D `<JourneyChord />` on the canvas.
- **Decision (Ratified):**
  - **Shared `<DetentSheet />` (`src/components/interface/surfaces/DetentSheet/DetentSheet.tsx`):** Reusable `Peek` / `Partial` / `Full` sheet primitive consumed by both `<DetailsPanel />` (`testIdPrefix="details"`) and `<DirectionsPanel />` (`testIdPrefix="directions"`).
  - **Dedicated Journey Service (`src/services/journeyService.ts`) & Pure Transit Math (`src/utils/astroMath.ts`):**
    - `computeEuclideanDistance3D`, `computeInterstellarRelativisticTransit` (1g continuous relativistic brachistochrone $\tau = \frac{2c}{a}\operatorname{arcosh}\!\left(1 + \frac{a d}{2 c^2}\right)$), `computeInterstellarConstantBetaTransit` ($0.1c$ / $0.05c$ cruise + $0.00057c$ reference probe), `computeIntraSystemBrachistochroneTransit`, and `computeHohmannTransferOrbit`.
    - `buildDirectionsTriggerHref` preserves `currentPathname` and `currentSearch`, using `sol` (galaxy scope) or `earth` (system/planet scope) strictly as the default Step 1 origin.
    - `buildJourneyPlan` validates route endpoints and returns `status: 'coming-soon'` (with explanatory `statusReason` and `chordLegs: []`) whenever stops span different systems (`hasCrossSystemBodyStop`), include non-system bodies at galaxy scope (`hasNonSystemInGalaxy`), or form a self-loop (`hasSelfLoop`).
  - **Under-the-Hood Origin Focus (`src/components/search/Search.tsx`):**
    - `syncUrlFocusToStore` preserves `focusSlug` as primary `focusedId` (`focusedIds[0]`) so `DetailsPanel`, `PreviewPanel`, and `Minimap` never flip away from the user's focused target, while appending `routeStops[0]` to `focusedIds` under the hood for 3D canvas representation.
  - **General 3D `<JourneyChord />` (`src/components/canvas/cartography/journeyChordGeometry.ts` & `src/components/canvas/entity/JourneyChord.tsx`):**
    - Multi-leg 3D chord geometry, $\Delta z$ elevation projection segments, screen-invariant waypoint markers, and `<SafeHtml>` midpoint callouts with zero hardcoded origins, step counts, or propulsion methods.
