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
     - `buildFocusedEntityDetails` resolves `orbitingBodies` for the focused planet and `<DetailsPanel>` renders an `Orbiting Bodies` section in `Full` linking each moon or orbiting body to `/system/$systemId?focus=<bodySlug>`.

