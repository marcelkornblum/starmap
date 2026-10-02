# Product Backlog

Candidate features and ideas identified during architectural discussions, awaiting formal track planning and specification.

---

## Navigation & Spatial HUD

- **Temporal Scrubber (Time Travel Control):** Interactive timeline scrubber allowing users to propagate planetary and stellar orbits forward and backward through time using Keplerian mechanics.
- **Targeting Reticle & Celestial Brackets:** In-viewport HUD targeting brackets that lock onto selected stars or planets, tracking their screen-space coordinates during camera rotation and zoom.
- **Galactic Orientation Compass:** Fixed HUD orientation indicator displaying galactic coordinate axes (Galactic North, Galactic Centre vector) relative to current camera heading.
- **Floating Camera Controls & Presets:** Logarithmic zoom stepper buttons, camera reset, orbital view lock, and top-down ecliptic view toggle.
- **Layer Visibility Toggles:** HUD controls for toggling visual rendering layers (constellation lines, habitable zones, coordinate grid, star names, velocity vectors, magnitude thresholds).
- **Hierarchical Breadcrumb Trail:** Docked navigational breadcrumbs (e.g. Galaxy > Orion Arm > Local Bubble > Solar System > Earth) for jumping across scale domains.
- **Celestial Command Palette (`Cmd+K`):** Fast search-and-jump modal palette to locate stars, exoplanets, constellations, or toggle visual rendering layers.

---

## Search & Discovery

- **Floating Search Pill & Autocomplete Panel:** Omnipresent search pill with an anchored autocomplete result sheet showing celestial POIs, coordinates, and classification badges.
- **Deep Catalog Filter Drawer:** Full-height slide-out drawer for multi-variable filtering of celestial bodies (by distance, spectral type, habitability index, exoplanet count).

---

## Telemetry & Scientific Dossiers

- **Real-Time Telemetry Readouts & Well:** Sunken inset console panels displaying live distance, apparent magnitude, radial velocity, and light-travel time from current viewpoint to targeted object.
- **Orbital Telemetry Tables:** Docked inspector view rendering Keplerian orbital elements (semi-major axis, eccentricity, inclination, periapsis, orbital period).
- **Celestial Dossier Sheets:** Contextual slide-out sheets containing astrophysical data (spectral classification, mass, radius, metallicity, habitability indicators) and schematic/visual previews.
- **Spectral Classification Hover Tooltips:** Contextual tooltips decoding Morgan–Keenan spectral types (e.g. `G2V`, `M1III`) on star hover.

---

## Route Planning & In-Universe Flight

- **Interstellar Route Planner:** Waypoint-based trajectory calculator plotting travel vectors and transit times between stellar systems.
- **Route History & Bookmarks:** Flight log drawer persisting recent navigational trajectories and saved celestial coordinates.
- **Warp / Transit Calculation Alerts:** System alert banners/toasts reporting trajectory calculation status or jump feasibility.

---

## System Configuration & Accessibility

- **System Settings Drawer:** Slide-out drawer for rendering performance, audio/SFX, measurement units (AU, parsecs, light-years), and theme switching (Light/Dark).
- **Keyboard Shortcut Reference Modal:** Modal overlay documenting navigation keys, camera controls, and HUD shortcuts.
