import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatasetLayerEntry } from '../src/types/astro';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';
import { splitAliases, toUrlSlug } from '../src/utils/datasetLayerCodec';
import { LAYER_MANIFESTS } from '../content/layers';
import { findFocusedEntryInCorpus } from '../src/services/searchService';
import { parseCsvRecordsSync } from './pipeline/csvParser';

export interface RecentDiscoveryItem {
  readonly pl_name: string;
  readonly hostname: string;
  readonly sy_dist?: number;
  readonly disc_year?: number;
  readonly discoverymethod?: string;
  readonly pl_orbper?: number;
  readonly pl_orbsmax?: number;
  readonly pl_bmasse?: number;
  readonly pl_rade?: number;
  readonly pl_eqt?: number;
  readonly pl_insol?: number;
  readonly systemId?: string;
}

export interface DiscoveryAuditResult {
  readonly totalDiscoveries: number;
  readonly alreadyCurated: readonly RecentDiscoveryItem[];
  readonly candidatesToCurate: readonly RecentDiscoveryItem[];
  readonly missingHostStars: readonly RecentDiscoveryItem[];
}

export interface TapQueryOptions {
  readonly maxDistancePc?: number;
  readonly minDiscoveryYear?: number;
}

/**
 * Builds the NASA Exoplanet Archive TAP sync query URL for recent confirmed exoplanet
 * discoveries within a given distance threshold (default: <= 100 pc, >= 2024).
 */
export function buildTapRecentDiscoveriesQuery(options?: TapQueryOptions): string {
  const maxDist = options?.maxDistancePc ?? 100;
  const minYear = options?.minDiscoveryYear ?? 2024;
  const fields = 'pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_bmasse,pl_rade,pl_eqt,pl_insol,sy_dist';
  return `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+${fields}+from+pscomppars+where+sy_dist<=${maxDist}+and+disc_year>=${minYear}&format=csv`;
}

/**
 * Pure audit helper cross-matching raw discoveries from the NASA archive against
 * Starmap's catalog search corpus and existing scientific layer entries.
 */
export function auditRecentDiscoveriesAgainstCatalog(
  discoveries: readonly RecentDiscoveryItem[],
  corpus: readonly CompactSearchEntry[],
  existingLayerEntries: Record<string, DatasetLayerEntry> = {},
): DiscoveryAuditResult {
  const alreadyCurated: RecentDiscoveryItem[] = [];
  const candidatesToCurate: RecentDiscoveryItem[] = [];
  const missingHostStars: RecentDiscoveryItem[] = [];

  const layerEntriesList = Object.values(existingLayerEntries);

  for (const discovery of discoveries) {
    const plSlug = toUrlSlug(discovery.pl_name);

    // Check if already curated in overlay-recent-discoveries
    const isCurated = layerEntriesList.some((entry) => {
      const targetSlug = toUrlSlug(entry.targetId);
      const nameSlug = entry.inUniverseName ? toUrlSlug(entry.inUniverseName) : '';
      const aliasSlugs = splitAliases(entry.aliases).map(toUrlSlug);
      return targetSlug === plSlug || nameSlug === plSlug || aliasSlugs.includes(plSlug);
    });

    if (isCurated) {
      alreadyCurated.push(discovery);
      continue;
    }

    const hostEntry = findFocusedEntryInCorpus(discovery.hostname, corpus);
    if (hostEntry) {
      candidatesToCurate.push({ ...discovery, systemId: hostEntry.i });
    } else {
      missingHostStars.push(discovery);
    }
  }

  return {
    totalDiscoveries: discoveries.length,
    alreadyCurated,
    candidatesToCurate,
    missingHostStars,
  };
}

/**
 * Pure helper generating a markdown sync report for logging or Pull Request descriptions.
 */
