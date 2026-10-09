# React Component Architecture & Design System Style Guide

This guide establishes the architectural, accessibility, state, and styling standards for authoring React 19 components in Starmap. Every component—from base atom to application assembly—must adhere to these universal design principles.

---

## 1. Architectural Taxonomy & Separation of Concerns

Components are categorised into a strict four-tier hierarchy (`docs/design-system.md`):

1. **Tier 1: Primitives**
   - **Layout Primitives:** Own all spatial flow, geometry, and insets (`<Stack>`, `<Cluster>`, `<Grid>`, `<Center>`, etc.).
   - **Presentation Atoms:** Pure, single-responsibility controls and data presentation elements (`<Button>`, `<Input>`, `<Badge>`, `<Datum>`, etc.).
2. **Tier 2: Surfaces & Overlays**
   - Provide visual containment, spatial elevation, and contextual planes (`<Card>`, `<Panel>`, `<Modal>`, `<Drawer>`, etc.).
3. **Tier 3: Structural Templates**
   - Standardise recurring macro layout configurations by composing primitives and surfaces without embedding domain models (`<SplitScreen>`, `<DockLayout>`, etc.).
4. **Tier 4: Application Assemblies**
   - High-level domain widgets and feature views bound to application state, astronomical data, and telemetry.

### Architectural Invariants
- **Zero Outer Margins:** Components must never declare external `margin`, positioning offsets, or self-layout. Layout and flow are strictly owned by parent composition primitives.
- **Presenter/Container Decoupling:** Presentation components (Tiers 1–3) must remain pure, deterministic, and decoupled from global stores or side-effects. Stateful orchestration and telemetry subscriptions belong exclusively in Tier 4 assemblies or dedicated container hooks.
- **Testable Component Signatures:** Root presentation components must be cleanly inspectable and instantiable in non-DOM test environments without throwing unhandled hook or context errors.
- **Production / Fixture Segregation:** Test fixtures, visual preview scaffolding, and Storybook decorators (such as `StoryCanvas`) must never reside within production component directories (`src/components/...`). They belong strictly in `.storybook/helpers/` or dedicated test utilities (`src/test-utils/`) to keep component packages pure and shippable.

---

## 2. Interface Contracts & React 19 Conventions

- **Standardised Prop Vocabulary:** Maintain uniform prop conventions across the design system:
  - **Visual Variants:** `variant: 'primary' | 'secondary' | 'subtle' | 'danger'`
  - **Sizing:** `size: 'sm' | 'md' | 'lg'`
  - **Spacing Scales:** Align with canonical design tokens (`'none' | 'dense' | 'tight' | 'default' | 'loose' | 'section' | 'fib-1'..'fib-7'`)
  - **Alignment & Distribution:** Use standard flex/grid terminology (`align: 'start' | 'center' | 'end' | 'stretch'`, `justify: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'`)
- **Direct Ref Forwarding:** In React 19, `ref` is a standard component prop. Never use `forwardRef`. Explicitly declare `ref?: Ref<T>` in the component's props interface for all measurable or focusable elements.
- **State-to-Data Reflection:** Reflect all component variants, visual states, and interactive flags directly onto HTML `data-*` attributes (e.g. `data-variant={variant}`, `data-status={status}`, `data-selected={isSelected ? 'true' : undefined}`). Dynamic class name string concatenation is strictly forbidden.
- **Transparent Attribute Passthrough & Descriptor Merging:**
  - Forward native HTML attributes (`id`, `aria-*`, event handlers) directly to the primary semantic element.
  - When augmenting accessibility attributes (such as `aria-describedby` or `aria-labelledby`), always merge incoming caller IDs with internal descriptor IDs (e.g. `[ariaDescribedby, helperId].filter(Boolean).join(' ')`) rather than overwriting caller intent.

---

## 3. Semantic Structure & Accessibility (a11y)

- **Semantic Platform Baseline:** Always build on native HTML elements matching the component's underlying role (`<button>`, `<dialog>`, `<table>`, `<input>`, `<nav>`). Avoid generic `div`/`span` role emulation unless no native equivalent exists.
- **Preserve Semantic Tree Integrity:** When adding interactive capabilities to structural containers (such as tables or lists), layer interactivity using standard attributes (`aria-selected`, `tabIndex`, keyboard event handlers) without mutating or stripping semantic HTML roles (e.g. table rows must retain row semantics).
- **Programmatically Determinable Names:** Every interactive control, dialog, and landmark must provide an unambiguous accessible name via visible text, an `aria-label`, or an `aria-labelledby` reference to an associated heading element.
- **Predictable Interaction Patterns:** Follow WAI-ARIA authoring practices for keyboard navigation, focus management, and selection states. All interactive elements must support standard keyboard actuation (Enter, Space, arrow keys, Escape) appropriate to their role.
- **Accurate Interactive Affordances:**
  - Limit interactive affordances (such as `cursor: pointer` or hover highlights) strictly to elements with active interaction handlers or selectable states.
  - Every interactive element must provide a distinct, high-contrast `:focus-visible` ring using semantic focus tokens (`--state-focus`, `--state-focus-ring-width`).

---

## 4. State Lifecycle, Resilience & Performance

