# HTML & Modular CSS Style Guide

All component styling must adhere to the design system specifications in `docs/design-system.md` and the component architecture standards in [components.md](./components.md).

## 1. Core Invariants

- **Modular CSS Exclusively:** Every component must have a dedicated CSS Module (`<Component>.module.css`). Global styles are strictly restricted to `src/styles/` (`layers.css`, `tokens.css`, `index.css`).
- **Zero Inline Styles:** Inline styles (`style={{ ... }}`) are strictly forbidden in JSX and HTML. Never use `style` attributes for dynamic properties, positioning, or theming.
- **Zero Outer Margins:** Component blocks MUST NEVER define external `margin` or layout positioning. All spacing and structural flow are owned by Composition Primitives (`<Stack>`, `<Cluster>`, `<Grid>`).
- **Semantic Tokens Only:** Hardcoded hex colors, raw pixel spacings, and arbitrary font sizes are strictly forbidden. All styling values must consume semantic tokens (`var(--token-name)`).
- **Tabular Data Numerals:** Numeric measurements, coordinates, and astronomical data must use `--font-data` and `font-variant-numeric: tabular-nums`.

## 2. CUBE CSS & Layer Architecture

Component stylesheets must implement the CUBE pattern using `@layer blocks` and `@layer exceptions`:

```css
/* src/components/surfaces/Card/Card.module.css */
@layer blocks {
  .card {
    /* 1. Local Token Interface at the top of the selector */
    --card-bg:           var(--surface-panel-bg);
    --card-border-color: var(--surface-panel-border-color);
    --card-border-width: var(--surface-panel-border-width);
    --card-border-style: var(--surface-panel-border-style);
    --card-shadow:       var(--surface-panel-shadow);
    --card-padding:      var(--space-inset-card);

    /* 2. Structural Declarations */
    background: var(--card-bg);
    border: var(--card-border-width) var(--card-border-style) var(--card-border-color);
    box-shadow: var(--card-shadow);
    padding: var(--card-padding);
  }
}

@layer exceptions {
  /* 3. Exceptions mutate ONLY the Local Token Interface via HTML data-* attributes */
  .card[data-status="critical"] {
    --card-border-color: var(--status-critical);
  }

  .card[data-status="caution"] {
    --card-border-color: var(--status-caution);
  }
}
```

## 3. Rules & Enforcement

1. **State & Variants:** Bind variants (`data-status`, `data-variant`, `data-density`) to HTML `data-*` attributes. Dynamic `className` string interpolation is forbidden.
2. **Atomic Exception Overrides:** Exceptions mutate only the targeted custom property (e.g. `--card-border-color`), preserving base layout and geometry.
3. **Class Naming:** Use `camelCase` for CSS Module exports (e.g. `styles.dataRow`).
