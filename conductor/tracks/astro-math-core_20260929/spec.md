# Specification: Astro Math Core

## Overview
This track establishes the foundational, data-agnostic mathematical utilities required to process astronomical coordinates. It isolates pure mathematical transformations from data ingestion pipelines, ensuring the Starmap UI can handle coordinates from any data source.

## Functional Requirements
1. **Coordinate Transformation:** Implement `equatorialToCartesian(ra, dec, dist)` to convert Right Ascension, Declination, and Distance into Cartesian `[x, y, z]` space.
2. **Arbitrary Plane Rotation (Bulk):** Implement a generic rotation utility `rotateToOrbitalPlane(buffer, inclination, ascendingNode)` to reorient coordinates to *any* arbitrary orbital plane. This must operate on bulk data to support runtime UI plane-switching.
3. **TypeScript Types:** Define the ideal `StarmapNode` interface that our future UI will expect to consume, and establish the TypedArray structures for bulk processing.

## Non-Functional Requirements
- **Data Agnosticism:** Utilities must be pure functions with no dependencies on specific CSV/JSON structures.
- **Extreme Performance (Runtime Ready):** Because these utilities will be used at runtime on massive datasets (e.g., 100k+ stars at 60fps), they MUST accept and mutate `Float32Array` buffers directly.
- **Zero Allocation:** The math functions must be designed to avoid generating new objects or arrays during execution to prevent Garbage Collection (GC) stutters.

## Acceptance Criteria
- [ ] A dedicated utility file for coordinate transformations is created.
- [ ] The functions correctly map known stars (e.g., Sirius) from RA/Dec to XYZ.
- [ ] The rotation function can successfully tilt coordinates by 23.5 degrees (Earth's ecliptic test).
- [ ] Vitest/Jest is configured.
- [ ] A small, hand-crafted JSON fixture based on `hygdata_v3.csv` is used to achieve ~100% test coverage on the utility functions.

## Out of Scope
- Building the automated build-time data ingestion pipeline (reserved for the next track).
- Any 3D rendering or WebGL canvas integration.
