# Starmap Runtime JSON Data Format Reference

All runtime JSON files in `public/data/` use a minified, zero-whitespace schema with single-character object keys (`a`–`z`, `A`–`Z`), packed numeric tuples for 3D vectors and Keplerian orbits, and strict default-value omission to minimise network transfer size and browser V8 heap memory usage.

---

## 1. Core Conventions

1. **Zero Whitespace:** Emitted via `JSON.stringify(data)` without formatting whitespace.
2. **Packed Numeric Tuples:**
   - **3D Position (`p`):** `[x, y, z]` in parsecs (Equatorial J2000 frame, rounded to $10^{-3}\text{ pc}$). Distance from origin is $\|\mathbf{p}\| = \sqrt{x^2 + y^2 + z^2}$.
   - **3D Velocity (`v`):** `[vx, vy, vz]` in $\text{km/s}$ relative to Sol (rounded to $10^{-2}\text{ km/s}$). Total scalar speed is $\|\mathbf{v}\| = \sqrt{v_x^2 + v_y^2 + v_z^2}$.
   - **Keplerian Orbit (`o`):** 7-element tuple `[a, e, i, Ω, ω, M0, P]`:
     - `o[0]` (`a`): Semi-major axis in Astronomical Units ($\text{AU}$)
     - `o[1]` (`e`): Orbital eccentricity $[0, 1)$
     - `o[2]` (`i`): Orbital inclination in degrees
     - `o[3]` (`Ω`): Longitude of ascending node in degrees
     - `o[4]` (`ω`): Argument of periapsis in degrees
     - `o[5]` (`M0`): Mean anomaly at epoch in degrees
     - `o[6]` (`P`): Orbital period in Earth days
3. **Default Omission:** Keys whose values match the universal default (`starCount = 1`, `planetCount = 0`, `hasHabitableCandidate = false`, `parentBodyId = 'sol'`, or unnamed `Gaia DR3 <id>` display names) are omitted.

---

## 2. File Envelope Header

Used at the root of `catalogs/*.json`, `partitions/sector_*.json`, `overlays/*.json`, `sol/*.json`, and `search-index.json`:

| Key | Full Name | Type | Description |
| :---: | :--- | :--- | :--- |
| `i` | `id` | `string` | Dataset, catalog, overlay, or sector ID (`'sector_+000_+000_-025'`, `'solar-neighborhood-10pc'`). |
| `n` | `name` / `title` | `string` | Human-readable title (omitted on sector partitions). |
| `e` | `epoch` | `string` | Reference epoch (omitted when `'J2000'`). |
| `c` | `count` | `number` | Total number of records in `d`. |
| `t` | `timestamp` | `string` | ISO-8601 generation timestamp. |
| `b` | `bounds` | `[minX, minY, minZ, maxX, maxY, maxZ]` | 6-number sector bounding box in parsecs (on `partitions/sector_*.json`). |
| `d` | `data` | `Record<id, CompactRecord> \| Array<...>` | Keyed dictionary (`Record<id, CompactRecord>`) on `partitions/sector_*.json`, `systems/sector_*.json`, `summaries/<0..z>.json`, and `details/<0..z>.json` (omitting redundant `"i"` inside each value and enabling $O(1)$ lookup `d[id]`); array on ordered catalogs/search indices. |

---

## 2.1 Sharding Architecture: Spatial Sector Shards + 36-Bucket ID Shards (`DEC-006`)

To support both **3D spatial viewport streaming** and **instant $O(1)$ lookup by `id`** (from search results, parent links, or URL deep-links) without downloading multi-megabyte files:

1. **Spatial Sector Shards (`public/data/partitions/sector_*.json` & `public/data/systems/sector_*.json`):**
   - Partitioned by $25 \times 25 \times 25\text{ pc}$ cube (`sector_+000_+000_-025.json`) for 3D exploration streaming.
   - `d` is a **keyed JSON dictionary** (`Record<id, CompactRecord>`), where the object key is the canonical `id`.
