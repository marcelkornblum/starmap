# Implementation Plan: Spatial Data Runtime & Sector Streaming

## Execution Model: Frontier Architecture & Flash Subagent Delegation

Following the operational standards defined in `.agents/AGENTS.md`:
- **Frontier Orchestrator (Main Agent):** Owns binary memory layout contracts, endianness specifications, async state machine designs (preventing race conditions in fetch/eviction cycles), Conductor phase gates, and phase review reports.
- **Flash Subagents (`Model: "flash"`):** Spawned for bounded operational tasks:
  - `tdd-worker`: Red/Green/Refactor unit test suites, codec implementation, build script integration, and service logic.
  - `qa-verifier`: Parallel quality verification commands (`npm run lint`, `npm run typecheck`, `npm run test:coverage`, and memory leak audits).

---

## Phase 1: Build-Time Binary Packing Pipeline
- [x] Task (Frontier): Define the strict binary schema contract (24-byte header, 16-byte `[x, y, z, id]` little-endian stride) and FNV-1a ID hashing interface.
- [x] Task (Flash `tdd-worker`): Create `src/utils/binarySectorCodec.ts` with encode/decode utilities for 24-byte headers and 16-byte records.
- [x] Task (Flash `tdd-worker`): Add comprehensive unit tests in `src/utils/__tests__/binarySectorCodec.test.ts` verifying round-trip binary precision, byte alignment, and endianness safety.
- [x] Task (Flash `tdd-worker`): Extend `scripts/build-data.ts` to serialize sector partitions into binary files (`public/data/partitions/sector_*.bin`).
- [x] Task (Flash `qa-verifier`): Run test suite and verify binary file generation across all 424 sectors.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Hardware Tiering Engine & Memory Budgeting
- [x] Task (Frontier): Formulate the tier classification rules and memory budget matrix (Tier 1: 50k–100k, Tier 2: 150k–250k, Tier 3: 300k+ uncapped).
- [x] Task (Flash `tdd-worker`): Implement `src/services/deviceTierService.ts` to probe `deviceMemory`, `hardwareConcurrency`, and WebGL parameters with Safari/Firefox fallback handling.
- [x] Task (Flash `tdd-worker`): Implement memory-driven zoom clamping utility calculating max safe camera distance ($d_{\text{max}}$) per device tier.
- [x] Task (Flash `tdd-worker`): Add unit tests for device tier classification and zoom clamping calculations.
- [x] Task (Flash `qa-verifier`): Execute quality checks (`lint`, `typecheck`, `test:coverage`).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Sector Streaming Service, Ring Hysteresis & LRU Cache
- [x] Task (Frontier): Architect the async streaming state machine (preventing stale fetch race conditions, bounding memory, and defining geometry buffer pooling).
- [x] Task (Flash `tdd-worker`): Implement `src/services/sectorStreamingService.ts` managing sector coordinate resolution $[S_x, S_y, S_z]$, active 27-sector loading, and 2-ring eager prefetching.
- [x] Task (Flash `tdd-worker`): Implement LRU sector cache with tier-specific capacity limits and clean `BufferGeometry.dispose()` / memory freeing on eviction.
- [x] Task (Flash `tdd-worker`): Implement staggered GPU buffer upload queue (max 2 uploads per frame) to prevent render hitching.
- [x] Task (Flash `tdd-worker`): Add unit and integration tests for sector resolution, cache eviction, prefetch queueing, and memory reclamation.
- [x] Task (Flash `qa-verifier`): Execute quality checks and verify zero memory leaks in cache recycling.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Scope 2 Instrument Hydration Bridge
- [x] Task (Frontier): Define the interface bridging 16-byte raw point records to `detailsRepository` and `<BodiesPanel scope="galaxy" />`.
- [x] Task (Flash `tdd-worker`): Implement spatial proximity query utility extracting star IDs within $R_{\text{aperture}} + \Delta R$ ($2\text{ pc}$ lead buffer) of camera focus point.
- [x] Task (Flash `tdd-worker`): Wire spatial query to `detailsRepository.fetchSummaryNode` to hydrate rich metadata on demand.
- [x] Task (Flash `tdd-worker`): Implement transient metadata eviction when systems exit the instrument perimeter.
- [x] Task (Flash `tdd-worker`): Add unit tests verifying ID extraction, on-demand hydration triggering, and clean eviction.
- [x] Task (Flash `qa-verifier`): Execute quality checks.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Verification, Benchmarking & Review
- [x] Task (Flash `qa-verifier`): Execute full quality suite: `npm run lint`, `npm run typecheck`, and `npm run test:coverage`.
- [x] Task (Flash `qa-verifier`): Conduct a simulated memory audit ensuring zero GPU buffer leaks under continuous camera translation across 100 sectors.
- [x] Task (Frontier): Review implementation against `spec.md`, capture review links, run code review skill, and prepare Pull Request.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
