import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LAYER_MANIFESTS } from '../../content/layers';
import {
  areEntityAnnotationsCached,
  clearLayerRepositoryCache,
  fetchEntityAnnotations,
  fetchLayerIndex,
  fetchLayerManifest,
  getCachedEntityAnnotations,
  getCachedLayerManifest,
} from './layerRepository';
import { LAYER_MANIFEST_CACHE_LIMIT } from '../config/cacheConfig';
import { getShardKey } from '../utils/compactDataCodec';
import { createLayerFetch, RESOLVED_LAYER_MANIFESTS } from '../../tests/fixtures/layerFixtures';

const makeFetch = () => vi.fn(createLayerFetch());

const jsonResponse = (payload: unknown, ok = true): Response =>
  ({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => payload,
  }) as unknown as Response;

const makeManifestPayload = (id: string) => ({
  i: id,
  n: `Layer ${id}`,
  k: 1,
  d: 'Test layer',
  v: '1.0.0',
  e: {},
});

describe('layerRepository', () => {
  beforeEach(() => {
    clearLayerRepositoryCache();
  });

  it('fetches and caches the layer index entries', async () => {
    const fetchImpl = makeFetch();
    const first = await fetchLayerIndex(fetchImpl);
    const second = await fetchLayerIndex(fetchImpl);

    expect(first.map((l) => l.layerId)).toEqual(
      LAYER_MANIFESTS.map((l) => l.layerId),
    );
    expect(second).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws on a failed index response and does not cache the failure', async () => {
    const failing = vi.fn(async () => jsonResponse({}, false));
    await expect(fetchLayerIndex(failing)).rejects.toThrow(/layer index/i);

    const working = makeFetch();
    await expect(fetchLayerIndex(working)).resolves.toHaveLength(
      LAYER_MANIFESTS.length,
    );
  });

  it('fetches, decodes and caches a single layer manifest', async () => {
    const fetchImpl = makeFetch();
    const target = RESOLVED_LAYER_MANIFESTS.find((l) => l.layerId === 'canon-halo')!;

    const manifest = await fetchLayerManifest('canon-halo', fetchImpl);
    await fetchLayerManifest('canon-halo', fetchImpl);

    expect(manifest).toEqual(target);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws when a layer manifest cannot be loaded', async () => {
    await expect(
      fetchLayerManifest('canon-missing', makeFetch()),
    ).rejects.toThrow(/canon-missing/);
  });

  it('fetches by-entity buckets once per bucket and returns the decoded union', async () => {
    const fetchImpl = makeFetch();
    const records = await fetchEntityAnnotations(
      ['tau-ceti-e', 'gaia-2452378776434477184'],
      fetchImpl,
    );

    expect(records.some((r) => r.layerId === 'canon-project-hail-mary' && r.targetId === 'tau-ceti-e')).toBe(true);
    expect(records.some((r) => r.layerId === 'overlay-seti-landmarks')).toBe(true);
    const keys = records.map((r) => `${r.layerId}:${r.targetId}`);
    expect(new Set(keys).size).toBe(keys.length);

    const expectedBuckets = new Set([
      getShardKey('tau-ceti-e'),
      getShardKey('gaia-2452378776434477184'),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(expectedBuckets.size);

    await fetchEntityAnnotations(['tau-ceti-e'], fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(expectedBuckets.size);
  });

  it('returns an empty list for unknown or empty entity IDs without fetching empty IDs', async () => {
    const fetchImpl = makeFetch();
    expect(await fetchEntityAnnotations([''], fetchImpl)).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(await fetchEntityAnnotations(['no-such-entity'], fetchImpl)).toEqual([]);
  });

  it('exposes fetched manifests and entity annotations synchronously from the cache', async () => {
    expect(getCachedLayerManifest('canon-halo')).toBeUndefined();
    expect(getCachedEntityAnnotations(['tau-ceti-e'])).toEqual([]);

    const fetchImpl = makeFetch();
    await fetchLayerManifest('canon-halo', fetchImpl);
    const fetched = await fetchEntityAnnotations(['tau-ceti-e'], fetchImpl);

    expect(getCachedLayerManifest('canon-halo')?.layerId).toBe('canon-halo');
    expect(getCachedEntityAnnotations(['tau-ceti-e'])).toEqual(fetched);
    expect(getCachedEntityAnnotations([''])).toEqual([]);
  });

  it('areEntityAnnotationsCached returns true for empty or cached entity IDs and false for uncached', async () => {
    expect(areEntityAnnotationsCached([])).toBe(true);
    expect(areEntityAnnotationsCached([''])).toBe(true);
    expect(areEntityAnnotationsCached(['tau-ceti-e'])).toBe(false);

    const fetchImpl = makeFetch();
    await fetchEntityAnnotations(['tau-ceti-e'], fetchImpl);

    expect(areEntityAnnotationsCached(['tau-ceti-e'])).toBe(true);
    expect(areEntityAnnotationsCached(['tau-ceti-e', 'uncached-entity'])).toBe(false);
  });

  it('rejects when a by-entity bucket fails to load and retries on the next call', async () => {
    const failing = vi.fn(async () => jsonResponse({}, false));
    await expect(fetchEntityAnnotations(['tau-ceti-e'], failing)).rejects.toThrow(
      /by-entity/i,
    );
    await expect(
      fetchEntityAnnotations(['tau-ceti-e'], makeFetch()),
    ).resolves.not.toHaveLength(0);
  });

  describe('AbortSignal forwarding and cancellation (AUD-090 & DEC-R043)', () => {
    it('forwards AbortSignal to fetchImpl in fetchLayerIndex and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ d: [] }),
        } as unknown as Response;
      });

      await expect(
        fetchLayerIndex(fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/overlays/layers/index.json'),
        { signal: controller.signal },
      );
    });

    it('forwards AbortSignal to fetchImpl in fetchLayerManifest and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => makeManifestPayload('canon-1'),
        } as unknown as Response;
      });

      await expect(
        fetchLayerManifest('canon-1', fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/overlays/layers/canon-1.json'),
        { signal: controller.signal },
      );
    });

    it('forwards AbortSignal to fetchImpl in fetchEntityAnnotations and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ d: {} }),
        } as unknown as Response;
      });

      await expect(
        fetchEntityAnnotations(['sol'], fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/overlays/layers/by-entity/'),
        { signal: controller.signal },
      );
    });
  });

  describe('Bounded LRU cache eviction', () => {
    it('bounds RESOLVED_MANIFEST_CACHE to LAYER_MANIFEST_CACHE_LIMIT', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        const idMatch = url.match(/\/data\/overlays\/layers\/(.*)\.json/);
        const id = idMatch ? idMatch[1] : 'unknown';
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => makeManifestPayload(id),
        } as unknown as Response;
      });

      for (let i = 0; i < LAYER_MANIFEST_CACHE_LIMIT; i++) {
        await fetchLayerManifest(`manifest-${i}`, fetchMock as unknown as typeof fetch);
      }

      expect(getCachedLayerManifest('manifest-0')).toBeDefined();

      await fetchLayerManifest('manifest-overflow', fetchMock as unknown as typeof fetch);

      expect(getCachedLayerManifest('manifest-1')).toBeUndefined();
      expect(getCachedLayerManifest('manifest-0')).toBeDefined();
      expect(getCachedLayerManifest('manifest-overflow')).toBeDefined();
    });
  });
});
