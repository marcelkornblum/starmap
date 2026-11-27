import type { DatasetLayerIndexEntry } from '../../../types/datasetLayers';
import { buildLayerGalaxyHref } from '../../../services/search/searchUrls';
import { toCanonicalLayerSlug } from '../../../utils/datasetLayerSlugs';

export interface GroupedDiscoverLayers {
  readonly scientific: readonly DatasetLayerIndexEntry[];
  readonly canon: readonly DatasetLayerIndexEntry[];
  readonly custom: readonly DatasetLayerIndexEntry[];
}

export function buildDiscoverLayerHref(layerId: string): {
  readonly slug: string;
  readonly href: string;
} {
  const slug = toCanonicalLayerSlug(layerId);
  return {
    slug,
    href: buildLayerGalaxyHref(layerId),
  };
}

export function isDiscoverLayerActive(
  activeLayerSlug: string | null | undefined,
  entryLayerId: string,
  canonicalSlug: string,
): boolean {
  if (!activeLayerSlug) {
    return false;
  }
  return (
    activeLayerSlug === entryLayerId ||
    toCanonicalLayerSlug(activeLayerSlug) === canonicalSlug
  );
}

export function matchesDiscoverQuery(
  entry: DatasetLayerIndexEntry,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) {
    return true;
  }
  const titleMatch = entry.title.toLowerCase().includes(normalizedQuery);
  const descriptionMatch = entry.description.toLowerCase().includes(normalizedQuery);
  const creatorMatch =
    entry.source?.creator?.toLowerCase().includes(normalizedQuery) ?? false;
  return titleMatch || descriptionMatch || creatorMatch;
}

export function filterAndGroupDiscoverLayers(
  layers: readonly DatasetLayerIndexEntry[],
  query: string,
): GroupedDiscoverLayers {
  const normalizedQuery = query.trim().toLowerCase();
  const scientific: DatasetLayerIndexEntry[] = [];
  const canon: DatasetLayerIndexEntry[] = [];
  const custom: DatasetLayerIndexEntry[] = [];

  for (const entry of layers) {
    if (!matchesDiscoverQuery(entry, normalizedQuery)) {
      continue;
    }
    if (entry.kind === 'scientific-overlay') {
      scientific.push(entry);
    } else if (entry.kind === 'fictional-canon') {
      canon.push(entry);
    } else if (entry.kind === 'custom-user') {
      custom.push(entry);
    }
  }

  return { scientific, canon, custom };
}
