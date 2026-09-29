# Specification: UI System & Primitives

## Overview
This track establishes the fluid, responsive UI design system for Starmap, heavily inspired by CUBE CSS and Every Layout. It creates a robust semantic token system, fluid layout primitives, and strict component interfaces to ensure a harmonious, data-dense interface that perfectly supports Light and Dark modes.

## Functional Requirements
1. **Semantic Vocabulary & Component Taxonomy:** Define a comprehensive set of global design tokens (spacing, harmonic typography scale, semantic colors). Additionally, establish a strict component taxonomy in the documentation (differentiating interactive primitives like Buttons from informational structural blocks like Listing Cards).
2. **Composition Primitives (Every Layout):** Implement React components that handle layout fluidly without media queries (e.g., `<Stack>`, `<Cluster>`, `<Sidebar>`, `<Switcher>`).
3. **Component Token Interfaces:** UI components ("Blocks") must define localized CSS variables at the top of their CSS Modules. Global tokens are mapped to these local variables to create a strict, themeable Component API.
4. **Comprehensive Storybook:** Every primitive and block must be fully documented and interactively testable in Storybook across all variants and themes.
5. **Documentation & Guardrails:** Create clear guidelines for human developers (`docs/design-system.md`) and strict guardrails for AI agents (`.agents/AGENTS.md`) enforcing the CUBE architecture.

## Non-Functional Requirements
- **No Magic Numbers:** Hardcoded hex values and arbitrary pixel spacing are strictly forbidden.
- **Separation of Concerns:** Component blocks must not dictate their own outer margins; spacing is strictly the domain of Composition primitives.

## Acceptance Criteria
- [ ] A semantic token vocabulary is documented and implemented in global CSS variables.
- [ ] At least 4 layout primitives (e.g., Stack, Cluster, Center, Sidebar) are built and cataloged in Storybook.
- [ ] Example UI blocks (e.g., Card, Toolbar) are built using the localized component token interface and cataloged.
- [ ] Agent rules are updated to explicitly ban magic numbers and enforce primitive usage.
- [ ] Developer documentation is finalized.
