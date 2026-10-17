# Specification: Journey 4 Data Model & Feature Requirements (Classification Deep-Dive via Encyclopedia)

> [!CAUTION]
> **STRICT STAGE 1 RULE — WHAT ON-SCREEN, NOT HOW TO PRESENT IT:**
> This track defines **only** the required features, view data models, selectors, and interface state logic for Journey 4 ([`docs/user-journeys.md`](../../../docs/user-journeys.md#L77-L93)).
> - **Zero Presentation Assumptions:** Do NOT design MDX page layouts, comparator charts, or visual cards.
> - **One Decision at a Time:** Every classification taxonomy, reference anchor benchmark, and return-to-origin state field must be discussed one by one with the user via `ask_question`, recording options and trade-offs in [`decision-log.md`](../../initiatives/journey-ui-scaffolding/decision-log.md) and [`view-requirements.md`](../../initiatives/journey-ui-scaffolding/view-requirements.md).

## Overview
Walks step-by-step through **Journey 4: Classification Deep-Dive via Encyclopedia** to define and implement the view data models and state logic for classification deep-links from entity data, Encyclopedia Article view models, the Relative Parameter Comparator data model (benchmarking physical metrics against familiar anchors like Earth, Sol, Jupiter, $1\text{ g}$, $1\text{ bar}$), the Category Index view model, hierarchical breadcrumbs, and return-to-origin map state preservation.

## Scope (Journey 4 Steps)

1. **Step 1 — Classification Deep-Link & Return-to-Origin Context Model:**
   - Define the classification taxonomy ID mapping (`Red Supergiant`, `Main Sequence G-Type`, `Super-Earth`, etc.) and the origin return-state stack so navigating from an inspected map entity (e.g. *Betelgeuse*) into the Encyclopedia preserves exact return context.
2. **Step 2 — Encyclopedia Article View Data Model (`ReferenceView`):**
   - Define the article data contract: plain-language summary, astrophysical parameter boundaries (temperature, mass, radius, luminosity, lifespan), exemplar 3D descriptor metadata, and external authority links (e.g. Wikipedia).
3. **Step 3 — Relative Parameter Comparator Data Model:**
   - Define the calculation and data contract for benchmarking any physical parameter (radius, mass, luminosity, surface gravity, temperature, orbital period) against familiar reference anchors (Sol, Earth, Jupiter, Moon, $1\text{ g}$, $1\text{ AU}$), including scale ratios and contextual equivalents (e.g. Betelgeuse radius vs Jupiter's orbital semi-major axis).
4. **Step 4 — Breadcrumb Hierarchy & Category List View Data Model:**
   - Define the hierarchical reference taxonomy (`Encyclopedia` $\to$ `Domain` $\to$ `Classification Type`) and the Category Index view model summarizing all classifications within a domain.

## Acceptance Criteria
- [ ] Every step of Journey 4 is interrogated one decision at a time with the user; all options and trade-offs are recorded in `decision-log.md`.
- [ ] On-screen data and action requirements for `ReferenceView` and cross-view deep-linking are recorded in `view-requirements.md`.
- [ ] Pure TypeScript reference taxonomy models, Relative Parameter Comparator calculators, and origin-return state logic are implemented with unit tests (>80% coverage).
- [ ] Minimal diagnostic view harness allows stepping through Journey 4 on `http://192.168.1.124:5173` with multi-viewport Playwright screenshots captured.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:coverage` pass cleanly.
