# Specification: Spatial Data Runtime & Sector Streaming

## 1. Overview & Motivation
This track delivers the production client-side spatial data streaming, memory management, and binary buffer ingestion pipeline for Starmap. While the offline build pipeline (`scripts/build-data.ts`) partitions over 302,800 stars into 424 spatial sectors (`public/data/partitions/sector_*.json`), the runtime client currently renders a static list of 35 fixture stars mounted as heavy React DOM/WebGL components.

This track establishes:
1. **Build-Time 16-Byte Binary Packing:** Emitting compact `public/data/partitions/sector_*.bin` buffers (`[x, y, z, id]`) for direct GPU ingestion.
2. **Scope 1 (Macro Points) Streaming:** View-frustum and distance-gated asynchronous streaming with 1-ring active GPU loading (27 sectors) and 2-ring eager prefetch hysteresis (125 sectors).
3. **Hardware-Driven Device Performance Tiering:** Runtime tiering based on `navigator.deviceMemory`, `hardwareConcurrency`, and WebGL limits, governing active point budgets (Tier 1: 50k–100k, Tier 2: 150k–250k, Tier 3: 300k+ uncapped).
4. **Memory-Governed Zoom Clamping:** Dynamically clamping maximum camera distance ($d_{\text{cam}}$) when the required spatial volume exceeds the active device tier's memory budget.
5. **Scope 2 (Instrument Sphere) Hydration Bridge:** Querying stars within $R_{\text{aperture}} + \Delta R$ to hydrate rich metadata on demand from 36-bucket ID summary shards (`public/data/summaries/<0..z>.json`).

---

## 2. Functional Requirements

### 2.1 Build-Time Binary Sector Generation (`scripts/build-data.ts`)
- Emit `public/data/partitions/sector_*.bin` alongside existing JSON files during `npm run build:data`.
- **Header (24 bytes):**
  - `0x00`: Uint32 Magic (`0x52415453` = `'STAR'`)
  - `0x04`: Uint32 Star Count ($N$)
  - `0x08`: Float32 Sector Origin X (parsecs)
  - `0x0C`: Float32 Sector Origin Y (parsecs)
  - `0x10`: Float32 Sector Origin Z (parsecs)
  - `0x14`: Float32 Sector Size (25.0 pc)
- **Body ($16 \times N$ bytes, 16-byte power-of-two aligned stride):**
  - `0x00`: Float32 Position X (parsecs)
  - `0x04`: Float32 Position Y (parsecs)
  - `0x08`: Float32 Position Z (parsecs)
  - `0x0C`: Uint32 Catalog / System ID

### 2.2 Device Performance Tiering Service (`deviceTierService.ts`)
- Detect client hardware tier using a composite heuristic:
  - `navigator.deviceMemory` (W3C quantized values: `0.25`, `0.5`, `1`, `2`, `4`, `8`).
  - `navigator.hardwareConcurrency` (CPU cores fallback for Safari/Firefox).
  - WebGL context capabilities (`MAX_VERTEX_ATTRIBS`, buffer limits).
- Assign tiered runtime constraints:
  - **Tier 1 (Mobile / Low-End):** 50k–100k point budget, 12 active sectors, aggressive LRU cache (16 sectors max).
  - **Tier 2 (Mid-Range):** 150k–250k point budget, 27 active sectors (3x3x3 grid), balanced LRU cache (40 sectors max).
  - **Tier 3 (High-End Desktop):** 300k+ uncapped point budget (all 302k stars), up to 64 active sectors or full catalog pre-load, generous LRU cache (80 sectors max).

### 2.3 Sector Streaming & Memory Management Service (`sectorStreamingService.ts`)
- Deterministic spatial mapping from camera coordinates $[x, y, z]$ to sector coordinates $[S_x, S_y, S_z] = \lfloor \mathbf{p} / 25 \rfloor$.
- **Active Ring (27 sectors):** Streamed and uploaded into GPU buffer attributes.
- **Prefetch Hysteresis Ring (outer 2-ring, 125 total sectors):** Eagerly fetched via HTTP (`priority: 'low'`) and decoded into memory cache before camera crosses boundaries.
- **LRU Cache & WebGL Buffer Disposal:** Enforce device tier capacity limits. Cleanly call `geometry.dispose()` on evicted sectors to prevent GPU memory leaks.
- **Staggered GPU Ingestion:** Rate-limit GPU buffer uploads to maximum 2 sectors per frame to avoid render loop jank.

### 2.4 Memory-Governed Zoom Clamping
- Compute spatial volume ($V \propto d_{\text{cam}}^3$) and required sector allocation as the camera dollys out.
- Clamp maximum camera distance ($d_{\text{max}}$) when required memory exceeds the active device tier's budget.

### 2.5 Scope 2 Instrument Hydration Bridge
- Query star positions within $R_{\text{aperture}} + \Delta R$ ($2\text{ pc}$ lead buffer) of the camera focus point.
- Extract `id` from the 16-byte record and hydrate rich metadata $O(1)$ from `public/data/summaries/<0..z>.json` via existing `detailsRepository`.
- Evict metadata from the active store when stars exit the instrument perimeter.

---

## 3. Non-Functional Requirements
- **Performance:** Maintain a rock-solid 60fps during camera translation and zooming across sector boundaries.
- **Memory Overhead:** Total V8 heap memory for sector streaming structures must not exceed 5 MB on Tier 1 devices.
- **Zero Memory Leaks:** WebGL geometries and ArrayBuffers must be completely freed when sectors drop out of the LRU cache.

---

## 4. Acceptance Criteria
- [ ] `scripts/build-data.ts` emits valid `public/data/partitions/sector_*.bin` matching the 16-byte aligned specification.
- [ ] Unit tests verify round-trip binary encoding/decoding of positions and IDs.
- [ ] `deviceTierService` correctly identifies device tiers with Safari/Firefox fallback handling.
- [ ] `sectorStreamingService` streams 27 active sectors and prefetches 2-ring neighbours without frame hitching.
- [ ] Zoom distance is dynamically clamped according to device tier memory budgets.
- [ ] Evicted sectors dispose of WebGL buffer resources with zero memory leaks.
- [ ] Instrument sphere queries successfully extract IDs and hydrate summary metadata on demand.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:coverage` pass cleanly.