2. **Uniform 36-Bucket ID Shards (`public/data/summaries/<0..z>.json` & `public/data/details/<0..z>.json`):**
   - Partitioned into 36 uniform buckets (`0.json`–`9.json`, `a.json`–`z.json`) via a deterministic 32-bit FNV-1a hash modulo 36 (`getShardKey(id)`).
   - `public/data/summaries/<0..z>.json` stores `Record<id, CompactSummaryNode>` across all catalogued systems and entities (~8 KB gzipped per shard).
   - `public/data/details/<0..z>.json` stores `Record<id, CompactDetailRecord>` across all detailed star systems (stars + exoplanets + orbits), galactic structures, and Solar System primary/minor bodies (~9 KB gzipped per shard).

---

## 3. Star & System Summary Record (`SystemSummaryNode` / `StarmapNode`)

Used in `partitions/sector_*.json`, `summaries/<0..z>.json`, `catalogs/*.json`, `overlays/exoplanetary-systems.json`, and `stars.json`:

| Key | Full Name | Type | Omitted When | Description |
| :---: | :--- | :--- | :--- | :--- |
| `i` | `id` | `string \| number` | Keyed dictionary (`d[id]`) | Canonical system/star ID (`'sol'`, `'gaia-2452378776434477184'`). Omitted inside keyed dictionaries (`partitions/`, `summaries/`) where the object key is `id`. |
| `n` | `name` | `string` | Unnamed Gaia field star | Primary display name (`'Tau Ceti'`, `'Ran'`). If omitted, display name is derived from `id` (`Gaia DR3 <id>`). |
| `P` | `properName` | `string` | `undefined` or `=== n` | Official IAU proper name when distinct from `n` (e.g. `'Sun'` on `'Sol'`). |
| `p` | `position` | `[x, y, z]` | *(Required)* | 3D Cartesian coordinates in parsecs. |
| `v` | `velocity` | `[vx, vy, vz]` | `[0, 0, 0]` | 3D space velocity vector in $\text{km/s}$. |
| `m` | `mag` | `number` | *(Required)* | Apparent visual magnitude ($V$ or $G$). |
| `M` | `absmag` | `number` | *(Required)* | Absolute visual magnitude ($M_V$). |
| `s` | `spect` | `string` | `'Unknown'` | Morgan-Keenan spectral classification (`'G8V'`). |
| `c` | `ci` | `number` | `null / undefined` | Photometric colour index ($B-V$ or $G_\text{BP}-G_\text{RP}$). |
| `l` | `lum` | `number` | `undefined` | Stellar luminosity in solar units ($L_\odot$). |
| `u` | `starCount` | `number` | `1` | Number of stellar components in the system. |
| `k` | `planetCount` | `number` | `0` | Number of confirmed exoplanets. |
| `e` | `planetCensus` | `number` | `k === 0` | Bitmask of present planet classes: `1 = terrestrial`, `2 = ice-giant`, `4 = gas-giant`. |
| `h` | `hasHabitableCandidate`| `1` | `false` | Set to `1` if any planet resides in the habitable zone or has $200\text{ K} \le T_\text{eq} \le 320\text{ K}$. |
| `g` | `tags` | `number` | `0` | Bitmask of system flags: `1 = HomeSystem`, `2 = SolarNeighborhood10pc`, `4 = NakedEye`, `8 = ExoplanetHost`, `16 = HabitableCandidate`, `32 = VariableStar`. |
| `q` | `sectorId` | `string` | Inside sector file | Spatial sector ID (`'sector_+000_+000_-025'`). Included only in cross-sector catalogs/overlays or derived from `p`. |
| `a` | `aliases` | `string[]` | `undefined` | Expanded Bayer/Flamsteed/common aliases (`['Tau Cet', '82 G. Eridani']`). |
| `H` | `hip` | `number` | `null / undefined` | Hipparcos catalogue ID (`HIP`). |
| `D` | `hd` | `number` | `null / undefined` | Henry Draper catalogue ID (`HD`). |
| `G` | `gl` | `string` | `null / undefined` | Gliese / GJ catalogue ID (`'GJ 71'`). |
| `b` | `bayer` | `string` | `null / undefined` | Bayer Greek abbreviation (`'Tau'`, `'Eps'`). |
| `f` | `flam` | `number` | `null / undefined` | Flamsteed number (`40`, `55`). |
| `o` | `con` | `string` | `null / undefined` | 3-letter IAU constellation code (`'Cet'`, `'Eri'`). |

