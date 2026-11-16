import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type { SystemSummaryNode } from '../../types/astro';

export interface MergedCorpusParts {
  readonly base: readonly CompactSearchEntry[];
  readonly extras: readonly CompactSearchEntry[];
}

const corpusKnownIdsCache = new WeakMap<readonly CompactSearchEntry[], ReadonlySet<string>>();
const mergedCorpusPartsMap = new WeakMap<readonly CompactSearchEntry[], MergedCorpusParts>();

interface MergedCorpusCacheEntry {
  readonly activeStars: readonly SystemSummaryNode[];
  readonly extraKey: string;
  readonly result: readonly CompactSearchEntry[];
}

const mergedCorpusCache = new WeakMap<
  readonly CompactSearchEntry[],
  MergedCorpusCacheEntry
>();

export function getMergedCorpusParts(
  corpus: readonly CompactSearchEntry[],
): MergedCorpusParts | undefined {
  return mergedCorpusPartsMap.get(corpus);
}

/**
 * Pure merge of the stars hydrated from streamed sector partitions (every star inside the live
 * instrument aperture) into the search corpus, so aperture membership and the objects panel cover
 * all active stars rather than only the catalogued search entries. Corpus entries win on id clashes.
 */
export function mergeActiveStarsIntoCorpus(
  corpus: readonly CompactSearchEntry[],
  activeStars: readonly SystemSummaryNode[],
): readonly CompactSearchEntry[] {
  if (activeStars.length === 0) {
    return corpus;
  }

  const cachedMerged = mergedCorpusCache.get(corpus);
  if (cachedMerged && cachedMerged.activeStars === activeStars) {
    return cachedMerged.result;
  }

  let knownIds = corpusKnownIdsCache.get(corpus);
  if (!knownIds) {
    const ids = new Set<string>();
    for (const entry of corpus) {
      ids.add(entry.i);
    }
    corpusKnownIdsCache.set(corpus, ids);
    knownIds = ids;
  }

  const extraSeenIds = new Set<string>();
  const extraEntries: CompactSearchEntry[] = [];
  for (const star of activeStars) {
    if (knownIds.has(star.id) || extraSeenIds.has(star.id)) {
      continue;
    }
    extraSeenIds.add(star.id);
    extraEntries.push({
      i: star.id,
      n: star.properName ?? star.name,
      p: [star.x, star.y, star.z],
      m: star.hasHabitableCandidate
        ? [star.mag, star.spect ?? 'Unknown', star.planetCount, 1]
        : [star.mag, star.spect ?? 'Unknown', star.planetCount],
      ...(star.hazardMask ? { H: star.hazardMask } : {}),
      c: 'stars',
    });
  }

  if (extraEntries.length === 0) {
    mergedCorpusCache.set(corpus, { activeStars, extraKey: '', result: corpus });
    return corpus;
  }

  const extraKey = extraEntries.map((e) => e.i).join('\0');
  if (cachedMerged && cachedMerged.extraKey === extraKey) {
    mergedCorpusCache.set(corpus, { activeStars, extraKey, result: cachedMerged.result });
    return cachedMerged.result;
  }

  const result: readonly CompactSearchEntry[] = [...corpus, ...extraEntries];
  mergedCorpusCache.set(corpus, { activeStars, extraKey, result });
  mergedCorpusPartsMap.set(result, { base: corpus, extras: extraEntries });
  return result;
}
