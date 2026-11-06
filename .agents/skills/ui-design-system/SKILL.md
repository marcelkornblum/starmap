---
name: ui-design-system
description: Enforces Starmap's Design System, CUBE CSS Modules, Tier 1 Interface Primitives, Mandatory Component File Quads, and multi-viewport verification whenever creating or modifying UI components, views, or stylesheets.
---

# UI Design System & Component Architecture Skill

This skill enforces Starmap's Design System, CUBE CSS Modules, Tier 1 Interface Primitives, and component architecture standards whenever authoring, updating, or reviewing UI components, views, or stylesheets.

---

## 1. Mandatory Reading & Foundations
Before making any UI, component, view, or styling changes, you must review and adhere to:
- [docs/design-system.md](../../../docs/design-system.md): System overview, 3-tier token architecture (Literal -> Semantic -> Component), typography, color channel separation, and cascading layers.
- [conductor/code_styleguides/html-css.md](../../../conductor/code_styleguides/html-css.md): CUBE CSS, CSS Modules, Local Token Interfaces, and zero-outer-margin rules.
- [conductor/code_styleguides/components.md](../../../conductor/code_styleguides/components.md): React 19 conventions, 4-tier taxonomy, semantic accessibility, presenter/container decoupling, and testing contracts.

---

## 2. Compose Tier 1 Interface Primitives (Zero Raw HTML / String Hacks)
Domain widgets and views (`src/components/domain/**`, `src/views/**`) must compose Tier 1 Interface Primitives instead of raw HTML controls or ad-hoc string formatting:
- **Interactive Controls:** Use `<Button>`, `<Input>`, `<Select>`, `<Toggle>`, `<Slider>`, `<Kbd>` (never `<button>`, `<input>`, `<select>`).
- **Layout & Spatial Flow:** Use `<Stack>`, `<Cluster>`, `<Grid>`, `<Center>` (never custom flex/grid layout wrappers with external margins).
- **Headings & Typography:** Use `<Heading>` with appropriate level and semantic styling.
- **Telemetry Key/Value Pairs:** Use `<Datum>` inside `<Stack gap="none">` (never raw `<dl>`, `<dt>`, `<dd>`).
- **Multi-Column Tables & Lists:** Use `<DataTable>` (never raw `<table>` or `<ul>` entity lists).
- **Magnitudes, Counts & Units:** Use `<Quantity>` and `<Unit>` fed by structured numeric/unit objects (`StructuredQuantity`) from services (never regex-split display strings in views).
- **Regulated Badges & Celestial Symbology:**
  - Use `<CelestialSymbol>`, `<CelestialBadge type={...} />`, `<SpectralBadge spectralType={...} />`, `<HazardBadge ... />`, `<PlanetCensus ... />`, and `<ConfidencePip />`.
  - Every TypeScript classification union deterministically renders canonical 1px SVG symbols, semantic colors, tooltips, and `/guide` links.
  - **Never** wrap numeric counts (`0 hazards`, `0 confirmed planets`, `1 of 5`) or plain telemetry prose in `<Badge>`.
  - **Never** use ASCII brackets `[...]` or middle-dot string concatenations (`' · a = '`).

---

## 3. CUBE CSS & Modular Architecture
Every component stylesheet (`<Component>.module.css`) must strictly follow CUBE CSS rules:
- **Cascading Layers:** Wrap styles inside `@layer blocks` and `@layer exceptions`.
- **Local Token Interface:** Declare `--<component>-*` variables at the top of the root selector consuming semantic tokens (`var(--token-name)`). Hardcoded hex colors (`#[0-9a-fA-F]{3,8}`) and raw pixel spacings are strictly forbidden.
- **HTML `data-*` Modifiers:** Mutate local tokens exclusively via `data-*` attributes (`data-status="critical"`, `data-variant="danger"`, `data-density="compact"`). Dynamic `className` string concatenation is strictly forbidden.
- **Zero Inline Styles:** Never use JSX `style={{ ... }}` in components or views.
- **Zero Outer Margins:** Components never declare external `margin` or layout positioning.
- **Canvas Interaction & Layering Hygiene:** Full-viewport shell and stage overlays must specify `pointer-events: none` on structural wrappers (enabling `pointer-events: auto` only on interactive HUD panels) so the underlying 3D `<canvas>` receives drag, orbit, zoom, and pointer raycasting events. Ensure `overscroll-behavior: none; -webkit-tap-highlight-color: transparent; user-select: none;` on canvas hosts to prevent touch highlight flashes and pull-to-refresh interference.

---

## 4. Mandatory Component File Quad
Every component in `src/components/interface/**` and `src/components/domain/**` MUST include all 4 colocated files:
1. `<Component>.tsx` — Component implementation (keep domain components focused and under ~300 lines by decomposing complex panels into sub-components). Direct ref forwarding (no `forwardRef` in React 19).
2. `<Component>.module.css` — Scoped CSS Module with CUBE `@layer blocks` / `@layer exceptions` and Local Token Interface.
3. `<Component>.stories.tsx` — Storybook stories covering key variants, states, and viewports.
4. `<Component>.test.tsx` — Colocated unit test running in `jsdom` using `@testing-library/react` (`render`, `screen`, `within`, `fireEvent` / `userEvent`).
   - **Forbidden:** Never import `renderToString` from `react-dom/server` in tests.
   - **Focused Suites:** Maintain 1:1 focused test files; monolithic catch-all test suites are prohibited.

---

## 5. Automated Verification Workflow
Whenever creating or modifying components, views, or stylesheets, run the verification suite:
1. `npm run audit:ui` — Audits component quads, forbids inline styles, enforces `@layer blocks`, and bans hardcoded hex colors.
2. `npm run lint` — ESLint verification.
3. `npm run typecheck` — TypeScript strict type checking.
4. `npm run test` or `npm run test:coverage` — Unit and integration tests.