---

## 4. Detailed System Manifest (`systems/sector_*.json` & `details/<0..z>.json`)

### 4.1 System Record (`SystemManifest`)
| Key | Full Name | Type | Description |
| :---: | :--- | :--- | :--- |
| `i` | `id` | `string` | Canonical system ID (omitted inside keyed dictionaries where the object key is `id`). |
| `n` | `name` | `string` | Primary display name. |
| `P` | `properName` | `string` | Official IAU proper name (if distinct from `n`). |
| `p` | `position` | `[x, y, z]` | 3D Cartesian coordinates in parsecs. |
| `v` | `velocity` | `[vx, vy, vz]` | 3D space velocity vector in $\text{km/s}$. |
| `S` | `stars` | `CompactStar[]` | Stellar components in the system. |
| `E` | `planets` | `CompactPlanet[]` | Confirmed exoplanets in the system. |
| `o` | `overviewText` | `string` | Optional narrative system overview. |

### 4.2 Stellar Component (`CompactStar` in `S`)
| Key | Full Name | Type | Description |
| :---: | :--- | :--- | :--- |
| `i` | `id` | `string` | Component ID (`'2452378776434477184-A'`). |
| `n` | `name` | `string` | Component display name. |
| `d` | `componentDesignation`| `string` | Component letter (`'A'`, `'B'`). Omitted when `'A'`. |
| `s` | `spectralType` | `string` | Spectral classification (`'G8V'`). |
| `m` | `mag` | `number` | Apparent magnitude. |
| `M` | `absmag` | `number` | Absolute magnitude. |
| `l` | `luminosityLsun` | `number` | Luminosity in $L_\odot$. |
| `u` | `massMsun` | `number` | Mass in $M_\odot$. |
| `r` | `radiusRsun` | `number` | Radius in $R_\odot$. |
| `T` | `effectiveTempK` | `number` | Effective temperature in Kelvin ($K$). |

### 4.3 Exoplanet Record (`CompactPlanet` in `E`)
| Key | Full Name | Type | Description |
| :---: | :--- | :--- | :--- |
| `i` | `id` | `string` | Canonical planet ID (`'tau-ceti-e'`). |
| `n` | `name` | `string` | Display name (`'Tau Ceti e'`). |
| `l` | `letter` | `string` | Orbital letter (`'e'`). |
| `y` | `discoveryYear` | `number` | Year of discovery (`2017`). |
| `d` | `discoveryMethod` | `number \| string` | Method code: `1 = Radial Velocity`, `2 = Transit`, `3 = Imaging`, `4 = Astrometry`, `5 = Microlensing`, `6 = Timing`. |
| `e` | `massMearth` | `number` | Mass in Earth masses ($M_\oplus$). |
| `j` | `massMjup` | `number` | Mass in Jupiter masses ($M_\text{Jup}$, omitted when `e` is present). |
| `r` | `radiusRearth` | `number` | Radius in Earth radii ($R_\oplus$). |
| `R` | `radiusRjup` | `number` | Radius in Jupiter radii ($R_\text{Jup}$, omitted when `r` is present). |
| `T` | `equilibriumTempK` | `number` | Equilibrium temperature in Kelvin ($K$). |
| `s` | `esi` | `number` | Earth Similarity Index $[0, 1]$. |
| `o` | `orbit` | `[a, e, i, Ω, ω, M0, P]` | 7-number Keplerian orbit tuple. |

---

## 5. Galactic Deep-Sky Structures (`overlays/galactic-structures.json` & `details/<0..z>.json`)

