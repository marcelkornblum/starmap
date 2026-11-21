import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSummaryCache,
  fetchSummaryNode,
  fetchSummaryNodeByHash,
  getCachedSummaryNode,
  getCachedSummaryNodeByHash,
  getCachedSummaryNodeByHashInSector,
  loadSummarySector,
  preloadSummarySectors,
  seedSummaryNode,
} from './detailsSummaryCache';
import {
  clearDataManifestCache,
  seedDataManifest,
} from './dataManifestRepository';
import {
  clearSearchRepositoryCache,
  fetchSearchShard,
} from './searchRepository';
import { clearDetailsRoutingCache } from './detailsRouting';
import { fnv1a32 } from '../utils/binarySectorCodec';
import * as workerParser from './workerJsonParser';

describe('detailsSummaryCache (spatial sector shards)', () => {
  beforeEach(() => {
    clearSummaryCache();
    clearDetailsRoutingCache();
    clearDataManifestCache();
    clearSearchRepositoryCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads sector summaries via fetchAndParseJson and decodes with fallbackSectorId', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe('/data/summaries/sector_+025_+000_-025.json');
      return new Response(
        JSON.stringify({
          v: 1,
          i: 'sector_+025_+000_-025',
          c: 1,
          d: {
            'hip-999': {
              n: 'Boundary Star',
              p: [25.5, 1.2, -2.4],
              m: 4.5,
              M: 2.1,
              s: 'G2V',
            },
          },
        }),
        { status: 200 },
      );
    });

    const spy = vi.spyOn(workerParser, 'fetchAndParseJson');
    await loadSummarySector('sector_+025_+000_-025', fetchMock as unknown as typeof fetch);

    expect(spy).toHaveBeenCalledTimes(1);
    const node = getCachedSummaryNode('hip-999');
    expect(node).toBeDefined();
    expect(node?.sectorId).toBe('sector_+025_+000_-025');

    const byHash = getCachedSummaryNodeByHashInSector(
      'sector_+025_+000_-025',
      fnv1a32('hip-999'),
    );
    expect(byHash).toBe(node);
    expect(getCachedSummaryNodeByHash(fnv1a32('hip-999'))).toBe(node);
  });

  it('caches empty {} immediately with zero HTTP requests when manifest marks sector absent', async () => {
    seedDataManifest({
      v: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      files: {
        'summaries/sector_+000_+000_+000.json': 'summaries/sector_+000_+000_+000.11223344.json',
      },
    });

    const fetchMock = vi.fn(async () => new Response('Not Found', { status: 404 }));
    const data = await loadSummarySector(
      'sector_+999_+000_+000',
      fetchMock as unknown as typeof fetch,
    );

    expect(data).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      getCachedSummaryNodeByHashInSector('sector_+999_+000_+000', fnv1a32('uncatalogued')),
    ).toBeUndefined();
  });

  it('batch-preloads unique uncached sectors via preloadSummarySectors without duplicate fetches', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('sector_+000_+000_+000')) {
        return new Response(
          JSON.stringify({
            v: 1,
            i: 'sector_+000_+000_+000',
            c: 1,
            d: {
              sol: { n: 'Sol', p: [0, 0, 0], m: -26.74, M: 4.83, s: 'G2V' },
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          v: 1,
          i: 'sector_-025_+000_+000',
          c: 1,
          d: {
            'star-west': { n: 'West Star', p: [-2.0, 0, 0], m: 5.0, M: 4.0, s: 'K0V' },
          },
        }),
        { status: 200 },
      );
    });

    await preloadSummarySectors(
      ['sector_+000_+000_+000', 'sector_-025_+000_+000', 'sector_+000_+000_+000'],
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getCachedSummaryNode('sol')?.name).toBe('Sol');
    expect(getCachedSummaryNode('star-west')?.name).toBe('West Star');

    // Second preload is a complete cache hit
    await preloadSummarySectors(
      ['sector_+000_+000_+000', 'sector_-025_+000_+000'],
      fetchMock as unknown as typeof fetch,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resolves fetchSummaryNode in O(1) via cached search entry without fetching details/routing.json', async () => {
    const searchFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          v: 1,
          i: 'stars',
          n: 'Stars',
          c: 1,
          t: '2026',
          d: [{ i: 'tau-ceti', n: 'Tau Ceti', p: [3.156, 1.54, -1.003] }],
        }),
        { status: 200 },
      ),
    );
    await fetchSearchShard('stars', searchFetch as unknown as typeof fetch);

    const summaryFetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('routing.json')) {
        throw new Error('routing.json should not be fetched when search entry has coordinates');
      }
      expect(urlStr).toBe('/data/summaries/sector_+000_+000_-025.json');
      return new Response(
        JSON.stringify({
          v: 1,
          i: 'sector_+000_+000_-025',
          c: 1,
          d: {
            'tau-ceti': { n: 'Tau Ceti', p: [3.156, 1.54, -1.003], m: 3.5, M: 5.69, s: 'G8V' },
          },
        }),
        { status: 200 },
      );
    });

    const node = await fetchSummaryNode('tau-ceti', summaryFetch as unknown as typeof fetch);
    expect(node?.id).toBe('tau-ceti');
    expect(node?.sectorId).toBe('sector_+000_+000_-025');
    expect(summaryFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to details/routing.json when entity is not in search cache and supports sectorId in fetchSummaryNodeByHash', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('/data/details/routing.json')) {
        return new Response(
          JSON.stringify({
            v: 1,
            k: ['sector_+000_+025_+000'],
            s: { 'hip-42': 0 },
            d: {},
          }),
          { status: 200 },
        );
      }
      if (urlStr.includes('/data/summaries/sector_+000_+025_+000.json')) {
        return new Response(
          JSON.stringify({
            v: 1,
            i: 'sector_+000_+025_+000',
            c: 1,
            d: {
              'hip-42': { n: 'North Star', p: [1, 26, 2], m: 6.1, M: 4.5, s: 'F8V' },
            },
          }),
          { status: 200 },
        );
      }
      return new Response('Not Found', { status: 404 });
    });

    const node = await fetchSummaryNode('hip-42', fetchMock as unknown as typeof fetch);
    expect(node?.sectorId).toBe('sector_+000_+025_+000');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    clearSummaryCache();
    const byHash = await fetchSummaryNodeByHash(
      fnv1a32('hip-42'),
      fetchMock as unknown as typeof fetch,
      undefined,
      undefined,
      'sector_+000_+025_+000',
    );
    expect(byHash?.id).toBe('hip-42');
  });

  it('retries shared sector load cleanly when another concurrent caller aborts', async () => {
    const controllerA = new AbortController();
    let attempt = 0;

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      attempt++;
      if (attempt === 1) {
        return new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
            return;
          }
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            v: 1,
            i: 'sector_+000_+000_+000',
            c: 1,
            d: { sol: { n: 'Sol', p: [0, 0, 0], m: -26.74, M: 4.83, s: 'G2V' } },
          }),
          { status: 200 },
        ),
      );
    });

    const p1 = loadSummarySector(
      'sector_+000_+000_+000',
      fetchMock as unknown as typeof fetch,
      controllerA.signal,
    );
    const p2 = loadSummarySector(
      'sector_+000_+000_+000',
      fetchMock as unknown as typeof fetch,
    );

    await Promise.resolve();
    controllerA.abort();

    await expect(p1).rejects.toThrow(/aborted/i);
    await expect(p2).resolves.toHaveProperty('sol');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('allows seedSummaryNode for isolated unit tests', () => {
    seedSummaryNode('seed-1', {
      id: 'seed-1',
      name: 'Seed 1',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      mag: 5,
      absmag: 5,
      spect: 'G2V',
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId: 'sector_+000_+000_+000',
    });
    expect(getCachedSummaryNode('seed-1')?.name).toBe('Seed 1');
  });
});
