import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import {
  resolveEntryCategory,
  resolveResultDisplayTitle,
} from '../search/searchCorpusHelpers';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { getMergedCorpusParts } from './activeStarsCorpus';

export const CELL_SIZE_PC = 10;

export interface StarSystemEntry {
  readonly id: string;
  readonly name: string;
  readonly coordinatesPc: readonly [number, number, number];
  readonly entry: CompactSearchEntry;
}

export interface CorpusStarItem {
  readonly sysSlug: string;
  readonly entry: CompactSearchEntry;
  readonly pos: [number, number, number];
}

export interface CorpusStarSystemsResult {
  readonly systemsById: ReadonlyMap<string, StarSystemEntry>;
  readonly stars: ReadonlyArray<CorpusStarItem>;
  readonly grid: ReadonlyMap<string, ReadonlyArray<CorpusStarItem>>;
  readonly cellSizePc: number;
}

function createCompositeReadonlyMap<K, V>(
  base: ReadonlyMap<K, V>,
  overlay: ReadonlyMap<K, V>,
): ReadonlyMap<K, V> {
  const composite = {
    get size(): number {
      let count = overlay.size;
      for (const key of base.keys()) {
        if (!overlay.has(key)) {
          count++;
        }
      }
      return count;
    },
    has(key: K): boolean {
      return overlay.has(key) || base.has(key);
    },
    get(key: K): V | undefined {
      return overlay.get(key) ?? base.get(key);
    },
    forEach(
      callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
      thisArg?: unknown,
    ): void {
      for (const [key, value] of this.entries()) {
        callbackfn.call(thisArg, value, key, this as unknown as ReadonlyMap<K, V>);
      }
    },
    *entries(): IterableIterator<[K, V]> {
      for (const entry of overlay.entries()) {
        yield entry;
      }
      for (const [key, value] of base.entries()) {
        if (!overlay.has(key)) {
          yield [key, value];
        }
      }
    },
    *keys(): IterableIterator<K> {
      for (const key of overlay.keys()) {
        yield key;
      }
      for (const key of base.keys()) {
        if (!overlay.has(key)) {
          yield key;
        }
      }
    },
    *values(): IterableIterator<V> {
      for (const [, value] of this.entries()) {
        yield value;
      }
    },
    [Symbol.iterator](): IterableIterator<[K, V]> {
      return this.entries();
    },
  };

  return composite as unknown as ReadonlyMap<K, V>;
}

const corpusStarSystemsCache = new WeakMap<
  readonly CompactSearchEntry[],
  CorpusStarSystemsResult
>();

const getCellKey = (pos: readonly [number, number, number]): string =>
  `${Math.floor(pos[0] / CELL_SIZE_PC)},${Math.floor(pos[1] / CELL_SIZE_PC)},${Math.floor(pos[2] / CELL_SIZE_PC)}`;

export function getOrBuildCorpusStarSystems(
  corpus: readonly CompactSearchEntry[],
): CorpusStarSystemsResult {
  let cached = corpusStarSystemsCache.get(corpus);
  if (!cached) {
    const parts = getMergedCorpusParts(corpus);
    if (parts) {
      const base = getOrBuildCorpusStarSystems(parts.base);

      const extraSystems = new Map<string, StarSystemEntry>();
      const extraStars: CorpusStarItem[] = [];
      const touchedGrid = new Map<string, CorpusStarItem[]>();

      for (const entry of parts.extras) {
        if (entry.c !== 'stars' && resolveEntryCategory(entry) !== 'stars') {
          continue;
        }
        const sysSlug = toUrlSlug(entry.s ?? entry.i ?? entry.n);
        if (!sysSlug || base.systemsById.has(sysSlug) || extraSystems.has(sysSlug)) {
          continue;
        }
        const pos: [number, number, number] = entry.p
          ? [entry.p[0], entry.p[1], entry.p[2]]
          : [0, 0, 0];
        const item: CorpusStarItem = { sysSlug, entry, pos };
        extraSystems.set(sysSlug, {
          id: entry.s ?? entry.i,
          name: resolveResultDisplayTitle(entry),
          coordinatesPc: pos,
          entry,
        });
        extraStars.push(item);

        const cellKey = getCellKey(pos);
        let cell = touchedGrid.get(cellKey);
        if (!cell) {
          const baseCell = base.grid.get(cellKey);
          cell = baseCell ? [...baseCell] : [];
          touchedGrid.set(cellKey, cell);
        }
        cell.push(item);
      }

      if (extraSystems.size === 0) {
        corpusStarSystemsCache.set(corpus, base);
        return base;
      }

      const result: CorpusStarSystemsResult = {
        systemsById: createCompositeReadonlyMap(base.systemsById, extraSystems),
        stars: [...base.stars, ...extraStars],
        grid: createCompositeReadonlyMap(base.grid, touchedGrid),
        cellSizePc: CELL_SIZE_PC,
      };
      corpusStarSystemsCache.set(corpus, result);
      return result;
    }

    const systemsById = new Map<string, StarSystemEntry>();
    const stars: CorpusStarItem[] = [];
    const grid = new Map<string, CorpusStarItem[]>();

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
      const item: CorpusStarItem = { sysSlug, entry, pos };
      systemsById.set(sysSlug, {
        id: entry.s ?? entry.i,
        name: resolveResultDisplayTitle(entry),
        coordinatesPc: pos,
        entry,
      });
      stars.push(item);

      const cellKey = getCellKey(pos);
      let cell = grid.get(cellKey);
      if (!cell) {
        cell = [];
        grid.set(cellKey, cell);
      }
      cell.push(item);
    }

    cached = { systemsById, stars, grid, cellSizePc: CELL_SIZE_PC };
    corpusStarSystemsCache.set(corpus, cached);
  }
  return cached;
}
