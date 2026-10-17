# Features Scratchpad (`journey-ui-scaffolding`)

This temporary scratchpad captures feature ideas, edge cases, dataset enhancements, and future capabilities surfaced while working through the user journeys in the `journey-ui-scaffolding` initiative.

Items logged here are held for later consideration and graduation into formal tracks, view requirements, or backlog items when ready.

---

## Logged Ideas

### FS-001: Fictional Universe Canon Layers / Tags
- **Concept:** A tag-driven "fictional universe" overlay system (e.g., *Star Trek*, *Dune*, *Project Hail Mary*, *Bobiverse*, *Revelation Space*) that highlights all real star systems and celestial bodies referenced in a given canon.
- **Behaviour:**
  - Related lore snippets and text annotations on each system/body are tagged by fictional canon.
  - Users can view an entire fictional canon as a single unified layer across systems, or toggle individual canons on and off while browsing.

### FS-002: Custom User Universe / Personal Notes Layer
- **Concept:** Allow the user to create their own custom "fictional universe" tag/layer using the same mechanism as built-in canons.
- **Behaviour:**
  - Users can tag systems and attach their own custom notes or lore snippets across multiple star systems, viewing and toggling their personal layer just like a curated fictional canon.

### FS-003: Search Results Scale, Multi-Result Highlighting & Solar System Exception
- **Concept:** Deterministic camera scale and selection framing driven by the search result set.
- **Behaviour:**
  - **Multiple results (`count > 1`):** Always stay at (or transition to) the **galactic scale**, automatically framing/zooming the camera so every matching result fits on screen simultaneously, with all matching results highlighted/selected.
  - **Single result (`count === 1`):** Only transition into the **system scale** directly from search results if there is a single match and it is known with certainty to be a body within our own Solar System (*Sol*). Otherwise remain at the galactic scale framing the matched system.

### FS-004: Local Night-Sky View to 3D Third-Person Projection
- **Concept:** Bridge Earth-bound stargazing (2D sky dome) with true 3D galactic depth.
- **Behaviour:**
  - User enters their Earth location (lat/long or place) and optional time (defaults to "now") to see what is in their local sky, with rotation to match their viewing orientation.
  - User can highlight/select some or all of the visible stars in that sky view.
  - User can then pull the camera out to a standard third-person 3D galactic angle to inspect the true 3D spatial distribution and depth of those highlighted night-sky stars.

### FS-005: Category-Filtered Search (Stars, Planets, Structures, Minor Bodies, Fiction)
- **Concept:** Allow users to scope or filter search queries by entity category, backed by the category-sharded search indices (`public/data/search/*.json`).
- **Behaviour:**
  - Users can filter or scope search to specific categories: **Star Systems / Stars** (`stars.json`), **Planets & Moons** (`planets.json`), **Galactic Structures & Deep Sky** (`structures.json`), **Minor Bodies** (`minor-bodies.json`), or **Works of Fiction / Canons** (`fiction.json`).

### FS-006: Adaptive Multi-Tier Search Strategy Across Core & Full Datasets
- **Concept:** Define a deliberate client-side loading and fallback strategy for searching across the compact Core search index (`core.json`) versus the complete Full search index (`full.json` / category shards).
- **Candidate Approaches to Evaluate:**
  1. **Zero-Result Escalation:** Search the lightweight Core index first; if a query returns zero matches, automatically fetch and search the Full dataset (`full.json`).
  2. **Progressive Background Upgrade:** Load and search the Core index immediately for instant responsiveness, then automatically pre-warm/stream the Full index in the background once the Core index is ready so subsequent or deeper queries always search the complete dataset.
  3. **Device / Network Performance Tiering:** Adaptively choose between eager background loading of the Full index versus on-demand/zero-result escalation based on client device capabilities (`navigator.deviceMemory`, `hardwareConcurrency`, and Network Information `effectiveType` / `saveData`).

### FS-007: SEO, Structured Metadata & Search Engine Discoverability
- **Concept:** Ensure Starmap's celestial systems, planets, fictional universe canons, and deep-sky objects are richly indexed and discoverable via search engines and social/link previews.
- **Considerations to Evaluate:**
  - Dynamic per-route `<title>`, `<meta name="description">`, canonical URLs, and Open Graph / Twitter Card metadata for system, body, search, and canon layer URLs.
  - Crawlability & indexing strategy for an SPA/3D web app (e.g., static pre-rendering / SSG for high-value landmark systems and fictional canons, `sitemap.xml` generation from the Core/Canon indices, and Schema.org / JSON-LD structured data).

### FS-008: Custom Shortlink & Curated Landing URLs (`/go/<slug>`)
- **Concept:** Support friendly, memorable entry-point URLs (e.g., `/go/xxx` such as `/go/hail-mary`, `/go/dune`, `/go/voyager`, `/go/trappist`) to make shared links and curated landing experiences cleaner and more inviting.
- **Behaviour:**
  - Resolves a short slug into a customised application setup and entry point (e.g., activating a specific fictional canon layer, pre-selecting a target system or multi-leg route, framing the camera at an ideal vantage point, or opening a tailored welcome/onboarding briefing).

