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

const INDEX_KEY_REGEX = /^\d+$/;

function createLayeredSearchCorpus(
  base: readonly CompactSearchEntry[],
  extras: readonly CompactSearchEntry[],
): readonly CompactSearchEntry[] {
  const backing: CompactSearchEntry[] = [];
  const totalLength = base.length + extras.length;

  const proxy = new Proxy<CompactSearchEntry[]>(backing, {
    has(target, prop) {
      if (typeof prop === 'string' && INDEX_KEY_REGEX.test(prop)) {
        const idx = Number(prop);
        return idx >= 0 && idx < totalLength;
      }
      return Reflect.has(target, prop);
    },
    get(target, prop, receiver) {
      if (prop === 'length') return totalLength;
      if (prop === Symbol.iterator) {
        return function* () {
          yield* base;
          yield* extras;
        };
      }
      if (prop === 'at') {
        return (idx: number) => {
          const norm = idx < 0 ? totalLength + idx : idx;
          if (norm < 0 || norm >= totalLength) return undefined;
          return norm < base.length ? base[norm] : extras[norm - base.length];
        };
      }
      if (prop === 'some') {
        return (
          pred: (entry: CompactSearchEntry, idx: number, arr: readonly CompactSearchEntry[]) => boolean,
          thisArg?: unknown,
        ) => {
          for (let i = 0; i < base.length; i++) {
            if (pred.call(thisArg, base[i]!, i, receiver)) return true;
          }
          for (let j = 0; j < extras.length; j++) {
            if (pred.call(thisArg, extras[j]!, base.length + j, receiver)) return true;
          }
          return false;
        };
      }
      if (prop === 'every') {
        return (
          pred: (entry: CompactSearchEntry, idx: number, arr: readonly CompactSearchEntry[]) => boolean,
          thisArg?: unknown,
        ) => {
          for (let i = 0; i < base.length; i++) {
            if (!pred.call(thisArg, base[i]!, i, receiver)) return false;
          }
          for (let j = 0; j < extras.length; j++) {
            if (!pred.call(thisArg, extras[j]!, base.length + j, receiver)) return false;
          }
          return true;
        };
      }
      if (prop === 'find') {
        return (
          pred: (entry: CompactSearchEntry, idx: number, arr: readonly CompactSearchEntry[]) => boolean,
          thisArg?: unknown,
        ) => {
          for (let i = 0; i < base.length; i++) {
            const entry = base[i]!;
            if (pred.call(thisArg, entry, i, receiver)) return entry;
          }
          for (let j = 0; j < extras.length; j++) {
            const entry = extras[j]!;
            if (pred.call(thisArg, entry, base.length + j, receiver)) return entry;
          }
          return undefined;
        };
      }
      if (prop === 'forEach') {
        return (
          cb: (entry: CompactSearchEntry, idx: number, arr: readonly CompactSearchEntry[]) => void,
          thisArg?: unknown,
        ) => {
          for (let i = 0; i < base.length; i++) cb.call(thisArg, base[i]!, i, receiver);
          for (let j = 0; j < extras.length; j++) cb.call(thisArg, extras[j]!, base.length + j, receiver);
        };
      }
      if (prop === 'filter') {
        return (
          pred: (entry: CompactSearchEntry, idx: number, arr: readonly CompactSearchEntry[]) => boolean,
          thisArg?: unknown,
        ) => {
          const out: CompactSearchEntry[] = [];
          for (let i = 0; i < base.length; i++) {
            const entry = base[i]!;
            if (pred.call(thisArg, entry, i, receiver)) out.push(entry);
          }
          for (let j = 0; j < extras.length; j++) {
            const entry = extras[j]!;
            if (pred.call(thisArg, entry, base.length + j, receiver)) out.push(entry);
          }
          return out;
        };
      }
      if (prop === 'map') {
        return <U>(
          fn: (entry: CompactSearchEntry, idx: number, arr: readonly CompactSearchEntry[]) => U,
          thisArg?: unknown,
        ) => {
          const out: U[] = [];
          for (let i = 0; i < base.length; i++) out.push(fn.call(thisArg, base[i]!, i, receiver));
          for (let j = 0; j < extras.length; j++) {
            out.push(fn.call(thisArg, extras[j]!, base.length + j, receiver));
          }
          return out;
        };
      }
      if (typeof prop === 'string' && INDEX_KEY_REGEX.test(prop)) {
        const idx = Number(prop);
        if (idx >= 0 && idx < base.length) return base[idx];
        const extraIdx = idx - base.length;
        if (extraIdx >= 0 && extraIdx < extras.length) return extras[extraIdx];
        return undefined;
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  mergedCorpusPartsMap.set(proxy, { base, extras });
  return proxy;
}

/**
 * Returns a layered corpus view (`base` + `extras`) without copying the base array.
 */
export function appendExtraEntriesToCorpus(
  corpus: readonly CompactSearchEntry[],
  extras: readonly CompactSearchEntry[],
): readonly CompactSearchEntry[] {
  if (extras.length === 0) {
    return corpus;
  }
  return createLayeredSearchCorpus(corpus, extras);
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

  const result = createLayeredSearchCorpus(corpus, extraEntries);
  mergedCorpusCache.set(corpus, { activeStars, extraKey, result });
  return result;
}