| Key | Full Name | Type | Description |
| :---: | :--- | :--- | :--- |
| `i` | `id` | `string` | Canonical structure ID (`'hyades'`, omitted when keyed in `details/`). |
| `n` | `name` | `string` | Primary display name (`'Hyades'`). |
| `k` | `type` | `number` | Kind code: `1 = OpenCluster`, `2 = GlobularCluster`, `3 = SupernovaRemnant`, `4 = Pulsar`, `5 = PlanetaryNebula`, `6 = InterstellarMedium`, `7 = MovingGroup`, `8 = EmissionNebula`, `9 = DarkNebula`, `10 = DeepSkyLandmark`. |
| `p` | `position` | `[x, y, z]` | 3D Cartesian coordinates in parsecs. |
| `r` | `radiusPc` | `number` | Approximate radius in parsecs. |
| `a` | `ageMyr` | `number` | Estimated age in $\text{Myr}$. |
| `c` | `memberCount` | `number` | Confirmed member star count. |
| `g` | `designations` | `string[]` | Cross-catalogue designations (omitted if identical to `[n]`). |
| `d` | `description` | `string` | Custom description (omitted if standard survey default for `k`). |
| `C` | `confidence` | `2 \| 3 \| 4` | Observational confidence tier (`1 = confirmed` omitted; `2 = candidate`, `3 = theoretical`, `4 = unverified`). |
| `f` | `theoreticalFlags` | `number` | Bitmask of mathematically modelled fields (`0` omitted; `1 = dist` representative fallback). |

---

## 6. Solar System Ephemeris & Minor Bodies (`sol/*.json` & `details/<0..z>.json`)

| Key | Full Name | Type | Description |
| :---: | :--- | :--- | :--- |
| `i` | `id` | `string` | Canonical body ID (`'earth'`, `'europa'`, `'433-eros'`, omitted when keyed in `details/`). |
| `n` | `name` | `string` | Display name (`'Earth'`, `'(433) Eros'`). |
| `k` | `classification` | `number` | Class code: `1 = Star`, `2 = Planet`, `3 = DwarfPlanet`, `4 = Moon`, `5 = AsteroidNEO`, `6 = AsteroidMainBelt`, `7 = AsteroidDistant`, `8 = Comet`. |
| `b` | `parentBodyId` | `string` | Parent body ID (omitted when `'sol'`). |
| `r` | `meanRadiusKm` | `number` | Mean physical radius in $\text{km}$. |
| `m` | `massKg` | `number` | Mass in $\text{kg}$. |
| `g` | `gm` | `number` | Gravitational parameter $GM$ in $\text{km}^3/\text{s}^2$. |
| `a` | `albedo` | `number` | Geometric albedo. |
| `R` | `rotationalPeriodHours`| `number` | Sidereal rotation period in hours. |
| `o` | `orbit` | `[a, e, i, Ω, ω, M0, P]` | 7-number Keplerian orbit tuple (epoch J2000). |
| `tags`| `tags` | `string[]` | Body-specific tags (omitted when empty). |
| `C` | `confidence` | `2 \| 3 \| 4` | Observational confidence tier (`1 = confirmed` omitted; `2 = candidate` when MPC orbit uncertainty $U \ge 3$). |
| `f` | `theoreticalFlags` | `number` | Bitmask of mathematically modelled fields (`0` omitted; `1 = meanRadiusKm` estimated from $H$-magnitude). |

---

## 7. Search Indices (`public/data/search/*.json`)

Search indices are emitted in two composite tiers and five category shards:
- **Composite Tiers:**
  - `public/data/search/core.json` — Curated fast-load index ($10\text{ pc}$ census, naked-eye stars $V \le 6.5$, exoplanet hosts, confirmed exoplanets, Solar System primary bodies & major moons, and fictional canon entries).
  - `public/data/search/full.json` — Complete catalogued index (all `HIP` / `HD` / `Gliese` / `Bayer` / `Flamsteed` stars, all confirmed exoplanets, all galactic structures, Solar System primary bodies & moons, and fictional canon entries).
- **Category Shards (for filtered category searches):**
  - `public/data/search/stars.json` — Star systems & individual stellar components.
  - `public/data/search/planets.json` — Confirmed exoplanets, Solar System planets, dwarf planets, and moons.
  - `public/data/search/structures.json` — Galactic clusters, nebulae, supernova remnants, and pulsars.
  - `public/data/search/minor-bodies.json` — Solar System asteroids, NEOs, centaurs, KBOs, and comets.
  - `public/data/search/fiction.json` — Works of fiction, canons, and in-universe system/world entries from Dataset Layers (`FS-001`).

