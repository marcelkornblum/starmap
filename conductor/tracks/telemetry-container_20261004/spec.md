# Specification: Telemetry Container & Panels

> [!IMPORTANT]
> **Stage 2 Flexible Placeholder (`journey-ui-scaffolding`) & Cross-Track Coupling (`FS-012`, `FS-013`):**
> - This track is held in Stage 2 of the [Journey-Driven View Data Models & UI Scaffolding Initiative](../../initiatives/journey-ui-scaffolding/index.md). Its exact presentation scope, detents, and sequencing will be revisited and ratified against the [View Requirements Inventory](../../initiatives/journey-ui-scaffolding/view-requirements.md) and [Decision Log](../../initiatives/journey-ui-scaffolding/decision-log.md) once Stage 1 (Tracks 01–05) is complete.
> - **Cross-Track Coupling (`FS-003`, `FS-012`, `FS-013`):** Coupled with **[Track: Interaction Controls](../interaction-controls_20261010/spec.md)**, **[Track: Minimap & Scene Transitions](../minimap-scene-transitions_20261010/spec.md)**, **[Track: 3D Engine Implementation](../3d-engine-implementation_20260929/spec.md)**, **[Track: Console UI Shell](../console-ui-shell_20261004/spec.md)**, and **[Track: Search & Discovery UI Surfaces](../search-discovery_20261004/spec.md)** via **[`FS-012` in `conductor/backlog.md`](../../backlog.md)** (conditional `Centre` CTA visibility when camera `center` diverges from `focused`, and HUD panel retraction during scale/camera transitions).

## Overview
Delivers the Adaptive Telemetry Container, the foundational domain elements (`Heading` and `Dock`), the three-tier **System Information Panel** (Peek, Partial, Full), and the **Secondary Objects Pane**.

---

## Scope

### 1. Foundational Domain Elements
- **`Heading` Typographic Primitive:**
  - Standardised header primitive supporting `eyebrow`, `title`, and `subtitle` slots.
  - Scoped CSS Modules, zero outer margins, fully compliant with semantic design tokens.
- **Persistent `Dock` Navigation Component:**
  - Navigation dock supporting Map vs Encyclopedia mode anchors.
  - Search trigger slot (Command Palette launcher).
  - Responsive positioning abstractions (zero hardcoded screen coordinates; layout-driven).

---

### 2. System Information Panel (Three Detents)

#### Detent Management & Mobile Affordance
- Persistent visual drag handle / affordance at the top of the panel to indicate draggable detent switching (Peek $\leftrightarrow$ Partial $\leftrightarrow$ Full) on touch and mobile viewports.
- Responsive height transitions adhering to container detent states.

#### Tier 1: Peek Detent (Glance & Identify)
- **System Header & Stellar Reticle:**
  - System title / primary designation (e.g. `Tau Ceti`, `Alpha Centauri`).
  - Reticle glyph adjacent to header embedding facet symbology **strictly for stellar components only** (e.g. solitary star vs binary/trinary system components A, B, C), paired with a `<Tooltip>` explaining active component flags.
  - Primary star spectral class `<Badge>` (e.g. `G8.5V`).
- **Planetary Summary Strip:**
  - Horizontal sequence of exoplanetary symbols representing confirmed bodies in orbital order.
  - Discrete `<Tooltip>` attached to **each individual symbol** defining that specific body's classification (e.g. "Planet b: Warm Super-Earth", "Planet e: Terrestrial, Optimistic CHZ").
- **Strict Rule:** Intrinsic system data only. Zero anchor-dependent metrics or unprompted distances.

#### Tier 2: Partial Detent (Context, Narrative & Action)
- **Retains Tier 1 Components:** Header, stellar reticle, star badge, planetary summary strip, and drag affordance.
- **Astrophysical & Discovery Prose:**
  - Formal encyclopaedic narrative detailing the stellar system's physical character, discovery timeline, and astrophysical significance (sourced from astronomical literature and Wikipedia).
  - Exoplanetary system architecture overview (detection method, confirmed/candidate counts, dynamic stability).
