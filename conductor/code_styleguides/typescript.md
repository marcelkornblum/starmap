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

## 3. Naming Conventions

- **`UpperCamelCase`:** Types, interfaces, React components, and enums.
- **`lowerCamelCase`:** Variables, properties, functions, methods, and React hooks.
- **`CONSTANT_CASE`:** Module-level constants, physical constants, and fixed enum values.
- **Descriptive Identifiers:** Avoid abbreviations unless industry standard (e.g. `ra`, `dec`, `id`, `url`). Do not use `_` prefixes or suffixes.
