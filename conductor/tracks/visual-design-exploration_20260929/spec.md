# Specification: Visual Design & 3D Cartography

## Overview
This track is dedicated to defining the visual language and aesthetic requirements of the Starmap 3D space. It translates classic cartographic concepts (like the Tube map or OS maps) into a coherent 3D data visualization, ensuring complete aesthetic harmony with the 2D UI tokens (including Light/Dark mode transitions).

## Functional Requirements
1. **Scene Definitions:** Document the specific UX goals and rendering requirements for the 3 core views (Galaxy, System, Planet). Define what data must be shown and what should be hidden to avoid clutter.
2. **Mock Fixtures:** Generate hand-crafted JSON fixtures for a dummy "System" and "Planet" to fuel the visual prototypes.
3. **3D Cartography Ruleset:** Document the strict visual representation rules for astronomical bodies, connections, and grids (e.g., schematic nodes vs. realistic spheres, line weights, typography in 3D space).
4. **UI/3D Sync Mechanism:** Define and document the technical pattern for passing the CSS Token system (from the `ui-system` track) into the WebGL `<Canvas>` so materials and lighting react perfectly to Light/Dark mode toggles.
5. **Isolated Prototyping:** Build isolated 3D component prototypes (e.g., a schematic star node, a system orbital ring) in Storybook to visually prove the aesthetic rules work.

## Non-Functional Requirements
- **No Integration:** Prototypes must live exclusively in Storybook. They must not be wired into the main router or data pipeline yet.

## Acceptance Criteria
- [ ] A comprehensive `docs/scene-requirements.md` document is created defining all 3 views.
- [ ] `system.fixture.json` and `planet.fixture.json` are created for prototyping.
- [ ] `docs/3d-visual-design.md` is created and approved.
- [ ] The sync mechanism for passing CSS variables to Three.js materials is documented.
- [ ] Storybook contains working, isolated 3D visual prototypes that successfully toggle between Light and Dark themes.
