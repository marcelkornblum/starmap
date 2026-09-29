# Specification: Astro Math Core

## Overview
This track establishes the foundational, data-agnostic mathematical utilities required to process astronomical coordinates. It isolates pure mathematical transformations from data ingestion pipelines, ensuring the Starmap UI can handle coordinates from any data source.

## Functional Requirements
1. **Coordinate Transformation:** Implement `equatorialToCartesian(ra, dec, dist)` to convert Right Ascension, Declination, and Distance into Cartesian `[x, y, z]` space.
2. **Arbitrary Plane Rotation:** Implement a generic rotation utility `rotateToOrbitalPlane(coords, inclination, ascendingNode)` to reorient coordinates to *any* arbitrary orbital plane (e.g., Ecliptic, Galactic, or custom Exoplanet planes).
3. **TypeScript Types:** Define the ideal `StarmapNode` interface that our future UI will expect to consume.

## Non-Functional Requirements
- **Data Agnosticism:** Utilities must be pure functions with no dependencies on specific CSV/JSON structures.
- **Precision:** Use high-precision `number` types.

## Acceptance Criteria
- [ ] A dedicated utility file for coordinate transformations is created.
- [ ] The functions correctly map known stars (e.g., Sirius) from RA/Dec to XYZ.
- [ ] The rotation function can successfully tilt coordinates by 23.5 degrees (Earth's ecliptic test).
- [ ] Vitest/Jest is configured.
- [ ] A small, hand-crafted JSON fixture based on `hygdata_v3.csv` is used to achieve ~100% test coverage on the utility functions.

## Out of Scope
- Building the automated build-time data ingestion pipeline (reserved for the next track).
- Any 3D rendering or WebGL canvas integration.
