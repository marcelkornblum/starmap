# Implementation Plan: Data Pipeline

## Phase 1: Ingestion & Streaming [checkpoint: 945f798]
- [x] Task: Install `csv-parser` or similar Node.js streaming CSV library. [fccc7db]
- [x] Task: Create `scripts/build-data.ts`. [945f798]
- [x] Task: Implement the file read stream to pipe `data/hygdata_v3.csv` through the CSV parser without blowing up memory. [945f798]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [945f798]

## Phase 2: Harmonization & Math Integration [checkpoint: 945f798]
- [x] Task: Import `equatorialToCartesian` from the math track. [945f798]
- [x] Task: Implement a transform stream step that maps the raw CSV row to the strict `StarmapNode` interface. [945f798]
- [x] Task: Calculate the base `[x, y, z]` for each star during the transform step. [945f798]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [945f798]

## Phase 3: Static Generation & Scripts
- [ ] Task: Implement a write stream to output the finalized JSON array to `public/data/stars.json`.
- [ ] Task: Ensure the output is minified to save bandwidth.
- [ ] Task: Add `"build:data": "tsx scripts/build-data.ts"` to `package.json`.
- [ ] Task: Update the CI GitHub Action (`.github/workflows/ci.yml`) to run `npm run build:data` before building the site, if necessary, or check the generated JSON into source control.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
