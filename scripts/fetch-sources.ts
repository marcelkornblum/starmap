import fs from 'node:fs';
import path from 'node:path';
import { DATA_SOURCES_REGISTRY } from './sources.config';
import { writeBuildEpochIso } from './pipeline/seedCatalogs';

export {
  OFFICIAL_IAU_STAR_NAMES,
  RECONS_10PC_SUPPLEMENT,
  IAU_NAME_EXOWORLDS,
  AAVSO_VARIABLE_CATALOG,
  FULL_GALACTIC_STRUCTURES,
  FULL_SOLAR_SYSTEM_BODIES,
  CIRCUMSTELLAR_DISKS_CATALOG,
} from './pipeline/seedCatalogs';

export interface DownloadFileOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}

export interface FetchSummary {
  sourceId: string;
  name: string;
  status: 'cached' | 'downloaded' | 'initialized' | 'error';
  localPath: string;
  bytes: number;
  message?: string;
}

export interface FetchAllOptions extends DownloadFileOptions {
  refreshEpoch?: boolean;
  epochFilePath?: string;
}

function resolveSeedPathForSource(sourceId: string): string {
  if (sourceId.includes('galactic')) {
    return path.resolve('data/seed/galactic-structures.json');
  }
  if (sourceId.includes('solar-system')) {
    return path.resolve('data/seed/solar-system-bodies.json');
  }
  if (sourceId === 'stellar-iau-wgsn') {
    return path.resolve('data/seed/iau-star-names.json');
  }
  if (sourceId === 'stellar-recons-10pc') {
    return path.resolve('data/seed/recons-10pc.json');
  }
  if (sourceId === 'exoplanet-iau-name-exoworlds') {
    return path.resolve('data/seed/name-exoworlds.json');
  }
  if (sourceId === 'stellar-aavso-vsx') {
    return path.resolve('data/seed/aavso-variables.json');
  }
  return path.resolve(`data/seed/${sourceId}.json`);
}

/**
 * Downloads a remote file to a local destination with timeout and exponential backoff retry.
 */
export async function downloadFile(
  url: string,
  destPath: string,
  options?: DownloadFileOptions,
): Promise<number> {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const maxRetries = options?.maxRetries ?? 3;
  const retryDelayMs = options?.retryDelayMs ?? 500;
  const fetchFn = options?.fetchImpl ?? fetch;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'User-Agent': 'StarmapDataPipeline/2.0 (https://github.com/marcel/starmap)',
        },
      });

      if (!response.ok) {
        throw new Error(
          `HTTP fetch failed [${response.status} ${response.statusText}] for ${url}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(destPath, buffer);
      return buffer.length;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = retryDelayMs * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error(`Failed to download ${url}`);
}

/**
 * Checks whether any fetch summary encountered an error.
 */
export function hasFetchFailures(summaries: readonly FetchSummary[]): boolean {
  return summaries.some((s) => s.status === 'error');
}

/**
 * Executes automated acquisition across all declarative sources.
 */
export async function fetchAllDataSources(
  force = false,
  options?: FetchAllOptions,
): Promise<FetchSummary[]> {
  if (options?.refreshEpoch) {
    writeBuildEpochIso(undefined, options.epochFilePath);
  }

  const summaries: FetchSummary[] = [];

  for (const source of DATA_SOURCES_REGISTRY.sources) {
    if (!source.enabled) {
      continue;
    }

    if (source.format === 'declarative-seed') {
      const seedPath = resolveSeedPathForSource(source.id);
      if (fs.existsSync(seedPath)) {
        const stats = fs.statSync(seedPath);
        if (stats.size > 0) {
          summaries.push({
            sourceId: source.id,
            name: source.name,
            status: force ? 'initialized' : 'cached',
            localPath: seedPath,
            bytes: stats.size,
            message: 'Verified declarative seed dataset.',
          });
          continue;
        }
      }

      summaries.push({
        sourceId: source.id,
        name: source.name,
        status: 'error',
        localPath: seedPath,
        bytes: 0,
        message: `Declarative seed missing or empty: ${seedPath}`,
      });
      continue;
    }

    const resolvedLocal = path.resolve(source.localCachePath);
    const exists = fs.existsSync(resolvedLocal);

    if (exists && !force) {
      const stats = fs.statSync(resolvedLocal);
      if (stats.size > 0) {
        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'cached',
          localPath: resolvedLocal,
          bytes: stats.size,
          message: 'Local cache valid, skipping download.',
        });
        continue;
      }
    }

    if (source.remoteUrl) {
      try {
        console.log(`Fetching ${source.name} from ${source.remoteUrl}...`);
        const bytes = await downloadFile(source.remoteUrl, resolvedLocal, options);

        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'downloaded',
          localPath: resolvedLocal,
          bytes,
          message: `Successfully downloaded ${(bytes / 1024 / 1024).toFixed(2)} MB.`,
        });
      } catch (err: unknown) {
        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'error',
          localPath: resolvedLocal,
          bytes: 0,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return summaries;
}

// CLI entrypoint
const isDirectExecution =
  process.argv[1]?.endsWith('fetch-sources.ts') ||
  process.argv[1]?.endsWith('fetch-sources');

if (isDirectExecution) {
  const force = process.argv.includes('--force');
  const refreshEpoch = process.argv.includes('--refresh-epoch');
  console.log(`Starting Data Source Acquisition (force=${force}, refreshEpoch=${refreshEpoch})...`);
  const startTime = Date.now();

  fetchAllDataSources(force, { refreshEpoch })
    .then((results) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\nAcquisition completed in ${elapsed}s:`);
      for (const res of results) {
        const mb = (res.bytes / 1024 / 1024).toFixed(2);
        console.log(`  [${res.status.toUpperCase()}] ${res.name} (${mb} MB) -> ${res.localPath}`);
      }
      if (hasFetchFailures(results)) {
        const failures = results.filter((s) => s.status === 'error');
        console.error(`\nFailed to acquire ${failures.length} data source(s):`);
        for (const f of failures) {
          console.error(`  - ${f.name} (${f.sourceId}): ${f.message}`);
        }
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Acquisition failed:', err);
      process.exit(1);
    });
}
