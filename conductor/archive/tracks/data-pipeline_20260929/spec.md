# Specification: Data Pipeline

## Overview
This track builds the offline data engineering pipeline. It is responsible for ingesting raw astronomical datasets (like `hygdata_v3.csv`), cleaning the data, applying our mathematical coordinate transformations, and outputting highly optimized, static JSON chunks. This ensures the Vite SPA frontend remains blazing fast by only doing simple data fetching at runtime.

## Functional Requirements
1. **Data Ingestion:** Create a Node.js build script capable of reading raw astronomical datasets (CSV/JSON).
2. **Data Harmonization:** Map the raw data into our unified `StarmapNode` schema, discarding unnecessary columns to save bandwidth.
3. **Pre-calculation:** Utilize the utilities from the `astro-math-core` track to pre-calculate Cartesian `[x, y, z]` coordinates based on the default Equatorial plane.
4. **Static Generation:** Output the processed data into logical JSON files (e.g., `public/data/stars-base.json`) so they can be statically hosted on GitHub Pages.

## Non-Functional Requirements
- **Build-Time Only:** This pipeline runs strictly offline. The parsing libraries (like `csv-parser`) must not leak into the React frontend bundle.
- **Memory Efficiency:** Use Node.js streams to process the dataset sequentially to avoid running out of memory.

## Acceptance Criteria
- [ ] A dedicated `scripts/build-data.ts` pipeline script is created.
- [ ] The pipeline successfully ingests `data/hygdata_v3.csv` and outputs a minified `public/data/stars.json`.
- [ ] The output JSON strictly conforms to the `StarmapNode` interface.
- [ ] A command (`npm run build:data`) is added to `package.json` to execute the pipeline.
- [ ] The workflow successfully handles or skips edge cases (e.g., stars missing distance coordinates).

## Out of Scope
- Frontend UI or 3D rendering.
- Real-time API fetching (everything must be baked into static JSON).
