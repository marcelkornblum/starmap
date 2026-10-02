# React Component Architecture & Design System Style Guide

This style guide establishes the architectural, accessibility, state, and styling standards for React 19 components in Starmap.

---

## 1. Component Hierarchy & Taxonomy

All interface elements strictly belong to one of four architectural tiers defined in `docs/design-system.md`:

- **Tier 1: Primitives**
  - **Layout Primitives:** `<Stack>`, `<Cluster>`, `<Sidebar>`, `<Switcher>`, `<Grid>`, `<Center>`, `<Cover>`, `<Frame>`, `<Reel>`, `<Box>`, `<Imposter>`, `<Icon>`. Layout primitives own 100% of spatial flow, layout geometry, and spacing.
  - **Data & Control Atoms:** `<Datum>`, `<Metric>`, `<Badge>`, `<Button>`, `<Input>`, `<Toggle>`, `<Slider>`, `<Select>`. Base interactive controls and formatted telemetry outputs.
- **Tier 2: Surfaces & Overlays**
  - **Surfaces:** `<Card>`, `<Panel>`, `<Dock>`, `<Well>`. Visual elevation and spatial planes.
  - **Overlays:** `<Modal>`, `<Drawer>`, `<Popover>`, `<Tooltip>`, `<Toast>`. Ephemeral contextual planes.
- **Tier 3: Structural Templates**
  - `<DossierLayout>`, `<MetricStrip>`, `<ToolbarLayout>`. Region containers combining Tier 1 and Tier 2 elements into standardized screen layouts.
- **Tier 4: Domain Assemblies**
  - `<StarDossier>`, `<OrbitTable>`, `<CommandPalette>`, `<SystemControls>`. High-level feature compositions bound to domain entities (stars, planets, Keplerian orbits, simulation clocks).

---

## 2. React 19 Standards & Component Contracts

- **No `forwardRef`:** React 19 supports `ref` directly as a component prop. Declare `ref?: Ref<T>` directly within the component's props interface:
  ```tsx
  export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    ref?: Ref<HTMLInputElement>;
    sizeVariant?: 'sm' | 'md';
  }
  ```
- **Standardised Prop Names:**
  - **Variants:** `'primary' | 'secondary' | 'subtle' | 'danger'` (avoid ad-hoc names such as `'ghost'`).
  - **Sizes:** `'sm' | 'md' | 'lg'` (avoid `'small'`, `'compact'`).
  - **Spacing:** Consume the `SpacingScale` union (`'none' | 'dense' | 'tight' | 'default' | 'loose' | 'section' | 'fib-1'..'fib-7'`).
  - **Flex Alignment:** `align: 'start' | 'center' | 'end' | 'stretch'` and `justify: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'`.
- **Props-to-Data Forwarding:** Forward component variants, statuses, and booleans directly to HTML `data-*` attributes (`data-status={status}`, `data-size={sizeVariant}`). Dynamic `className` string concatenation for variant switching is strictly forbidden.
- **Native Attribute Forwarding on Custom Form Controls:** Form control wrappers (`<Input>`, `<Slider>`, `<Toggle>`) must forward native HTML attributes (`aria-label`, `disabled`, `step`, `min`, `max`, `value`, `onChange`) directly to the underlying `<input>` or `<button>` element rather than trapping them on outer container `<div>` elements.

---

## 3. Accessibility & WAI-ARIA Semantics

- **Native `<dialog>` for Modal Surfaces:**
  - All modal overlays (`<Modal>`, `<Drawer>`) must use the native HTML5 `<dialog>` element with `::backdrop` styling.
  - Manage visibility imperatively via `dialogRef.current?.showModal()` and `dialogRef.current?.close()`.
  - **Dismissal Click-Check:** Prevent clicks on inner content or container padding from accidentally closing the dialog by validating the click coordinates against the bounding rectangle:
    ```tsx
    const handleDialogClick = (e: MouseEvent<HTMLDialogElement>) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isBackdropClick =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;
      if (isBackdropClick) onClose();
    };
    ```
  - **Accessible Labelling:** Always link modal headers to the dialog container using `aria-labelledby` with a stable identifier generated via `useId()`.
