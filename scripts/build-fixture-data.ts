import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGaiaDataPipeline } from './pipeline/gaiaPipeline';
import type { PipelineSummary } from './pipeline/types';

export interface BuildFixtureDataOptions {
  readonly dataDir?: string;
  readonly ifMissing?: boolean;
}

const FIXTURE_RAW_DIR = path.resolve(process.cwd(), 'tests/fixtures/pipeline-raw');

/**
 * Builds deterministic runtime shards under `dataDir` exclusively from committed
 * fixture slices in `tests/fixtures/pipeline-raw/` and `data/seed/`, without
 * emitting `data/stars.json` or reading gitignored `data/raw/` files.
 */
export async function buildFixtureData(
  options?: BuildFixtureDataOptions,
): Promise<PipelineSummary | null> {
  const dataDir = path.resolve(options?.dataDir ?? process.env.DATA_DIR ?? 'public/data');
  const manifestPath = path.join(dataDir, 'manifest.json');

  if (options?.ifMissing && fs.existsSync(manifestPath)) {
    console.log(`Fixture data already present at ${manifestPath}; skipping rebuild.`);
    return null;
  }

  return buildGaiaDataPipeline(
    path.join(FIXTURE_RAW_DIR, 'gaia_gcns_fixture.dat.gz'),
    '',
    {
      dataDir,
      partitionsDir: path.join(dataDir, 'partitions'),
      overlaysDir: path.join(dataDir, 'overlays'),
      summariesDir: path.join(dataDir, 'summaries'),
      detailsDir: path.join(dataDir, 'details'),
      searchDir: path.join(dataDir, 'search'),
      maxPartitionDistancePc: 100,
      compactFormat: true,
      writeStarsJson: false,
      hygCsvPath: path.join(FIXTURE_RAW_DIR, 'hyg_fixture.csv'),
      nasaCsvPath: path.join(FIXTURE_RAW_DIR, 'nasa_exo_fixture.csv'),
      oecCsvPath: path.join(FIXTURE_RAW_DIR, 'oec_fixture.csv'),
      euCsvPath: path.join(FIXTURE_RAW_DIR, 'eu_exo_fixture.csv'),
      mpcPhaPath: path.join(FIXTURE_RAW_DIR, 'mpc_pha_fixture.txt'),
      iauCsvPath: '',
      cantatGaudinPath: '',
      harrisGlobularsPath: '',
      atnfPulsarsPath: '',
      openNgcPath: '',
      mpcDistantPath: '',
      mpcCometsPath: '',
    },
  );
}

const isDirectExecution =
  Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]!);

if (isDirectExecution) {
  const argv = process.argv.slice(2);
  const ifMissing = argv.includes('--if-missing');
  const dirFlagIdx = argv.indexOf('--data-dir');
  const dataDir = dirFlagIdx >= 0 ? argv[dirFlagIdx + 1] : undefined;

  const startTime = Date.now();
  buildFixtureData({ dataDir, ifMissing })
    .then((summary) => {
      if (!summary) return;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Fixture pipeline complete in ${elapsed}s:`);
      console.log(`  - Stars Processed: ${summary.totalStars}`);
      console.log(`  - Sectors: ${summary.sectorPartitionCount}`);
      console.log(`  - Exoplanets: ${summary.totalExoplanets} across ${summary.exoplanetSystemCount} systems`);
      console.log(`  - Structures: ${summary.galacticStructuresCount}`);
      console.log(`  - Solar System Bodies: ${summary.solarSystemBodiesCount}`);
    })
    .catch((err) => {
      console.error('Fixture Data Pipeline failed:', err);
      process.exit(1);
    });
}