- **Popular Culture & Media References (Distinct Heading):**
  - Documented appearances in sci-fi literature, film, television, and gaming.
- **Dedicated Call-To-Action (CTA) Container:**
  - Generous, high-priority real estate at the bottom of the detent.
  - Primary action: `Enter System →` (camera transition to AU system scale).
  - Reserved modular slots for expanded future actions (`Plot Route / Measure`, `Bookmark System`, `Inspect CHZ Worlds`).

#### Tier 3: Full Detent (Vertical Orbital Schematic & System Telemetry)
- **Top-to-Bottom Vertical Orbital Schematic:**
  - **Stellar Anchor (Top):** Host star (or stellar barycentre with binary/trinary component breakdown).
  - **Vertical Orbital Ladder:** Ordered sequentially by increasing semi-major axis ($a$):
    - Circumstellar Habitable Zone (CHZ) spatial bounds rendered as a contextual bracket or demarcated band spanning the relevant orbital range.
    - Exoplanets rendered in orbital order with name, summary metrics ($a$, $P$, mass/radius), and status badges (`Terrestrial`, `Super-Earth`, `Gas Giant`, `CHZ Candidate`).
    - Asteroid belts and circumstellar debris disks integrated at their respective orbital distances.
- **Accordion Interaction:**
  - Each item in the schematic expands into an accordion drawer to reveal detailed Keplerian elements ($e$, $i$), surface gravity, and equilibrium temperature.
- **Encyclopedia Linkage `(i)`:**
  - Comparative scale visualizations (contrasting star/planets against Sol/Earth/Jupiter) are excluded from the main sheet.
  - Discrete `(i)` information buttons alongside classifications link directly to Encyclopedia classification articles (User Journey 4), where comparative scale visualisers reside.
- **Attribution & Astrometry Footer:**
  - Pinned footer containing astrometric baseline coordinates (RA, Dec, parallax, distance, Galactic $l, b$).
  - Attribution deep-links to authoritative sources: NASA Exoplanet Archive, SIMBAD, Gaia DR3, and Wikipedia.

---

### 3. Secondary Objects Pane
- Bi-directional 2D list $\leftrightarrow$ 3D starfield reticle synchronisation (User Journey 2).
- Candidate/cluster list displays matched systems with key attributes (name, distance from anchor if set, planet count).
- Hovering a 2D list item highlights its corresponding 3D reticle in the starfield; selecting a 3D reticle scrolls and highlights the 2D row.

---

## Out of Scope
- Camera transitions and viewport compensation logic (handled in `minimap-scene-transitions_20261010` and `camera-orthographic-projection_20261010`).
- Route planning and travel time benchmark calculation (`route-measurement_20261004`).
- Full UI shell layout frame and panel dock orchestration (`console-ui-shell_20261004`).
- Tour waypoint cards and Command Palette modal (tracked in `conductor/backlog.md`).

---

## Acceptance Criteria
- [ ] `Heading` primitive supports eyebrow, title, and subtitle with zero outer margins and semantic tokens.
- [ ] `Dock` component supports Map vs Encyclopedia modes and search trigger without hardcoded positioning.
- [ ] System Information Panel supports three discrete detents (Peek, Partial, Full) with mobile drag affordance.
- [ ] Tier 1 reticle facets represent only stellar components of multiple-star systems; each planetary symbol in the summary strip has an individual `<Tooltip>`.
- [ ] Tier 2 renders formalised prose (astrophysical character, exoplanetary architecture, pop culture references under distinct heading) and prominent CTA container.
- [ ] Tier 3 renders vertical orbital schematic in orbit order with CHZ bracket, exoplanets, debris disks, accordion expansion, `(i)` encyclopedia triggers, and astrometric/attribution footer.
- [ ] Zero distance metrics displayed without an explicit secondary anchor or route selection.
- [ ] Secondary Objects Pane synchronises hover and selection states bi-directionally with 3D map reticles.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:coverage` pass with 100% clean check.
