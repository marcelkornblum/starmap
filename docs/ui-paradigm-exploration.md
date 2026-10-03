# UI Spatial Architecture & Decisions

This document is the official log of agreed architectural and spatial UI decisions for Starmap. It records only confirmed decisions at the semantic layer, free of speculative implementation details, arbitrary pixel values, or unratified token assignments.

---

## 1. Core UI Paradigm: Adaptive Hybrid Console

We have agreed to adopt an **Adaptive Hybrid Console** model. It combines the unobstructed immersion of a peripheral dock with the high-density utility of a split workstation.

### Foundational Components

1. **3D Viewport Canvas:**
   - The primary spatial environment for astronomical navigation.

2. **Persistent Navigation & Control Dock:**
   - Anchors global navigation, time/epoch controls, and search entry point.
   - Sits **coplanar** (flush) on the exact same physical plane as the 3D canvas, separated by a clean 1px hairline boundary divider.
   - Provides a consistent structural anchor across all device classes.

3. **Fluid Telemetry Container:**
   - The dedicated host for astronomical entity data, catalogs, and telemetry readouts.
   - Adapts dynamically to viewport shape, orientation, and user intent.

---

## 2. Telemetry Container Modes

The telemetry container supports two primary operational states across desktop and landscape environments:

* **Overlay Mode:**
  - Floats above the 3D canvas for rapid inspection and glanceable reads.
  - The canvas remains full-bleed beneath, preserving spatial continuity.
* **Docked Mode:**
  - Locks flush with the viewport frame as a structural co-presence.
  - The 3D canvas bounds adjust so that space objects and telemetry exist side-by-side with zero occlusion.
  - **Camera Viewport Compensation:** The 3D camera controller automatically recalculates its projection and framing to keep the active celestial target centred within the adjusted canvas area.

---

## 3. Responsive Spatial Behaviors

* **Mobile & Portrait Orientation:**
  - The telemetry container docks to the bottom edge above the persistent dock.
  - Operates via stepped vertical detents:
    - **Peek:** Compact summary displaying identity and primary status, leaving maximum space for 3D interaction.
    - **Partial View:** Displays key tabular metrics and immediate actions.
    - **Full View:** Maximised sheet for comprehensive data analysis and reading.

* **Wide Displays (Laptops, Desktops, Monitors):**
  - The container can expand horizontally from a single column into **Multi-Bay** configurations, grouping related data sets (e.g. physical parameters alongside orbital elements) when real estate permits.

---

## 4. Geometry & Structural Rules

* **Strict Orthogonal Geometry:** Zero rounded corners (`--radius-none: 0px`). Every container, button, card, and input maintains sharp 90-degree corners.
* **Expansive, Non-Nested Planes:** Telemetry panels are large, continuous, monolithic slabs with generous breathing room (governed by Fibonacci row spacing). Cluttered "boxes-inside-boxes" are avoided; internal groupings use clean, flat hairline divider rules.
* **Tabular Rigor:** Monospace typography with `font-variant-numeric: tabular-nums` for all telemetry columns.
* **Directional Micro-Bevel Discipline:** 
  - A subtle 1px highlight catching ambient light is permitted strictly on top rims of elevated containers and the coplanar dock divider.
  - Excluded from bottom/side edges and internal horizontal divider rules (which remain flat and quiet).
* **Selective Glass Placement:** Optical smoked glass with backdrop blur is reserved for in-situ 3D context elements (such as tooltips and popovers hovering directly over celestial bodies in the 3D scene). Solid panels and the dock do not use glass blur.

---

## 5. Active Explorations (In Progress)

The following aesthetic details remain under active exploration and will be refined next:
* **Colour Palette:** Specific base chromatic family, neutral balance, and contrast tiers.
* **Luminance Gradient:** Precise directionality, percentage ramp, and stops for solid surfaces.
* **Highlight:** The exact luminance, opacity, and falloff of the top-edge micro-bevel.
* **Texture:** The physical calibration of the micro-matte / anodized grain.
* **Blur Effect:** The exact optical blur radius, tint, and opacity for the in-situ glass tooltips.

---

## 6. Execution Sequence

Per architectural alignment, the remaining design exploration executes in the following sequence:
1. **3D Visual Language & Cartography** (Representation of stars, orbits, grids, stems, LOD)
2. **UI Visual Language & Token Semantics** (Status, confidence, categories, tabular formatting)
3. **Three.js Token Synchronisation Architecture** (Bridge between CSS tokens and WebGL shaders)
4. **User Journeys & Overall Features** (Cross-scale navigation flows and data fixtures)
5. **Storybook Prototyping & Interface Execution** (Interactive component prototypes and responsive detents)