### Search Index Entry Schema
| Key | Full Name | Type | Description |
| :---: | :--- | :--- | :--- |
| `i` | `id` | `string` | Canonical entity ID (`'gaia-2452378776434477184'`, `'tau-ceti-e'`, `'mars'`). Used directly with `getShardKey(i)` to fetch `summaries/<0..z>.json` or `details/<0..z>.json` in $O(1)$. |
| `k` | `entityType` | `number` | Kind code: `1 = system` (default, omitted), `2 = planet`, `3 = moon`, `4 = dwarf-planet`, `5 = structure`, `6 = minor-body`, `7 = fiction`. |
| `n` | `name` | `string` | Primary human-readable display name (`'Tau Ceti'`, `'Tau Ceti e'`, `'Mars'`). |
| `s` | `parentSystemId` | `string` | Real host star system ID (omitted when `k === 1`; always populated on planets, moons, minor bodies, and fiction entries so Galactic View can highlight the host system). |
| `p` | `position` | `[x, y, z]` | 3D Cartesian coordinates in parsecs (omitted when `[0, 0, 0]`). Sector ID is derived via `formatSectorId(p[0], p[1], p[2])`. |
| `m` | `summaryTuple` | `[mag, spect, planetCount, hasHabitable?]` | Inline summary metrics tuple (`[3.5, "G8V", 7, 1]`) so search result cards and multi-result highlights need zero extra fetches. |
| `h` | `isSolSystem` | `1` | Present (`1`) only if the entity belongs to our Solar System (*Sol*). |
| `a` | `cleanKeys` | `string` | Pre-normalised space-delimited lowercase alphanumeric search keys (`'tauceti hd10700 hip8102 gl71 gj71 gliese71'`). Substring-deduplicated at build time. |
| `w` | `workOrCanonId` | `string` | Optional canon/layer slug when `k === 7` or matched via a fictional universe layer (`'canon-star-trek'`, `'canon-project-hail-mary'`). |
| `c` | `subtitle` | `string` | Disambiguation label (`'G8V · 7 Planets'`, `'Star Trek Canon'`). |

---

## 8. Dataset Layering Format (`overlays/layers/*.json` for `FS-001` & `FS-002`)

### 8.1 Layer Manifest (`DatasetLayerManifest` / `CompactLayerManifest`)
| Key | Full Name | Type | Description |
| :---: | :--- | :--- | :--- |
| `i` | `layerId` | `string` | Unique layer slug (`'canon-star-trek'`, `'custom-user-default'`). |
| `n` | `title` | `string` | Human-readable layer title. |
| `k` | `kind` | `number` | `1 = fictional-canon`, `2 = custom-user`, `3 = scientific-overlay`. |
| `d` | `description` | `string` | Layer description. |
| `v` | `version` | `number` | Schema version (`1`). |
| `b` | `source` | `CompactLayerSourceMeta` | Optional bibliographic metadata block (`s` = summary, `a` = creator/author, `y` = publicationYear, `m` = medium, `r` = canonicalReference, `u` = authoritative URL). |
| `e` | `entries` | `Record<targetId, CompactLayerEntry>` | Keyed dictionary of flattened node annotations. |

### 8.2 Flattened Layer Entry (`CompactLayerEntry` in `e[targetId]`)
| Key | Full Name | Type | Description |
| :---: | :--- | :--- | :--- |
| `k` | `targetType` | `number` | `1 = system` (omitted), `2 = planet`, `3 = moon`, `4 = structure`, `5 = minor-body`, `6 = fictional-body`. |
| `s` | `systemId` | `string` | Real host star system ID (omitted when `systemId === targetId`; required when `k !== 1` so Galactic View highlights the host star system). |
| `u` | `inUniverseName` | `string` | In-universe or custom label (`'Vulcan (NiVar)'`, `'Adrian'`, `'Reach (Epsilon Eridani II)'`). |
| `x` | `text` | `string` | Flattened lore or user note text for this entity. |
| `w` | `workTitle` | `string` | Optional specific installment/book title. |
| `a` | `aliases` | `string[]` | Additional search terms contributed by this entry. |
| `g` | `tags` | `string[]` | Short thematic tags (`['Reach', 'UNSC']`). |
| `c` | `confidence` | `2 \| 3 \| 4` | Mapping confidence tier (`1 = confirmed` omitted; `2 = candidate`, `3 = theoretical`, `4 = unverified`). |