- **Respect Platform Lifecycles & UA Display Contracts:** When integrating native browser primitives (such as `<dialog>` or `<details>`), leverage native lifecycle methods (`.showModal()`, `.close()`) rather than DOM mounting thrash, and preserve default user-agent visibility behaviours (e.g. maintaining `:not([open]) { display: none; }` when assigning custom author `display` values).
- **Declarative State Reset:** UI components containing transient input or selection state should encapsulate that state locally. Prefer resetting transient state declaratively via key changes or explicit interaction callbacks rather than through synchronising `setState` calls inside reactive effects.
- **Defensive Boundary Handling:** Public components must defensively guard rendering and calculations against missing, out-of-range, or anomalous inputs (e.g. `NaN`, negative square roots, zero division, or nullish properties) to guarantee reliable rendering under all domain edge cases.
- **Derived Selection & Index Clamping:** When tracking active or focused indices over dynamic or filterable collections, defensively derive or clamp selection indices within current collection boundaries to prevent out-of-bounds access or orphaned selection states.
- **Computational Efficiency:** Memoize non-trivial calculations, filtering operations, and spatial coordinate transforms using `useMemo` to protect rendering budgets during telemetry updates and high-frequency animations.
- **Deterministic Resource Teardown:** All event listeners, timers, animation loops, and observers registered in effects must provide explicit, deterministic cleanup functions to prevent memory leaks.

## 5. Modular CSS & Design Token Architecture

- **Strict Scoping:** Every component is styled exclusively via an adjacent CSS Module (`<Component>.module.css`). Inline styles (`style={{ ... }}`) are strictly forbidden.
- **Semantic Token Consumption:** Component stylesheets must consume semantic tokens (`--surface-*`, `--content-*`, `--state-*`, `--status-*`). Direct references to literal color palettes (`--palette-*`) are forbidden.
- **The Local Token Interface Pattern:**
  - Define component-scoped custom properties (`--component-*`) at the root selector in `@layer blocks`:
    ```css
    @layer blocks {
      .component {
        --component-bg:     var(--surface-panel-bg);
        --component-border: var(--surface-panel-border-color);
        background: var(--component-bg);
        border: var(--stroke-hairline) solid var(--component-border);
      }
    }
    ```
- **Declarative Variant Exceptions:**
  - In `@layer exceptions`, mutate local custom properties using HTML `data-*` selectors, preserving base geometry and layout:
    ```css
    @layer exceptions {
      .component[data-status="critical"] {
        --component-border: var(--status-critical);
      }
    }
    ```
- **Component-Internal Token Scoping (Preventing Global Token Pollution):**
  - Never place component-specific properties (e.g. `--ui-button-*`, `--ui-input-*`, `--ui-slider-*`, `--ui-toggle-*`) in global `semantic.css`.
  - Global semantic tokens must remain abstract and composable: universal surfaces (`--surface-*`), elevation/specular mechanics (`--ui-control-elevation`, `--ui-control-specular-l`, `--ui-control-specular-c`), control cavity layers (`--ui-control-inset-bg`, `--ui-control-inset-border-color`, `--ui-control-inset-shadow`), and hardware states (`--ui-control-default`, `--ui-control-subtle`, `--ui-control-hover`, `--ui-control-active`).
  - Components declare their own private `--<component>-*` variables in their module block, mapping directly to these semantic tokens.
- **Physical Lighting Model (137° Overhead Illumination):**
  - Starmap simulates directional overhead-left illumination (137°):
    - **Raised Controls (`<Button>`):** Top and left edges catch illuminated specular rims (`inset 0 1px 0 0 ...`, `inset 1px 0 0 0 ...`), while bottom and right edges cast exterior drop shadows.
    - **Recessed Inset Wells & Grooves (`<Input>`, `<Select>`, `<Toggle>`, `<Slider>`):** Top and left edges receive interior overhang occlusion shadows, while bottom and right lips catch illuminated specular rim highlights (`inset 0 -1px 0 0 ...`, `inset -1px 0 0 0 ...`).
- **Dynamic State Integration via Relative OKLCH:**
  - Interactive states (`:focus`, `:active`) and status variants (`data-status="error"`) must integrate seamlessly into the physical lighting model. Avoid flat, disconnected outlines.
  - Derive specular rims, border colors, and internal glow halos directly from the accent or status token via CSS Relative Colors:
    ```css
    .input:focus {
      --input-border-color: oklch(from var(--state-focus) l c h / 0.40);
      --input-shadow:
        inset 0 -1px 0 0 oklch(from var(--state-focus) var(--ui-control-specular-l) var(--ui-control-specular-c) h / 0.35),
        inset -1px 0 0 0 oklch(from var(--state-focus) var(--ui-control-specular-l) var(--ui-control-specular-c) h / 0.20),
        inset 0 0 4px 0 oklch(from var(--state-focus) l c h / 0.20),
        var(--ui-control-inset-shadow);
      box-shadow: var(--input-shadow);
    }
    ```
  - For recessed track seamlines (`<Slider>`), source relative hue from `--ui-control-subtle` rather than foreground handle/thumb tokens.
- **Scale-Appropriate Shadowing (Hairlines vs Cavities):**
  - Standard cavity inset shadows (`--ui-control-inset-shadow`) incorporate multi-pixel blurs (3px, 6px) designed for volumetric inputs. When applied to 1px or 2px tracks/grooves, blur spreads swallow the element. Always use crisp specular strokes or `box-shadow: none` on sub-3px elements.
- **Tabular Data Presentation:** All numeric telemetry, coordinates, and astronomical measurements must apply tabular numerals (`font-variant-numeric: tabular-nums`) and use data typography (`--font-data`).
