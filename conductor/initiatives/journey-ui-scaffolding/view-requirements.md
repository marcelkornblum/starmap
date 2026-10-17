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

### 2.1 Main View (`/`, `/galaxy`, `/galaxy/$systemId`, `/system/$systemId` — [`src/views/MainView.tsx`](file:///home/marcel/projects/starmap/src/views/MainView.tsx))
- **Functional Component Boundary:** Composes `<Search.Root>`, `<Search.Panel />`, `<Search.Results />` ([`src/components/search/Search.tsx`](file:///home/marcel/projects/starmap/src/components/search/Search.tsx)), and the domain component `<SearchResultItem>` ([`src/components/domain/SearchResultItem/SearchResultItem.tsx`](file:///home/marcel/projects/starmap/src/components/domain/SearchResultItem/SearchResultItem.tsx)), backed by pure unit functions in [`src/services/searchService.ts`](file:///home/marcel/projects/starmap/src/services/searchService.ts) and shard caching in [`src/data/searchRepository.ts`](file:///home/marcel/projects/starmap/src/data/searchRepository.ts).
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
      - **Variation `stars` (`data-testid="result-variation-stars"`):** Unpacks `spectralType` badge (`data-testid="result-spectral-badge"`) and `planetCount` summary (`data-testid="result-planet-summary"`).
      - **Variation `planets` (`data-testid="result-variation-planets"`):** Unpacks planet sub-kind attribute (`data-planet-kind="planet" | "moon" | "dwarf-planet"`).
      - **Variation `structures` (`data-testid="result-variation-structures"`):** Deep-sky structure variation hook.
      - **Variation `minor-bodies` (`data-testid="result-variation-minor-bodies"`):** Solar System minor-body variation hook.
      - **Variation `fiction` (`data-testid="result-variation-fiction"`):** Unpacks canon work/franchise title (`canonTitle`).
      - **Omitted fields:** Heliocentric parsec (`pc`) distance numbers are omitted from result rows.

### 2.2 Search View (`/search` — [`src/views/SearchView.tsx`](file:///home/marcel/projects/starmap/src/views/SearchView.tsx))
- **Functional Component Boundary:** Dedicated full-results search view composing `<Search.Root>`, `<Search.Panel />`, `<Search.Results />`, and `<SearchResultItem result={result} />`.
- **URL State & Intent:** Hydrates initial query (`?q=`) and category filter (`?searchCategory=`) from the URL on entry (including deep-links from Main View's `View all search results` and per-category `View all <Heading>` links) and keeps `?q=` and `?searchCategory=` synchronised on every keystroke or filter change.
- **Untruncated Category Lists:** Displays full matching result lists across any of the 5 categories that have matches (without the Main View's 3-item-per-category truncation), omitting headings and lists for categories with zero matches.