export function formatDiscoverySyncReport(audit: DiscoveryAuditResult): string {
  const lines: string[] = [
    '### Recent Exoplanet Discoveries (< 100 pc) Sync Audit',
    '',
    `- **Total Inspected:** ${audit.totalDiscoveries}`,
    `- **Already in Layer:** ${audit.alreadyCurated.length}`,
    `- **Ready to Curate:** ${audit.candidatesToCurate.length}`,
    `- **Host Missing in Catalog:** ${audit.missingHostStars.length}`,
    '',
  ];

  if (audit.candidatesToCurate.length > 0) {
    lines.push('#### Ready to Curate (Host Matched in Catalog)');
    lines.push('| Planet | Host | System ID | Distance (pc) | Year | Method |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const c of audit.candidatesToCurate) {
      lines.push(`| ${c.pl_name} | ${c.hostname} | \`${c.systemId}\` | ${c.sy_dist ?? 'N/A'} | ${c.disc_year ?? 'N/A'} | ${c.discoverymethod ?? 'N/A'} |`);
    }
    lines.push('');
  }

  if (audit.missingHostStars.length > 0) {
    lines.push('#### Host Missing in Catalog (Requires Ingestion in fetch-sources.ts)');
    lines.push('| Planet | Host | Distance (pc) | Year |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const m of audit.missingHostStars) {
      lines.push(`| ${m.pl_name} | ${m.hostname} | ${m.sy_dist ?? 'N/A'} | ${m.disc_year ?? 'N/A'} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parses raw NASA Exoplanet Archive TAP query CSV output into structured discovery items.
 * Uses robust RFC-4180 parsing so fields with embedded commas (e.g. multi-method discovery)
 * are never corrupted.
 */
export function parseTapDiscoveriesCsv(
  csvText: string,
  filterRecentLocal = false,
): RecentDiscoveryItem[] {
  const records = parseCsvRecordsSync(csvText);
  const discoveries: RecentDiscoveryItem[] = [];

  for (const record of records) {
    const pl_name = record.pl_name?.trim() ?? '';
    const hostname = record.hostname?.trim() ?? '';
    const sy_dist = record.sy_dist ? Number.parseFloat(record.sy_dist) : undefined;
    const disc_year = record.disc_year ? Number.parseInt(record.disc_year, 10) : undefined;
    const discoverymethod = record.discoverymethod?.trim() || undefined;

    if (!pl_name || !hostname) continue;

    if (filterRecentLocal) {
      if ((sy_dist !== undefined && sy_dist > 100) || (disc_year !== undefined && disc_year < 2024)) {
        continue;
      }
    }

    discoveries.push({ pl_name, hostname, sy_dist, disc_year, discoverymethod });
  }

  return discoveries;
}

export interface DiscoverySyncOptions {
  readonly isOffline?: boolean;
  readonly isDryRun?: boolean;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Runs discovery synchronization against local cache or online NASA TAP API.
 */
export async function runDiscoverySync(
  options?: DiscoverySyncOptions,
): Promise<{ audit: DiscoveryAuditResult; report: string }> {
  const isOffline = options?.isOffline ?? false;
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const maxRetries = options?.maxRetries ?? 3;
  const retryDelayMs = options?.retryDelayMs ?? 500;
  const fetchFn = options?.fetchImpl ?? fetch;

  const recentLayer = LAYER_MANIFESTS.find(
    (l) => l.layerId === 'overlay-recent-discoveries',
  );

  let corpus: CompactSearchEntry[] = [];
  const starsPath = path.resolve(process.cwd(), 'public/data/search/stars.json');
  if (fs.existsSync(starsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(starsPath, 'utf8'));
      corpus = Array.isArray(data) ? data : data.entries ?? [];
    } catch {
      corpus = [];
    }
  }

  let discoveries: RecentDiscoveryItem[] = [];

  if (isOffline) {
    const rawCsvPath = path.resolve(
      process.cwd(),
      'data/raw/nasa_exoplanet_archive.csv',
    );
    if (fs.existsSync(rawCsvPath)) {
      const content = fs.readFileSync(rawCsvPath, 'utf8');
      discoveries = parseTapDiscoveriesCsv(content, true);
    }
  } else {
    const queryUrl = buildTapRecentDiscoveriesQuery();
    let lastError: Error | null = null;
    let success = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchFn(queryUrl, {
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            'User-Agent': 'StarmapDataPipeline/2.0 (https://github.com/marcel/starmap)',
          },
        });

        if (!response.ok) {
          throw new Error(
            `HTTP fetch failed [${response.status} ${response.statusText}] for ${queryUrl}`,
          );
        }

        const text = await response.text();
        discoveries = parseTapDiscoveriesCsv(text, false);
        success = true;
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          const delay = retryDelayMs * (2 ** attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!success) {
      throw lastError ?? new Error(`Discovery fetch failed for ${queryUrl}`);
    }
  }

  const audit = auditRecentDiscoveriesAgainstCatalog(
    discoveries,
    corpus,
    recentLayer?.entries ?? {},
  );

  const report = formatDiscoverySyncReport(audit);
  return { audit, report };
}

/**
 * CLI Runner supporting --offline and --dry-run flags.
 */
export async function runDiscoverySyncCli(): Promise<void> {
  const args = process.argv.slice(2);
  const isOffline = args.includes('--offline');
  const isDryRun = args.includes('--dry-run');

  try {
    const { audit, report } = await runDiscoverySync({ isOffline, isDryRun });
    process.stdout.write(`${report}\n`);

    if (!isDryRun && audit.candidatesToCurate.length > 0) {
      process.stdout.write(
        `Detected ${audit.candidatesToCurate.length} candidate discoveries ready for curation.\n`,
      );
    }
  } catch (err: unknown) {
    console.error('Discovery sync failed:', err);
    process.exit(1);
  }
}

// Auto-run when executed directly via CLI
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  void runDiscoverySyncCli();
}
