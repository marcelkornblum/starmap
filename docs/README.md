# Starmap Documentation

Authoritative specifications for the 3D cartographic engine, UI system, data pipeline and user experience. Project process (tracks, workflow, styleguides) lives in [`conductor/`](../conductor/index.md).

## Index

| Doc | Purpose | Status |
| :--- | :--- | :--- |
| [`architecture/3d-canvas-management.md`](./architecture/3d-canvas-management.md) | Single persistent WebGL canvas, `<CanvasLayer>` stage slots, 60fps frame-loop rules | Authoritative |
| [`architecture/routing-and-state.md`](./architecture/routing-and-state.md) | TanStack Router as SSOT, URL search grammar, state boundaries | Authoritative |
| [`architecture/layering-and-guardrails.md`](./architecture/layering-and-guardrails.md) | Module layer ranks (0–10), CI guard suite, shrink-only baselines | Authoritative |
| [`architecture/data-pipeline.md`](./architecture/data-pipeline.md) | Offline build pipeline, binary sector shards, compact JSON codecs | Authoritative |
| [`architecture/theme-token-bridge.md`](./architecture/theme-token-bridge.md) | CSS custom properties synchronised into WebGL materials | Authoritative |
| [`reference/data-sources.md`](./reference/data-sources.md) | Catalogue provenance, coordinate frames, ingestion | Authoritative |
| [`design/design-system.md`](./design/design-system.md) | Tokens, primitives, CUBE CSS, component quads | Authoritative |
| [`design/ui-visual-language.md`](./design/ui-visual-language.md) | Semantic token rules: hazards, confidence, tabular data | Authoritative |
| [`design/3d-spatial-architecture.md`](./design/3d-spatial-architecture.md) | Coordinate system, datum plane, travelling fins, zoom dynamics | Authoritative |
| [`design/scene-requirements.md`](./design/scene-requirements.md) | Scale hierarchy, interaction states, per-view rendering rules | Authoritative |
| [`design/user-journeys.md`](./design/user-journeys.md) | User archetypes, JTBDs, end-to-end journeys | Authoritative |
| [`ui-paradigm-exploration.md`](./ui-paradigm-exploration.md) | Adaptive hybrid console layout decisions | Pending Phase 2 merge into `design/` |
| [`../public/data/README.md`](../public/data/README.md) | Layout of generated data shards | Pending Phase 2 review |

Review tooling (LAN links, multi-viewport screenshots) is documented in [`conductor/local-review-and-screenshots.md`](../conductor/local-review-and-screenshots.md).

Decision (`DEC-*`) and audit finding (`AUD-*`) IDs referenced in these docs live in the archived initiative logs under [`conductor/archive/initiatives/`](../conductor/archive/initiatives/).

## Test & Prototype Fixtures

Static slices of real catalogue data for unit tests and Storybook:

- [`tests/fixtures/stars.fixture.json`](../tests/fixtures/stars.fixture.json): six control stars (Sol, Sirius, Betelgeuse, Alpha Centauri A, Vega, Polaris) from HYG v3.
- [`tests/fixtures/system.fixture.json`](../tests/fixtures/system.fixture.json): `SystemManifest` records for Sol (8 planets) and Tau Ceti (4 candidates).
- [`tests/fixtures/planet.fixture.json`](../tests/fixtures/planet.fixture.json): `DetailedPlanetRecord` records for Earth and Tau Ceti e (with uncertainties and em-dash fallbacks).
