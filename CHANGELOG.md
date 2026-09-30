# Changelog

All notable changes to the Starmap project are documented in this file.

## [Astro Math Core] - 2026-09-30

### Added
- **Coordinate Transformations (`src/utils/astroMath.ts`):**
  - `equatorialToCartesian(ra, dec, dist, target?, offset?)`: Converts celestial Equatorial coordinates (Right Ascension in hours, Declination in degrees, Distance in parsecs) to Cartesian `[x, y, z]` space in parsecs with support for in-place buffer mutation.
  - `rotateToOrbitalPlane(buffer, inclination, ascendingNode, options?)`: Bulk transformation utility reorienting interleaved `Float32Array` coordinates to arbitrary orbital planes with zero heap allocations during vertex processing.
  - Astronomical angle conversion constants (`HOURS_TO_RADIANS`, `DEG_TO_RADIANS`, `RADIANS_TO_DEG`).
- **Astronomical Types (`src/types/astro.ts`):**
  - `StarmapNode` interface representing stars and celestial objects.
  - Coordinate types (`CartesianTuple`, `CartesianCoordinates`, `EquatorialCoordinates`, `OrbitalPlaneOrientation`).
  - `BulkCoordinateBuffer` (`Float32Array`) for high-throughput WebGL vertex structures.
- **Test Infrastructure & Fixtures:**
  - Installed and configured Vitest with v8 code coverage provider.
  - Created `tests/fixtures/stars.fixture.json` containing 6 control group stars extracted from `data/hygdata_v3.csv`.
  - Comprehensive unit test suites in `tests/astroMath.test.ts` and `tests/types.test.ts` achieving 100% test coverage across all mathematical routines.
