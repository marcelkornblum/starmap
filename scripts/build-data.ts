export * from './pipeline/types';
export * from './pipeline/seedCatalogs';
export * from './pipeline/hygCrossMatch';
export * from './pipeline/exoplanets';
export * from './pipeline/solAndSummary';
export * from './pipeline/galacticStructures';
export * from './pipeline/solarBodies';
export * from './pipeline/systemNomenclature';
export * from './pipeline/multiStarConsolidation';
export * from './pipeline/gaiaArtifactWriter';
export * from './pipeline/gaiaPipeline';

import { buildStarDataPipeline } from './pipeline/gaiaPipeline';

// CLI entrypoint
const isDirectExecution = process.argv[1]?.endsWith('build-data.ts');
if (isDirectExecution) {
  const gcnsGz = process.env.GCNS_GZ || 'data/raw/gaia_dr3_gcns.dat.gz';
  const outputJson = process.env.OUTPUT_JSON || 'data/stars.json';
  const catalogsDir = process.env.CATALOGS_DIR || 'public/data/catalogs';
  const partitionsDir = process.env.PARTITIONS_DIR || 'public/data/partitions';
  const systemsDir = process.env.SYSTEMS_DIR || 'public/data/systems';
  const overlaysDir = process.env.OVERLAYS_DIR || 'public/data/overlays';
  const solDir = process.env.SOL_DIR || 'public/data/sol';
  const summariesDir = process.env.SUMMARIES_DIR || 'public/data/summaries';
  const detailsDir = process.env.DETAILS_DIR || 'public/data/details';
  const searchDir = process.env.SEARCH_DIR || 'public/data/search';

  console.log(`Starting Data Pipeline: Ingesting Gaia DR3 GCNS from ${gcnsGz}...`);
  const startTime = Date.now();

  buildStarDataPipeline(gcnsGz, outputJson, {
    catalogsDir,
    partitionsDir,
    systemsDir,
    overlaysDir,
    solDir,
    summariesDir,
    detailsDir,
    searchDir,
    maxPartitionDistancePc: 100,
    compactFormat: true,
  })
    .then((summary) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\nPipeline complete in ${elapsed}s:`);
      console.log(`  - Total Stars Processed: ${summary.totalStars}`);
      console.log(`  - 3D Kinematic Space Velocities: ${summary.totalKinematics} (100%)`);
      console.log(`  - Base Catalog Output: ${summary.outputPath}`);
      console.log(`  - Layer 1 (<= 10 pc Census): ${summary.local10pcCount} systems`);
      console.log(`  - Layer 1 (Naked-eye V <= 6.5): ${summary.referenceBrightCount} systems`);
      console.log(`  - Spatial 25 pc Sectors: ${summary.sectorPartitionCount} partitions`);
      console.log(`  - Layer 2 (Exoplanet Systems): ${summary.exoplanetSystemCount} systems (${summary.totalExoplanets} confirmed planets)`);
      console.log(`  - Layer 3 (Galactic Deep Sky): ${summary.galacticStructuresCount} structures`);
      console.log(`  - Layer 4 (Solar System Natural Bodies): ${summary.solarSystemBodiesCount} bodies`);
    })
    .catch((err) => {
      console.error('Data Pipeline failed:', err);
      process.exit(1);
    });
}
