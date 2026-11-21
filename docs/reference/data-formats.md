# Starmap Data Formats Reference

This document specifies the binary and compact JSON serialization formats used for runtime assets in `public/data/`. All files are generated offline by the build pipeline (see [data-pipeline.md](../architecture/data-pipeline.md)).

---

## 1. File Map & Envelopes

Runtime assets are served as static files under `public/data/`:

| Directory | Format | Contents |
| :--- | :--- | :--- |
| `partitions/sector_<x>_<y>_<z>.bin` | Binary | Spatial sector partitions of all stars within 100 pc for zero-copy WebGL rendering. |
| `systems/sector_<x>_<y>_<z>.json` | JSON Array | Array of `CompactSystemManifest` records for systems within the sector containing planets, disks or mag ≤ 4. |
| `summaries/<0..z>.json` | JSON Envelope | 36-bucket dictionary shards (`Record<string, CompactSummaryNode>`) for all catalogued star systems. |
| `details/<0..z>.json` | JSON Envelope | 36-bucket dictionary shards (`Record<string, CompactDetailRecord>`) for detailed systems, structures and Solar System bodies. |
| `catalogs/*.json` | JSON Array / Envelope | Curated formal catalogues: `solar-neighborhood-10pc.json` and `reference-bright-stars.json`. |
| `overlays/*.json` | JSON Array / Envelope | Topic overlays: `exoplanetary-systems.json` and `galactic-structures.json`. |
| `overlays/layers/*.json` | JSON Envelope | Dataset layers: registry `index.json`, individual manifests `<layerId>.json`, and by-entity reverse lookup shards `by-entity/<0..z>.json`. |
| `sol/*.json` | JSON Envelope | Solar System datasets: `ephemeris-primary-bodies.json`, `orbital-elements-asteroids.json`, `orbital-elements-neo.json`, and `orbital-elements-comets.json`. |
| `search/*.json` | JSON Envelope | Search indices: composite tiers `core.json`, `full.json`, and category shards `stars.json`, `planets.json`, `structures.json`, `minor-bodies.json`, `layers.json`. |

### JSON Envelopes

JSON files wrap their payload in a standard envelope:

```json
{
  "v": 1,
  "i": "0",
  "c": 671,
  "t": "2026-01-01T00:00:00.000Z",
  "d": { ... }
}
```

- `v`: Schema version (`COMPACT_SCHEMA_VERSION = 1`).
- `i`: Identifier or shard key (e.g. bucket `'0'`, search index `'search-core'`).
- `c`: Total record count.
- `t`: Deterministic ISO-8601 build timestamp (from `SOURCE_DATE_EPOCH` or `data/seed/build-epoch.json`).
- `d`: Payload. On sharded dictionaries (`summaries/`, `details/`, `by-entity/`), `d` is an object keyed by entity ID, enabling $O(1)$ lookup `d[id]`. On search indices and catalogues, `d` is an array.

---

## 2. Spatial Partitioning & Modulo-36 Sharding

Starmap uses two complementary partitioning schemes to eliminate large single-file payloads:

### 2.1 Spatial Sectors (`25 pc` cubes)
Space is partitioned into uniform cubes of 25 parsecs side length (`DEFAULT_SECTOR_SIZE_PC` in `src/utils/sectorMath.ts`). Sector identifiers follow the pattern `sector_<+|-xxx>_<+|-yyy>_<+|-zzz>` (e.g. `sector_+000_+000_-025`), formatted via `formatSectorId(x, y, z)`.

### 2.2 Modulo-36 ID Sharding
Non-spatial assets (`summaries/`, `details/`, `overlays/layers/by-entity/`) are partitioned into 36 uniform bucket files (`0.json`–`9.json`, `a.json`–`z.json`). The bucket key is computed from the 32-bit FNV-1a hash of the entity ID:

$$\text{bucket} = (\text{fnv1a32}(\text{id}) \pmod{36})\text{.toString}(36)$$

Implemented in `src/utils/compactDataCodec.ts` as `getShardKey(id)` and `src/utils/binarySectorCodec.ts` as `getShardKeyFromHash(idHash)`. This guarantees uniform file distribution and $O(1)$ client lookup without downloading multi-megabyte indexes.

---

## 3. Binary Sector Partition Format (`.bin`)

Spatial partitions in `public/data/partitions/` are encoded as 16-byte aligned binary files designed for zero-copy WebGL buffer creation. Codec implementation lives in `src/utils/binarySectorCodec.ts`.

### 3.1 Header (28 bytes)

