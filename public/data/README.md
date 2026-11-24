# Starmap Runtime Data Assets

This directory contains precalculated, minified runtime assets served statically to the client application. All generated shards and `manifest.json` are gitignored and generated on demand—do not edit them manually.

## Generating Runtime Data

- **Fast offline fixture (`npm run data:fixture`)**: builds a compact, deterministic shard set (~1.5 s) from committed raw slices in `tests/fixtures/pipeline-raw/` and `data/seed/`, suitable for offline development, unit tests, and Playwright E2E runs (`-- --if-missing` skips rebuilding when `manifest.json` already exists).
- **Full ~314k-star catalogue (`npm run data:pipeline`)**: fetches upstream astronomical catalogues into `data/raw/` and builds the complete production shard set (`npm run data:build` rebuilds from already-fetched local raw files).
- **Monolithic `data/stars.json` (`WRITE_STARS_JSON=1 npm run data:build`)**: opt-in emission of the legacy monolithic `data/stars.json` catalogue alongside the sharded runtime outputs.

For full technical specifications, refer to:
- [Data Formats Reference](../../docs/reference/data-formats.md): binary sector partitions, compact JSON envelopes, modulo-36 sharding, and codec schema definitions.
- [Data Pipeline Architecture](../../docs/architecture/data-pipeline.md): offline ingestion pipeline, build scripts, reproducibility, and precalculation rules.
- [Data Sources Specification](../../docs/reference/data-sources.md): authoritative upstream astronomical catalogues and licences.
