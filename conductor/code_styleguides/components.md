# React Component Architecture & Design System Style Guide

This guide establishes the architectural, accessibility, state, and styling standards for authoring React 19 components in Starmap. Every component—from base atom to application assembly—must adhere to these universal design principles.

---

## 1. Architectural Taxonomy & Separation of Concerns

Components are categorised into a strict three-tier hierarchy ([`docs/design/design-system.md`](../../docs/design/design-system.md)):

1. **Tier 1: Primitives**
   - **Layout Primitives:** Own all spatial flow, geometry, and insets (`<Stack>`, `<Cluster>`, `<Grid>`, `<Center>`, etc.).
   - **Presentation Atoms:** Pure, single-responsibility controls and data presentation elements (`<Button>`, `<Input>`, `<Badge>`, `<Datum>`, etc.).
2. **Tier 2: Surfaces & Overlays**
   - Provide visual containment, spatial elevation, and contextual planes (`<Block>`, `<Card>`, `<Panel>`, `<Modal>`, `<Drawer>`, etc.).
3. **Tier 3: Application Assemblies**
   - High-level domain widgets and feature views bound to application state, astronomical data, and telemetry.

### Architectural Invariants
- **Zero Outer Margins:** Components must never declare external `margin`, positioning offsets, or self-layout. Layout and flow are strictly owned by parent composition primitives. The full CSS checklist lives in [html-css.md](./html-css.md).
- **Semantic Interface Primitives Over Raw Strings & HTML:** Domain assemblies and views (`src/components/domain/`, `src/views/`) must never render raw HTML controls (`<button>`, `<input>`, `<select>`), raw `<dl>` telemetry lists, unstyled `<ul>` wrappers outside layout primitives, or ASCII punctuation workarounds (`[reticle]`, `' · a = '`, `(0 pc)`):
  - **Telemetry Key/Value Pairs:** Group `<Datum>` rows inside `<Block>` and `<Stack>` (`gap="none"` or `"fib-1"`).
  - **Cushion-Block Entity & Collection Lists:** Compose `<Block as="li">` inside `<Stack as="ul">` or `<Grid as="ul">` for entity rows, canon layers, search results, hazard cards, and guide index entries.
  - **Multi-Column Tabular Comparisons:** Use `<DataTable>` for dense multi-column tabular data, orbital schematics, and transit step tables.
  - **Magnitudes, Counts & Units:** Always use `<Quantity>` and `<Unit>` (including counts such as `0 hazards` or `4 planets`), fed by structured numeric/unit objects (`StructuredQuantity`) from services—never regex-split display strings in view components.
  - **Regulated Classification Badges & Symbology:** Views must never manually assemble `<Badge>` with ad-hoc strings for celestial classifications, spectral classes, habitable zones, or hazards. Always use the regulated type-driven badge components (`<CelestialSymbol>`, `<CelestialBadge type={...} />`, `<SpectralBadge spectralType={...} />`, `<HazardBadge ... />`, `<PlanetCensus ... />`, `<ConfidencePip />`) so every TypeScript classification union deterministically renders the canonical 1px SVG symbol, `<Tooltip>`, semantic colour token, and `/guide` link. Never wrap numeric counts (`0 hazards`, `0 confirmed planets`, `1 of 5`) or plain telemetry prose (`Free rotation`, `Outside optimistic zone`, hex codes) in `<Badge>`, and never include ASCII brackets `[...]` inside `<Badge>`.
  - **Controls:** Always use `<Button>`, `<Input>`, `<Select>`, `<Toggle>`, `<Slider>`, and `<Kbd>`.
- **Presenter/Container Decoupling:** Presentation components (Tiers 1–2) must remain pure, deterministic, and decoupled from global stores or side-effects. Stateful orchestration and telemetry subscriptions belong exclusively in Tier 3 assemblies or dedicated container hooks.
- **Mandatory Component File Quad:** Every component in `src/components/interface/**` and `src/components/domain/**` MUST have:
  1. `<Component>.tsx` (implementation; keep domain components focused and under ~300 lines by decomposing complex panels into sub-components, extracting non-component helpers, math, and serializers into pure `.ts` companion files per `AUD-122` and `AUD-129`)
  2. `<Component>.module.css` (scoped CSS Module inside `@layer blocks` / `@layer exceptions` with a `--<component>-*` local token interface)
  3. `<Component>.stories.tsx` (Storybook stories)
  4. `<Component>.test.tsx` (colocated unit test run by `npm run test` / `npm run test:coverage`; testing rules in [typescript.md](./typescript.md#4-testing-standards))
- **Strict Zero-`className` and Zero-`style` on Tier 1 Primitives (`DEC-R050`):** Tier 1 layout and presentation primitives (`src/components/interface/**`) must NEVER accept `className` or `style` props. Primitives encapsulate their own scoped CSS Modules statically and expose variants/geometry exclusively via typed semantic props (`gap`, `align`, `variant`, `size`) and HTML `data-*` attributes. Dynamic class concatenation or external style injection into primitives is strictly forbidden.
- **Production / Fixture Segregation:** Test fixtures, visual preview scaffolding, and Storybook decorators (such as `StoryCanvas`) must never reside within production component directories (`src/components/...`). They belong strictly in `.storybook/helpers/` or `tests/fixtures/` to keep component packages pure and shippable.

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

- **CSS Guardrails:** Scoping, semantic-token consumption, the Local Token Interface pattern, `data-*` variant exceptions, and component-internal token scoping are owned by [html-css.md](./html-css.md).
- **Bio-Glass Surface & Lighting Model:**
  - Starmap pairs translucent verdigris glass panels (`--surface-panel-bg`, `--surface-panel-shadow`) with dark recessed cushion blocks (`--surface-block-bg`) under overhead illumination:
    - **Floating Panels & Raised Controls (`<Panel>`, `<Button>`):** Top edges catch a crisp `1px` specular rim (`inset 0 1px 0 0 ...`) paired with deep exterior elevation shadows (`--surface-panel-shadow`, `--ui-control-raised-shadow`).
    - **Recessed Cushion Blocks & Inset Controls (`<Block>`, `<Input>`, `<Select>`, `<Toggle>`):** Dark cavity fills sit inside subtle low-alpha borders (`--surface-block-border-color`, `--ui-control-inset-border-color`) and soft interior shadows (`--ui-control-inset-shadow`).
- **Dynamic State Integration via Relative OKLCH:**
  - Interactive states (`:focus`, `:active`, `[data-selected="true"]`) and status variants (`data-status="error"`) integrate into the surface lighting model rather than applying flat browser outlines.
  - Derive border tints and luminous focus halos from semantic state tokens via CSS Relative Colours and `--state-focus-halo`:
    ```css
    /* Exemplar: Input focus state */
    .input:focus {
      --input-border-color: oklch(from var(--state-focus) l c h / 0.55);
      --input-shadow: var(--state-focus-halo);
      box-shadow: var(--input-shadow);
    }
    ```
  - For hairline tracks (`<Slider>`), source track strokes from `--ui-control-subtle` and keep `box-shadow: none` on sub-3px grooves so cavity blur radii do not swallow the track.
- **Tabular Data Presentation:** All numeric telemetry, coordinates, and astronomical measurements must apply tabular numerals (`font-variant-numeric: tabular-nums`) and use data typography (`--font-data`).