- **Toggle / Switch Semantics:**
  - Implement toggles with a semantic `<button type="button" role="switch" aria-checked={checked}>`.
  - Restrict keyboard toggling to the `Space` key (preventing default scroll behavior).
- **Table Semantics vs Interactive Lists:**
  - Never replace or override `<tr>` with `role="button"`, as this invalidates the table tree in assistive technology.
  - For selectable rows, retain native table row semantics with `aria-selected={isSelected}`, `data-selectable="true"`, and `tabIndex={0}`, handling `Enter` and `Space` keyboard events.
- **Preserving Described-By Chains:**
  - When attaching tooltips or auxiliary text via `aria-describedby`, merge existing identifiers rather than replacing them:
    ```tsx
    const combinedDescribedBy = [existingDescribedBy, tooltipId].filter(Boolean).join(' ');
    ```
- **Combobox Pattern:**
  - Search inputs and command palettes must follow the ARIA 1.2 Combobox pattern: `role="combobox"`, `aria-expanded`, `aria-controls={listboxId}`, `aria-autocomplete="list"`, `aria-activedescendant={activeOptionId}`.

---

## 4. State Lifecycle & Render Purity

- **Mount-Based Initialisation over Synchronous Effects:**
  - Never call `setState` synchronously inside a `useEffect` on modal/dialog opening (triggers cascading re-renders and React Compiler warnings).
  - Mount dynamic dialog content conditionally:
    ```tsx
    <Modal isOpen={isOpen} onClose={onClose} title="...">
      {isOpen && <CommandPaletteContent items={items} onClose={onClose} />}
    </Modal>
    ```
  - This ensures query state, cursor indexes, and scroll positions initialise naturally on mount with zero cascading effects.
- **Search & Filtering Memoization:**
  - Wrap catalog filtering, string searching, and intensive coordinate transformations in `useMemo` to protect the 60fps frame budget and eliminate input lag as celestial catalogs scale.
- **Astronomical Calculations & Numerical Robustness:**
  - Always guard mathematical operations against unexpected or anomalous catalog data:
    - Guard `Math.sqrt` radicands against negative values using `Math.max(0, val)` to prevent `NaN` in habitable zone or orbital distance calculations.
    - Guard divisions against zero denominators (`val / (divisor || 1)` or explicit guard clause) to avoid `Infinity`.
- **Strict Event Listener Cleanup:**
  - Any window or document event listeners (`keydown`, `pointermove`, `resize`) must be unregistered in the `useEffect` cleanup return function.

---

## 5. CSS Module & Token Integration

- **Modular CSS Exclusively:** Every component must have a dedicated `<Component>.module.css` file. Zero inline styles (`style={{ ... }}` is strictly forbidden).
- **Zero Literal Tokens:** Components must never reference literal palette tokens (e.g. `--palette-solarized-blue`, `--solarized-blue`). Only consume semantic tokens (`--state-focus`, `--surface-panel-bg`, `--content-bright`, etc.).
- **Local Token Interface in `@layer blocks`:**
  - Declare component-scoped custom properties (`--component-*`) at the root selector in `@layer blocks`:
    ```css
    @layer blocks {
      .dossier {
        --dossier-bg: var(--surface-panel-bg);
        --dossier-border-color: var(--surface-panel-border-color);
        background: var(--dossier-bg);
        border: var(--stroke-hairline) solid var(--dossier-border-color);
      }
    }
    ```
- **Exceptions in `@layer exceptions`:**
  - Exceptions mutate only the local custom properties using HTML `data-*` selectors:
    ```css
    @layer exceptions {
      .dossier[data-status="critical"] {
        --dossier-border-color: var(--status-critical);
      }
    }
    ```
- **Interactive Affordances & Focus Rings:**
  - Scope `cursor: pointer` only to elements that have active click handlers (`[data-selectable="true"]` or `[data-interactive="true"]`).
  - Every interactive element must provide a `:focus-visible` ring using semantic focus tokens (`--state-focus`, `--state-focus-ring-width`).
- **Zero Outer Margins:** Layout flow is owned exclusively by parent primitives. Never set `margin` or external positioning on component blocks.
