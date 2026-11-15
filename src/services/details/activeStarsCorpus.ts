import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type { SystemSummaryNode } from '../../types/astro';

const corpusKnownIdsCache = new WeakMap<readonly CompactSearchEntry[], ReadonlySet<string>>();
const mergedCorpusCache = new WeakMap<
  readonly CompactSearchEntry[],
  { activeStars: readonly SystemSummaryNode[]; result: readonly CompactSearchEntry[] }
>();

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

  const seenIds = new Set<string>(knownIds);
  const extraEntries: CompactSearchEntry[] = [];
  for (const star of activeStars) {
    if (seenIds.has(star.id)) {
      continue;
    }
    seenIds.add(star.id);
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
    mergedCorpusCache.set(corpus, { activeStars, result: corpus });
    return corpus;
  }

  const result: readonly CompactSearchEntry[] = [...corpus, ...extraEntries];
  mergedCorpusCache.set(corpus, { activeStars, result });
  return result;
}
