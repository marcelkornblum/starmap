import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import {
  resolveEntryCategory,
  resolveResultDisplayTitle,
} from '../search/searchCorpusHelpers';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';

export interface StarSystemEntry {
  readonly id: string;
  readonly name: string;
  readonly coordinatesPc: readonly [number, number, number];
  readonly entry: CompactSearchEntry;
}

const corpusStarSystemsCache = new WeakMap<
  readonly CompactSearchEntry[],
  {
    systemsById: Map<string, StarSystemEntry>;
    stars: ReadonlyArray<{ sysSlug: string; entry: CompactSearchEntry; pos: [number, number, number] }>;
  }
>();

export function getOrBuildCorpusStarSystems(corpus: readonly CompactSearchEntry[]): {
  systemsById: Map<string, StarSystemEntry>;
  stars: ReadonlyArray<{ sysSlug: string; entry: CompactSearchEntry; pos: [number, number, number] }>;
} {
  let cached = corpusStarSystemsCache.get(corpus);
  if (!cached) {
    const systemsById = new Map<string, StarSystemEntry>();
    const stars: Array<{ sysSlug: string; entry: CompactSearchEntry; pos: [number, number, number] }> = [];

    for (const entry of corpus) {
      if (entry.c !== 'stars' && resolveEntryCategory(entry) !== 'stars') {
        continue;
      }
      const sysSlug = toUrlSlug(entry.s ?? entry.i ?? entry.n);
      if (!sysSlug || systemsById.has(sysSlug)) {
        continue;
      }
      const pos: [number, number, number] = entry.p
        ? [entry.p[0], entry.p[1], entry.p[2]]
        : [0, 0, 0];
      systemsById.set(sysSlug, {
        id: entry.s ?? entry.i,
        name: resolveResultDisplayTitle(entry),
        coordinatesPc: pos,
        entry,
      });
      stars.push({ sysSlug, entry, pos });
    }

    cached = { systemsById, stars };
    corpusStarSystemsCache.set(corpus, cached);
  }
  return cached;
}
