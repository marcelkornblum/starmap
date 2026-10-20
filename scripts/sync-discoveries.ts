import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatasetLayerEntry } from '../src/types/astro';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';
import {
  SEED_FICTIONAL_CANON_LAYERS,
  toUrlSlug,
} from '../src/utils/datasetLayerCodec';
import { findFocusedEntryInCorpus } from '../src/services/searchService';

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
  const fields = [
    'pl_name',
    'hostname',
    'sy_snum',
    'sy_pnum',
    'discoverymethod',
    'disc_year',
    'pl_orbper',
    'pl_orbsmax',
    'pl_bmasse',
    'pl_rade',
    'pl_eqt',
    'pl_insol',
    'sy_dist',
  ].join(',');

  const query = `select+${fields}+from+pscomppars+where+sy_dist<=${maxDist}+and+disc_year>=${minYear}&format=csv`;
  return `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${query}`;
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
      const nameSlug = entry.inUniverseName
        ? toUrlSlug(entry.inUniverseName)
        : '';
      const aliasSlugs = entry.aliases ? entry.aliases.map(toUrlSlug) : [];
      return (
        targetSlug === plSlug ||
        nameSlug === plSlug ||
        aliasSlugs.includes(plSlug)
      );
    });

    if (isCurated) {
      alreadyCurated.push(discovery);
      continue;
    }

    // Cross-match host star against catalog corpus
    const hostEntry = findFocusedEntryInCorpus(discovery.hostname, corpus);
    if (hostEntry) {
      candidatesToCurate.push({
        ...discovery,
        systemId: hostEntry.i,
      });
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
      lines.push(
        `| ${c.pl_name} | ${c.hostname} | \`${c.systemId}\` | ${c.sy_dist ?? 'N/A'} | ${c.disc_year ?? 'N/A'} | ${c.discoverymethod ?? 'N/A'} |`,
      );
    }
    lines.push('');
  }

  if (audit.missingHostStars.length > 0) {
    lines.push('#### Host Missing in Catalog (Requires Ingestion in fetch-sources.ts)');
    lines.push('| Planet | Host | Distance (pc) | Year |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const m of audit.missingHostStars) {
      lines.push(
        `| ${m.pl_name} | ${m.hostname} | ${m.sy_dist ?? 'N/A'} | ${m.disc_year ?? 'N/A'} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * CLI Runner supporting --offline and --dry-run flags.
 */
export async function runDiscoverySyncCli(): Promise<void> {
  const args = process.argv.slice(2);
  const isOffline = args.includes('--offline');
  const isDryRun = args.includes('--dry-run');

  const recentLayer = SEED_FICTIONAL_CANON_LAYERS.find(
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
      const lines = content.split('\n');
      const headers = lines[0]?.split(',').map((h) => h.trim()) ?? [];
      const plIdx = headers.indexOf('pl_name');
      const hostIdx = headers.indexOf('hostname');
      const distIdx = headers.indexOf('sy_dist');
      const yearIdx = headers.indexOf('disc_year');
      const methodIdx = headers.indexOf('discoverymethod');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        const cols = line.split(',');
        const pl_name = cols[plIdx]?.trim() ?? '';
        const hostname = cols[hostIdx]?.trim() ?? '';
        const sy_dist = parseFloat(cols[distIdx] ?? '0');
        const disc_year = parseInt(cols[yearIdx] ?? '0', 10);
        const discoverymethod = cols[methodIdx]?.trim();
        if (pl_name && hostname && sy_dist <= 100 && disc_year >= 2024) {
          discoveries.push({
            pl_name,
            hostname,
            sy_dist,
            disc_year,
            discoverymethod,
          });
        }
      }
    }
  } else {
    try {
      const queryUrl = buildTapRecentDiscoveriesQuery();
      const response = await fetch(queryUrl);
      if (response.ok) {
        const text = await response.text();
        const lines = text.split('\n');
        const headers = lines[0]?.split(',').map((h) => h.trim()) ?? [];
        const plIdx = headers.indexOf('pl_name');
        const hostIdx = headers.indexOf('hostname');
        const distIdx = headers.indexOf('sy_dist');
        const yearIdx = headers.indexOf('disc_year');
        const methodIdx = headers.indexOf('discoverymethod');

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]?.trim();
          if (!line) continue;
          const cols = line.split(',');
          const pl_name = cols[plIdx]?.trim() ?? '';
          const hostname = cols[hostIdx]?.trim() ?? '';
          const sy_dist = parseFloat(cols[distIdx] ?? '0');
          const disc_year = parseInt(cols[yearIdx] ?? '0', 10);
          const discoverymethod = cols[methodIdx]?.trim();
          if (pl_name && hostname) {
            discoveries.push({
              pl_name,
              hostname,
              sy_dist,
              disc_year,
              discoverymethod,
            });
          }
        }
      }
    } catch {
      // In offline/CI sandboxes without internet, gracefully retain zero discoveries
      discoveries = [];
    }
  }

  const audit = auditRecentDiscoveriesAgainstCatalog(
    discoveries,
    corpus,
    recentLayer?.entries ?? {},
  );

  const report = formatDiscoverySyncReport(audit);
  process.stdout.write(`${report}\n`);

  if (!isDryRun && audit.candidatesToCurate.length > 0) {
    process.stdout.write(
      `Detected ${audit.candidatesToCurate.length} candidate discoveries ready for curation.\n`,
    );
  }
}

// Auto-run when executed directly via CLI
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  void runDiscoverySyncCli();
}