| Byte Offset | Type | Field | Description |
| :---: | :---: | :--- | :--- |
| `0x00 .. 0x03` | `Uint32` | `magic` | Magic identifier `0x52415453` (ASCII `'STAR'`, little-endian) |
| `0x04 .. 0x07` | `Uint32` | `version` | Format version (`1`) |
| `0x08 .. 0x0B` | `Uint32` | `count` | Number of star records in this sector ($N$) |
| `0x0C .. 0x0F` | `Float32` | `originX` | Sector minimum X coordinate in parsecs |
| `0x10 .. 0x13` | `Float32` | `originY` | Sector minimum Y coordinate in parsecs |
| `0x14 .. 0x17` | `Float32` | `originZ` | Sector minimum Z coordinate in parsecs |
| `0x18 .. 0x1B` | `Float32` | `sectorSize` | Side length in parsecs (`25.0`) |

### 3.2 Star Records ($N \times 16$ bytes)

Beginning immediately at byte offset 28 (`0x1C`), star records occupy 16 contiguous bytes each:

| Relative Offset | Type | Field | Description |
| :---: | :---: | :--- | :--- |
| `+0x00` | `Float32` | `x` | Galactic X coordinate in parsecs |
| `+0x04` | `Float32` | `y` | Galactic Y coordinate in parsecs |
| `+0x08` | `Float32` | `z` | Galactic Z coordinate in parsecs |
| `+0x0C` | `Uint32` | `idHash` | Deterministic 32-bit FNV-1a hash of the entity ID string |

There is no string table. Textual attributes and details are resolved on demand via `getShardKeyFromHash(idHash)` against `summaries/<0..z>.json` or `details/<0..z>.json`.

### 3.3 Zero-Copy Buffer Construction

`decodeBinarySector(buffer)` in `src/utils/binarySectorCodec.ts` creates typed array views directly over the `ArrayBuffer`:
- `positions`: `Float32Array` of length $3N$ passing directly to Three.js `BufferAttribute`.
- `ids`: `Uint32Array` of length $N$ providing instantaneous entity hit-testing and ID shard key resolution.

---

## 4. Compact JSON Schemas & Codec Pointers

Runtime JSON schemas use single-character keys, packed numeric tuples, and bitmasks to minimize network payload and memory footprint. Universal default values are omitted.

Rather than maintaining duplicate, drifting key tables in documentation, canonical schemas and constants are defined strictly in TypeScript:

### 4.1 Schema Interfaces
- **System Summaries:** `CompactSummaryNode` in [`src/utils/compactDataTypes.ts`](../../src/utils/compactDataTypes.ts).
- **System Details & Manifests:** `CompactSystemManifest`, `CompactStellarComponent`, `CompactExoplanet`, `CompactCircumstellarDisk` in [`src/utils/compactDataTypes.ts`](../../src/utils/compactDataTypes.ts).
- **Galactic Structures & Solar System Bodies:** `CompactGalacticStructure`, `CompactSolarSystemBody`, `CompactDetailRecord` in [`src/utils/compactDataTypes.ts`](../../src/utils/compactDataTypes.ts).
- **Search Indices:** `CompactSearchEntry`, `SearchSummaryTuple`, `SearchIndexEnvelope` in [`src/utils/compactDataTypes.ts`](../../src/utils/compactDataTypes.ts).
- **Dataset Layers & Annotations:** `DatasetLayerManifest` in [`src/types/datasetLayers.ts`](../../src/types/datasetLayers.ts); `CompactLayerManifest`, `CompactLayerEntry`, `CompactEntityAnnotation` in [`src/utils/datasetLayerTypes.ts`](../../src/utils/datasetLayerTypes.ts).

### 4.2 Encoders and Decoders
- **Compact Data Codec:** `src/utils/compactDataCodec.ts` and `src/utils/compactEntityDecoder.ts`.
- **Dataset Layer Codec:** `src/utils/datasetLayerCodec.ts`.
- **Pipeline Encoders:** `scripts/pipeline/compactDataEncoder.ts`, `scripts/pipeline/compactEntityEncoder.ts`, `scripts/pipeline/datasetLayerEncoder.ts`.

### 4.3 Numeric Tuples & Constant Mappings
Bitmasks and enumeration codes are defined in [`src/utils/compactDataConstants.ts`](../../src/utils/compactDataConstants.ts):
- **3D Vectors:** `[x, y, z]` in parsecs, `[vx, vy, vz]` in km/s.
- **Keplerian Orbit Tuple (`OrbitTuple`):** `[a, e, i, Ω, ω, M0, P]` ($a$ in AU, $e$ eccentricity, $i$ inclination in degrees, $\Omega$ longitude of ascending node in degrees, $\omega$ argument of periapsis in degrees, $M_0$ mean anomaly in degrees, $P$ period in Earth days).
- **Bitmasks:** `PLANET_CENSUS_BITS`, `SYSTEM_TAG_BITS`, `THEORETICAL_*_FLAGS`.
- **Classification Codes:** `STRUCTURE_TYPE_TO_CODE`, `SOLAR_CLASS_TO_CODE`, `DISCOVERY_METHOD_TO_CODE`, `PLANET_COMP_TO_CODE`, `CONFIDENCE_TO_CODE`, `LAYER_KIND_TO_CODE`, `TARGET_TYPE_TO_CODE`.
