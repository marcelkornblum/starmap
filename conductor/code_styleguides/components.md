# React Component Architecture & Design System Style Guide

This guide establishes the universal architectural, accessibility, state, and styling standards for authoring React 19 components in Starmap. Every component—from base atom to application assembly—must adhere to these principles.

---

## 1. Architectural Taxonomy & Role Boundaries

Every component occupies a distinct tier in the design system hierarchy (`docs/design-system.md`):

- **Tier 1: Primitives**
  - **Layout Primitives:** Own 100% of spatial flow, layout geometry, and spacing.
  - **Atoms:** Base single-responsibility controls and data presentation elements.
- **Tier 2: Surfaces & Overlays**
  - Provide spatial elevation, backdrop containment, and ephemeral contextual planes.
- **Tier 3: Structural Templates**
  - Standardise macro screen regions by composing primitives and surfaces.
- **Tier 4: Assemblies**
  - High-level domain features bound to application models, telemetry, and state.

**Role Invariants:**
- **Zero Outer Margins:** Components never declare external `margin`, positioning offsets, or self-layout. Layout and flow are strictly owned by parent Composition Primitives (`<Stack>`, `<Cluster>`, `<Grid>`).
- **Single Responsibility:** Presentation components remain decoupled from data-fetching and complex domain calculations.

---

## 2. Interface Contracts & React 19 Conventions

- **Direct Ref Forwarding:** Do not use `forwardRef`. In React 19, `ref` is a standard component prop. Always include `ref?: Ref<T>` in the component's props interface when rendering a focusable or measurable element:
  ```tsx
  export interface ControlProps extends InputHTMLAttributes<HTMLInputElement> {
    ref?: Ref<HTMLInputElement>;
    sizeVariant?: 'sm' | 'md';
  }
  ```
- **Standardised Prop Vocabulary:** Maintain consistent prop names and tokenized scale unions across the entire design system:
  - **Visual Variants:** `variant: 'primary' | 'secondary' | 'subtle' | 'danger'`
  - **Sizes:** `size: 'sm' | 'md' | 'lg'`
  - **Spacing & Insets:** Consume the canonical `SpacingScale` (`'none' | 'dense' | 'tight' | 'default' | 'loose' | 'section' | 'fib-1'..'fib-7'`)
  - **Spatial Alignment:** `align: 'start' | 'center' | 'end' | 'stretch'` and `justify: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'`
- **State-to-Data Reflection:** Reflect component variants, interactive states, and boolean flags directly onto HTML `data-*` attributes (`data-status={status}`, `data-selected={isSelected ? 'true' : undefined}`). Dynamic `className` string concatenation for variant switching is strictly forbidden.
- **Transparent Attribute Spreading:** Wrapper components must pass native HTML attributes (`aria-*`, `disabled`, `value`, `onChange`, `onKeyDown`) directly to the underlying interactive element rather than trapping them on outer layout containers.

---

## 3. Accessibility & Interaction Standards

- **Native Capabilities First:** Prefer native HTML5 interactive elements (`<dialog>`, `<button>`, `<input>`, `<table>`) over `div`/`span` role emulation.
- **Preserve Semantic Tree Integrity:** Never override or destructively replace structural HTML roles (e.g. table rows `<tr>` must retain table semantics; interactive rows augment with `aria-selected` and keyboard listeners rather than replacing the row with `role="button"`).
- **Unambiguous Accessible Names:** All interactive controls, dialogs, and overlays must provide a programmatically determinable name:
  - Modals and drawers must link their title to the container using `aria-labelledby` with a unique ID (`useId()`).
  - Icon-only buttons and controls without visible text labels must provide an `aria-label`.
- **Described-By Chain Preservation:** When associating auxiliary text or tooltips via `aria-describedby`, always compose with existing descriptors (`[existingDescribedBy, auxiliaryId].filter(Boolean).join(' ')`) rather than overwriting.
- **WAI-ARIA Pattern Compliance:** Interactive controls must follow standard keyboard and focus paradigms:
  - Switches (`role="switch"`) toggle on `Space`.
  - Native dialogs isolate focus, close on Escape, and differentiate backdrop clicks from interior clicks.
  - Comboboxes maintain proper relationships between the input, expanded state, and active listbox option.

---

## 4. State Lifecycle, Performance & Numerical Robustness

- **Mount-Driven State Isolation:** Encapsulate transient overlay, form, or filter state within sub-components that mount conditionally when activated. Avoid synchronous `setState` inside `useEffect` on opening; initial state should compute naturally on initial mount.
- **Boundary Defense & Numerical Safety:** Public component interfaces must gracefully handle unexpected or anomalous data:
  - Guard mathematical calculations against negative radicands (`Math.max(0, val)` before `Math.sqrt`) to prevent `NaN` reaching the interface.
  - Guard division operations against zero or undefined divisors to prevent `Infinity`.
- **Computational Memoization:** Wrap non-trivial filtering, string searching, and intensive coordinate transformations in `useMemo` to safeguard the 60fps frame budget as data sets scale.
- **Unconditional Resource Cleanup:** Any global event listeners (keyboard shortcuts, resize observers, animation frames) or timers registered within a component must define an explicit cleanup function in their lifecycle effect.

---

## 5. Modular CSS & Design Token Architecture

- **Modular CSS Exclusively:** Every component has a dedicated `<Component>.module.css` file. Inline styles (`style={{ ... }}`) are strictly forbidden.
- **Zero Literal Tokens:** Component stylesheets must never reference literal palette values (`--palette-*`). Only consume semantic tokens (`--surface-*`, `--content-*`, `--state-*`, `--status-*`).
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
- **Pure Exception Mutation:**
  - In `@layer exceptions`, mutate only the local custom properties via HTML `data-*` selectors, preserving base geometry and layout:
    ```css
    @layer exceptions {
      .component[data-status="critical"] {
        --component-border: var(--status-critical);
      }
    }
    ```
- **Accurate Interactive Affordances:**
  - Scope `cursor: pointer` only to elements that have active click handlers (`[data-selectable="true"]` or `[data-interactive="true"]`).
  - Every interactive element must provide a distinct `:focus-visible` ring using semantic focus tokens (`--state-focus`, `--state-focus-ring-width`).
