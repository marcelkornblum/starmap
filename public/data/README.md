# Starmap Runtime Data Assets

This directory contains precalculated, minified runtime assets served statically to the client application. Files here are generated offline by the build pipeline and should not be modified manually.

For full technical specifications, refer to:
- [Data Formats Reference](../../docs/reference/data-formats.md): binary sector partitions, compact JSON envelopes, modulo-36 sharding, and codec schema definitions.
- [Data Pipeline Architecture](../../docs/architecture/data-pipeline.md): offline ingestion pipeline, build scripts, reproducibility, and precalculation rules.
- [Data Sources Specification](../../docs/reference/data-sources.md): authoritative upstream astronomical catalogues and licences.
