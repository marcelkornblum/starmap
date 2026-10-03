# Feature Backlog & Architectural Notes (Exploration Scratchpad)

This document captures architectural features, mechanisms, and UX capabilities identified during design exploration.

---

### Feature 1: 3D-Synchronised Search Framing
As the user types into search / Command Palette, the 3D viewport actively reacts in sync—highlighting matching candidates across the starfield and smoothly reframing its camera/bounding aperture to enclose all current matches.

### Feature 2: Unified Selection Pipeline (Zero Divergence)
Selecting a star via search result vs directly clicking its 3D reticle in the canvas dispatches the exact same event path: camera focal lock, reticle state promotion to annotated tier, and telemetry container activation.

### Feature 3: Dedicated Route Mode with Automatic Two-Point Framing
Activating a route switches the 3D scene into a dedicated "Route Mode"—the camera automatically pulls back and reframes to encompass both systems in view, rendering the direct 3D measurement chord between them.

### Feature 4: Anchor-Independent Telemetry
A system's base card never assumes Sol as the default origin. It displays intrinsic properties first; distance only calculates when a secondary anchor or route is explicitly designated.

### Feature 5: Light-Speed Comms Latency Readout
Every distance chord automatically calculates one-way and round-trip light-speed radio/laser communication lag (essential for sci-fi realism).

### Feature 6: High-Level Intent Filters
Instead of forcing users to specify raw astrophysical criteria (e.g. spectral classes F, G, K), filters expose high-level scientific intent:
- *"Habitable Zone"* (evaluates circumstellar habitable zone candidates).
- *"Exoplanet Host"*
- *"Multi-Star System"*
- *"Resource-Rich Debris Disk / Asteroid Belt"*

### Feature 7: Bi-Directional 2D List & 3D Map Synchronisation
Filtering or framing a volume updates both the 3D scene and a companion 2D system listing simultaneously:
- The 2D panel lists all matching candidates currently framed in the volume.
- Hovering a row in the 2D list instantly highlights its corresponding 3D reticle on the canvas.
- Hovering a 3D reticle highlights its row in the 2D list.
- Selecting either one dispatches the unified selection pipeline.

### Feature 8: Card Hierarchy & Rationalisation (Open Item)
Summary card, telemetry card, and system preview need to be carefully thought through and rationalised to avoid inelegance and component proliferation.

### Feature 9: Tour Waypoint Card
A dedicated card variant with narrative elements and step-through controls for curated tours and guided journeys.

### Feature 10: Tags
A flexible metadata tagging system across celestial entities (e.g. for search filtering, thematic categorisation, and quick glanceable metadata).

### Feature 11: Filters & Filter Sets
A system for configuring, saving, and sharing preset or custom filter criteria (e.g. "Habitable Zone candidates within 15 ly").

### Feature 12: Contextual Route Initiation
Route and measurement planning is initiated contextually from an active entity's card (with one endpoint already pre-set), rather than as a detached global menu item.

### Feature 13: Selection-Aware Breadcrumbs
Breadcrumbs dynamically reflect the currently selected item as their terminal segment (e.g. `Local Volume` $\rightarrow$ `Tau Ceti` when a star is selected in Galaxy View; `Local Volume` $\rightarrow$ `Tau Ceti` $\rightarrow$ `Tau Ceti e` when a planet is selected). Clicking any parent segment navigates back and clears child selection.

### Feature 14: Contextual Search Scoping (with Scope Switcher)
Search adapts contextually to the active view level:
- In Galaxy View: Defaults to searching all systems across the local volume.
- In System View: Defaults to searching within the active stellar system (planets, moons, asteroid belts, lagrange points).
- In Planet View: Defaults to moons, rings, and surface features.
- Includes a GitHub-style context switcher chip (e.g. `In this System` vs `All Systems`) allowing users to effortlessly broaden or narrow their search scope without leaving the input.

### Feature 15: External Authority Deep-Links (Wikipedia / NASA / SIMBAD)
Entity details cards provide clean outbound links to authoritative external references (Wikipedia overview articles, NASA Exoplanet Archive pages, or SIMBAD queries) for deep reading.

### Feature 16: Classification Encyclopedia Deep-Link Icon
An icon alongside any classification tag (e.g. next to `Red Supergiant` or `Super-Earth`) links directly into the dedicated Encyclopedia article for that category.

### Feature 17: Encyclopedia Article Architecture
An encyclopedic reference view for a classification featuring:
- Plain-language summary and full scientific parameter range.
- **Relative Parameter Comparator:** Generalized comparative visualizer benchmarking any physical data point (size/radius, mass, surface gravity, temperature, luminosity, density, orbital period) against familiar reference anchors (Earth, Sol, Jupiter, 1g, 1 bar).
- An isolated, beautiful 3D render of an *exemplar* object of that class.

### Feature 18: Category Index with 3D Exemplar Cards
A category list view (e.g. *Star Categories*) featuring cards for each subtype, each hosting a live miniature 3D model of that type's exemplar.

### Feature 19: Encyclopedia Breadcrumb Hierarchy
Breadcrumbs manage the reference engine seamlessly: `Encyclopedia` $\rightarrow$ `[Category Domain]` $\rightarrow$ `[Classification Type]`, allowing users to step back up to the category list or the encyclopedia home.

### Feature 20: Persistent Top-Level Modes (Map vs Encyclopedia / Codex)
Map and Encyclopedia need to be persistent global navigation anchors. Research how games handle this paradigm (e.g. *Mass Effect* Galaxy Map vs Codex, *Homeworld*, *Elite Dangerous*), allowing seamless cross-navigation.

### Feature 21: Embedded 3D Viewport in Reference Pages
Unlike the Map view where 3D is the full-bleed canvas floor, the Encyclopedia flips the paradigm: the 3D exemplar is an interactive figure/element embedded inside the article layout like an interactive diagram.

### Feature 22: Relativistic & Interplanetary Conversation Simulator (Comms Lag)
A contextual or standalone communication simulator that visualises the reality of conversation over astronomical distances:
- Users test or observe conversational exchanges subject to calculated one-way and round-trip light-speed delays (e.g. Earth to Mars ranging from 3 to 22 minutes; Sol to Tau Ceti at 11.9 years).
- Simulates out-of-order responses, asynchronous queuing, and conversational desynchronisation across deep-space distances.

