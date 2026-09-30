---
trigger: always_on
---

# General Coding Best Practices

## Naming Conventions
- **Outcome-Oriented**: Name variables, attributes, and functions based on their **outcome** or **intent**, not their internal representation.
- **Verb-Noun Pattern**: Prefer the `verbNoun` pattern for functions/methods (e.g., `getUserProfile`, `saveConfiguration`, `calculateCartesianCoordinates`).
- **Clarity over Brevity**: A descriptive name is always better than a cryptic one. Avoid abbreviations unless they are industry standard (e.g., `id`, `url`, `ra`, `dec`).
- **Clean Refactoring**: When refactoring internal APIs, do not include import shims for backwards-compatibility; update the import paths everywhere in the codebase.

## Pattern Reuse & Consistency
- **Idiomatic Usage**: Always use the most idiomatic patterns for TypeScript and React 19 (e.g., modern hooks, strict null checks, discriminated unions).
- **Existing Patterns**: Research the codebase before implementing something new. If a pattern for your task already exists, reuse it to maintain consistency.
- **DRY (Don't Repeat Yourself)**: Extract common logic into reusable functions or components, but avoid over-abstraction.
- **YAGNI (You Aren't Gonna Need It)**: Do not over-build features until you know they are needed; a smaller, tighter surface area is superior.

## Logic & Flow
- **Low Cognitive Load**: Write simple, clear paths of execution.
- **Guard Clauses**: Use guard clauses to handle edge cases, missing data, and invalid parameters early, reducing nested `if/else` branches.
- **Function Responsibility**: Keep functions small and focused strictly on a single concern. If a function handles multiple responsibilities, decompose it.

## Error Handling
- **Explicit Failure**: Throw errors early with clear, actionable messages. Specific error types/classes are preferred over generic strings.
- **Fail Silently?**: Only fail silently if explicitly instructed, and ensure the reason is documented in code and covered by tests.

## Documentation
- **Self-Documenting Code**: Write code that is easy to understand without comments. If it is not clear, refactor it.
- **Docblocks**: Use standard JSDoc/TSDoc formats to describe function parameters, return values, units of measure (e.g., parsecs, light-years, radians), and coordinate frames.
- **Relative Links**: Always use relative file links (e.g., `[filename](../path/to/file)`) rather than absolute system paths when referencing other files in markdown documents, plans, or codebase documentation.
