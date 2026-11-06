# TypeScript & React Style Guide

This guide establishes the mandatory TypeScript and React standards for Starmap.

## 1. Type Safety & Soundness

- **Avoid `any`:** Use `unknown`, discriminated unions, or generic parameters. Never use `any` to silence compiler errors.
- **Avoid Type Assertions:** Avoid `as Type` casts and non-null assertions (`!`). Use explicit type guards and narrowing.
- **Discriminated Unions:** Model distinct domain states, telemetry statuses, and entity variants using discriminated unions rather than optional flag combinations.
- **No Empty Object Type (`{}`):** Prefer `Record<string, unknown>` or an explicit interface over `{}`.
- **Explicit Signatures:** Let TypeScript infer trivial local variables, but explicitly type public interfaces, exported functions, and data-domain boundaries.

## 2. React Components & Architecture

For comprehensive rules on component taxonomy, React 19 ref/props forwarding, WAI-ARIA semantics, and state lifecycle patterns, refer strictly to [components.md](./components.md). For 3D WebGL, Three.js, and React Three Fiber (R3F) canvas components, refer strictly to [webgl-r3f.md](./webgl-r3f.md).

- **Functional Components:** Define components as named `const` arrow functions.
- **Explicit Props Interfaces:** Always declare a dedicated interface for component props (`[Component]Props`). Do not use inline object types.
- **Named Exports Only:** Default exports are forbidden (except where strictly required by dynamic routing/lazy loading).
- **Composition over Inheritance:** Compose layout exclusively via Every Layout primitives (`<Stack>`, `<Cluster>`, `<Grid>`, etc.). Components must never accept margin or positioning props.
- **Props-to-Data Forwarding:** Forward component states and variants (e.g. `status`, `variant`, `confidence`) directly to HTML `data-*` attributes (`data-status={status}`) for CUBE styling. Never concatenate dynamic CSS class names.
- **Single Responsibility:** Keep components focused strictly on presentation and user interaction. Decouple domain models, astronomical math, and state logic into dedicated modules and hooks.
- **Mandatory Component File Quad:** Every component in `src/components/interface/**` and `src/components/domain/**` MUST have:
  1. `<Component>.tsx` (implementation; keep domain components focused and under ~300 lines by decomposing complex panels into sub-components)
  2. `<Component>.module.css` (scoped CSS Module inside `@layer blocks` / `@layer exceptions` with a `--<component>-*` local token interface)
  3. `<Component>.stories.tsx` (Storybook stories)
  4. `<Component>.test.tsx` (colocated unit test run by `npm run test` / `npm run test:coverage`)

## 3. Naming Conventions

- **`UpperCamelCase`:** Types, interfaces, React components, and enums.
- **`lowerCamelCase`:** Variables, properties, functions, methods, and React hooks.
- **`CONSTANT_CASE`:** Module-level constants, physical constants, and fixed enum values.
- **Descriptive Identifiers:** Avoid abbreviations unless industry standard (e.g. `ra`, `dec`, `id`, `url`). Do not use `_` prefixes or suffixes.

## 4. Testing Standards

- **Pure Service & Selector Tests:** Test domain logic, astronomical calculations, URL state resolvers, and data transformations directly against the pure TypeScript data structures returned by service functions (`src/services/`, `src/utils/`).
- **Strict `@testing-library/react` DOM Testing:** All `.test.tsx` component and view tests MUST run in `jsdom` using `@testing-library/react` (`render`, `screen`, `within`, `fireEvent` / `userEvent`) to test accessible roles, `data-*` attributes, keyboard/pointer interactions, and callbacks. Importing `renderToString` from `react-dom/server` in tests is strictly forbidden.
- **1:1 Focused Test Files (Zero Monolith Test Suites):** Every service, hook, component, and view must have its own focused `.test.ts(x)` file; dumping unrelated component or view assertions into catch-all files like `tests/searchService.test.ts` is forbidden.
- **Component Contract Assertions:** Render components with `@testing-library/react` (`render`, `screen.getByTestId`, `screen.getByRole`) and assert on semantic `data-*` attributes (`data-datum="true"`, `data-data-table="true"`, `data-quantity="true"`, `data-status`, `data-reticle`), WAI-ARIA roles and states (`role="switch"`, `aria-checked`, `role="table"`), `href` targets, and normalised element text content.
